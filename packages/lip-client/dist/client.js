"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const idl_1 = require("./idl");
const instructions_1 = __importDefault(require("./instructions"));
const constants_1 = require("./constants");
const account_1 = require("./account");
const mrgn_common_1 = require("@mrgnlabs/mrgn-common");
const bs58_1 = __importDefault(require("bs58"));
/**
 * Entrypoint to interact with the LIP contract.
 */
class LipClient {
    /**
     * @internal
     */
    constructor(config, program, wallet, 
    // Multiple campaigns because campaigns are per asset,
    // and we want to aggregate the value of a user's deposits across campaigns.
    mfiClient, campaigns) {
        this.config = config;
        this.program = program;
        this.wallet = wallet;
        this.mfiClient = mfiClient;
        this.programId = config.programId;
        this.campaigns = campaigns;
    }
    // --- Factories
    static async fetch(config, marginfiClient, opts) {
        const debug = require("debug")("lip:client");
        debug("Loading Lip Client\n\tprogram: %s\n\tenv: %s\n\turl: %s", config.programId, config.environment, marginfiClient.provider.connection.rpcEndpoint);
        const provider = new anchor_1.AnchorProvider(marginfiClient.provider.connection, marginfiClient.wallet, {
            ...anchor_1.AnchorProvider.defaultOptions(),
            commitment: marginfiClient.provider.connection.commitment ?? anchor_1.AnchorProvider.defaultOptions().commitment,
            ...opts,
        });
        const program = new anchor_1.Program(idl_1.LIP_IDL, config.programId, provider);
        const campaigns = await LipClient._fetchAccountData(program, marginfiClient);
        return new LipClient(config, program, marginfiClient.wallet, marginfiClient, campaigns);
    }
    async reload() {
        this.campaigns = await LipClient._fetchAccountData(this.program, this.mfiClient);
    }
    // We construct an array of banks with 1) user and 2) asset information
    // across all campaigns that exist.
    // First, we find all campaigns, then use their banks to pull relevant asset prices.
    static async _fetchAccountData(program, marginfiClient) {
        // 1. Fetch all campaigns that exist
        const allCampaigns = (await program.account.campaign.all()).map((c) => ({
            ...c.account,
            publicKey: c.publicKey,
        }));
        // 2. Refresh mfi banks
        await marginfiClient.reload();
        // LipClient takes in a list of campaigns, which is
        // campaigns we've found + bank information we've constructed.
        return allCampaigns.map((campaign, i) => {
            const bank = marginfiClient.getBankByPk(campaign.marginfiBankPk);
            if (!bank)
                throw new Error(`Bank ${campaign.marginfiBankPk} not found for campaign ${campaign.publicKey}`);
            const oraclePrice = marginfiClient.getOraclePriceByBank(campaign.marginfiBankPk);
            if (!oraclePrice)
                throw new Error(`Oracle price ${campaign.marginfiBankPk} not found for campaign ${campaign.publicKey}`);
            return new account_1.Campaign(bank, oraclePrice, campaign);
        });
    }
    // --- Getters
    /**
     * Retrieves all deposit accounts.
     *
     * @returns Deposit instances
     */
    async getAllDepositsPerOwner() {
        const allAccounts = (await this.program.account.deposit.all()).map(({ account }) => account);
        const accountsPerOwner = allAccounts.reduce((acc, account) => {
            const owner = account.owner.toBase58();
            if (!acc[owner])
                acc[owner] = [];
            acc[owner].push(account);
            return acc;
        }, {});
        return accountsPerOwner;
    }
    /**
     * Retrieves all deposit accounts for specified owner.
     *
     * @returns Deposit instances
     */
    async getDepositsForOwner(owner) {
        const _owner = owner ? (0, anchor_1.translateAddress)(owner) : this.mfiClient.wallet.publicKey;
        return (await this.program.account.deposit.all([
            {
                memcmp: {
                    bytes: _owner.toBase58(),
                    offset: 8, // owner is the first field in the account after the padding, so offset by the discriminant and a pubkey
                },
            },
        ])).map(({ publicKey, account }) => ({ address: publicKey, ...account }));
    }
    // --- Others
    async makeDepositIx(campaign, amount, bank) {
        const depositKeypair = web3_js_1.Keypair.generate();
        const tempTokenAccountKeypair = web3_js_1.Keypair.generate();
        const userTokenAtaPk = (0, mrgn_common_1.getAssociatedTokenAddressSync)(bank.mint, this.mfiClient.provider.wallet.publicKey, true); // We allow off curve addresses here to support Fuse.
        const amountNative = (0, mrgn_common_1.uiToNative)(amount, bank.mintDecimals);
        const ixs = [];
        if (bank.mint.equals(mrgn_common_1.NATIVE_MINT)) {
            ixs.push((0, mrgn_common_1.createAssociatedTokenAccountIdempotentInstruction)(this.wallet.publicKey, userTokenAtaPk, this.wallet.publicKey, mrgn_common_1.NATIVE_MINT), web3_js_1.SystemProgram.transfer({
                fromPubkey: this.wallet.publicKey,
                toPubkey: userTokenAtaPk,
                lamports: amountNative.toNumber(),
            }), (0, mrgn_common_1.createSyncNativeInstruction)(userTokenAtaPk));
        }
        ixs.push(await instructions_1.default.makeCreateDepositIx(this.program, {
            campaign: campaign,
            signer: this.mfiClient.provider.wallet.publicKey,
            deposit: depositKeypair.publicKey,
            mfiPdaSigner: web3_js_1.PublicKey.findProgramAddressSync([constants_1.DEPOSIT_MFI_AUTH_SIGNER_SEED, depositKeypair.publicKey.toBuffer()], this.programId)[0],
            fundingAccount: userTokenAtaPk,
            tempTokenAccount: tempTokenAccountKeypair.publicKey,
            assetMint: bank.mint,
            marginfiGroup: this.mfiClient.groupAddress,
            marginfiBank: bank.address,
            marginfiAccount: web3_js_1.PublicKey.findProgramAddressSync([constants_1.MARGINFI_ACCOUNT_SEED, depositKeypair.publicKey.toBuffer()], this.programId)[0],
            marginfiBankVault: bank.liquidityVault,
            marginfiProgram: this.mfiClient.programId,
        }, { amount: amountNative }));
        return {
            instructions: ixs,
            keys: [depositKeypair, tempTokenAccountKeypair],
        };
    }
    async deposit(campaign, amount, bank) {
        const debug = require("debug")(`lip:deposit`);
        debug("Depositing %s into LIP", amount);
        const ixs = await this.makeDepositIx(campaign, amount, bank);
        const tx = new web3_js_1.Transaction().add(...ixs.instructions);
        const sig = await this.processTransaction(tx, ixs.keys);
        debug("Depositing successful %s", sig);
        // @note: will need to manage reload appropriately
        return sig;
    }
    async processTransaction(transaction, signers, opts) {
        let signature = "";
        try {
            const connection = new web3_js_1.Connection(this.program.provider.connection.rpcEndpoint, this.program.provider.opts);
            const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight }, } = await connection.getLatestBlockhashAndContext();
            const versionedMessage = new web3_js_1.TransactionMessage({
                instructions: transaction.instructions,
                payerKey: this.mfiClient.provider.wallet.publicKey,
                recentBlockhash: blockhash,
            });
            let versionedTransaction = new web3_js_1.VersionedTransaction(versionedMessage.compileToV0Message([]));
            versionedTransaction = await this.wallet.signTransaction(versionedTransaction);
            if (signers)
                versionedTransaction.sign(signers);
            if (opts?.dryRun) {
                const response = await connection.simulateTransaction(versionedTransaction, opts ?? { minContextSlot, sigVerify: false });
                console.log(response.value.err ? `❌ Error: ${response.value.err}` : `✅ Success - ${response.value.unitsConsumed} CU`);
                console.log("------ Logs 👇 ------");
                console.log(response.value.logs);
                const signaturesEncoded = encodeURIComponent(JSON.stringify(versionedTransaction.signatures.map((s) => bs58_1.default.encode(s))));
                const messageEncoded = encodeURIComponent(Buffer.from(versionedTransaction.message.serialize()).toString("base64"));
                console.log(Buffer.from(versionedTransaction.message.serialize()).toString("base64"));
                const urlEscaped = `https://explorer.solana.com/tx/inspector?cluster=${this.config.cluster}&signatures=${signaturesEncoded}&message=${messageEncoded}`;
                console.log("------ Inspect 👇 ------");
                console.log(urlEscaped);
                return versionedTransaction.signatures[0].toString();
            }
            else {
                let mergedOpts = {
                    ...mrgn_common_1.DEFAULT_CONFIRM_OPTS,
                    commitment: connection.commitment ?? mrgn_common_1.DEFAULT_CONFIRM_OPTS.commitment,
                    preflightCommitment: connection.commitment ?? mrgn_common_1.DEFAULT_CONFIRM_OPTS.commitment,
                    minContextSlot,
                    ...opts,
                };
                signature = await connection.sendTransaction(versionedTransaction, {
                    minContextSlot: mergedOpts.minContextSlot,
                    skipPreflight: mergedOpts.skipPreflight,
                    preflightCommitment: mergedOpts.preflightCommitment,
                    maxRetries: mergedOpts.maxRetries,
                });
                await connection.confirmTransaction({
                    blockhash,
                    lastValidBlockHeight,
                    signature,
                }, mergedOpts.commitment);
                return signature;
            }
        }
        catch (error) {
            throw `Transaction failed! ${error?.message}`;
        }
    }
}
exports.default = LipClient;
