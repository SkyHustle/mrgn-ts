"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountType = exports.Campaign = exports.Deposit = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const _1 = require(".");
const marginfi_client_v2_1 = require("@mrgnlabs/marginfi-client-v2");
const mrgn_common_1 = require("@mrgnlabs/mrgn-common");
const instructions_1 = __importDefault(require("./instructions"));
const utils_1 = require("./utils");
/**
 * Wrapper class around a specific LIP account.
 */
class LipAccount {
    constructor(client, mfiClient, owner, campaigns, deposits) {
        this.client = client;
        this.mfiClient = mfiClient;
        this.owner = owner;
        this.campaigns = campaigns;
        this.deposits = deposits;
    }
    // --- Factories
    static async fetch(walletPk, client, mfiClient) {
        const _walletPk = (0, anchor_1.translateAddress)(walletPk);
        const { deposits, campaigns } = await LipAccount._fetchAccountData(_walletPk, client);
        const lipAccount = new LipAccount(client, mfiClient, _walletPk, campaigns, deposits);
        require("debug")("mfi:margin-account")("Loaded marginfi account %s", _walletPk);
        return lipAccount;
    }
    getTotalBalance() {
        return this.deposits.reduce((acc, deposit) => {
            const oraclePrice = this.mfiClient.oraclePrices.get(deposit.campaign.bank.address.toBase58());
            if (!oraclePrice)
                throw Error("Price info not found");
            return acc.plus(deposit.computeUsdValue(oraclePrice, deposit.campaign.bank));
        }, new bignumber_js_1.default(0));
    }
    async makeClosePositionIx(deposit) {
        let ixs = [];
        const userAta = (0, mrgn_common_1.getAssociatedTokenAddressSync)(deposit.campaign.bank.mint, this.client.wallet.publicKey, true); // We allow off curve addresses here to support Fuse.
        const createAtaIdempotentIx = (0, mrgn_common_1.createAssociatedTokenAccountIdempotentInstruction)(this.client.wallet.publicKey, userAta, this.client.wallet.publicKey, deposit.campaign.bank.mint);
        ixs.push(createAtaIdempotentIx);
        const [campaignRewardVault] = (0, utils_1.getCampaignRewardVault)(deposit.campaign.publicKey, this.client.program.programId);
        const [campaignRewardVaultAuthority] = (0, utils_1.getCampaignRewardVaultAuthority)(deposit.campaign.publicKey, this.client.program.programId);
        const [marginfiAccount] = (0, utils_1.getMarginfiAccount)(deposit.address, this.client.program.programId);
        const [marginfiBankVaultAuthority] = (0, marginfi_client_v2_1.getBankVaultAuthority)(marginfi_client_v2_1.BankVaultType.LiquidityVault, deposit.campaign.bank.address, this.mfiClient.programId);
        const [mfiPdaSigner] = (0, utils_1.getMfiPdaSigner)(deposit.address, this.client.program.programId);
        const [tempTokenAccountAuthority] = (0, utils_1.getTempTokenAccountAuthority)(deposit.address, this.client.program.programId);
        const tempTokenAccount = web3_js_1.Keypair.generate();
        const endDepositIx = await instructions_1.default.makeEndDepositIx(this.client.program, {
            marginfiGroup: this.mfiClient.groupAddress,
            signer: this.client.wallet.publicKey,
            assetMint: deposit.campaign.bank.mint,
            campaign: deposit.campaign.publicKey,
            campaignRewardVault,
            deposit: deposit.address,
            campaignRewardVaultAuthority,
            destinationAccount: userAta,
            marginfiAccount,
            marginfiBank: deposit.campaign.bank.address,
            marginfiBankVault: deposit.campaign.bank.liquidityVault,
            marginfiProgram: this.mfiClient.programId,
            marginfiBankVaultAuthority,
            mfiPdaSigner,
            tempTokenAccount: tempTokenAccount.publicKey,
            tempTokenAccountAuthority,
        });
        ixs.push(endDepositIx);
        return { instructions: ixs, keys: [tempTokenAccount] };
    }
    async closePosition(deposit) {
        const tx = new web3_js_1.Transaction();
        const ixs = await this.makeClosePositionIx(deposit);
        tx.add(...ixs.instructions);
        const sig = await this.client.processTransaction(tx, ixs.keys, { dryRun: false });
        await this.reload();
        return sig;
    }
    /**
     * Decode marginfi account data according to the Anchor IDL.
     *
     * @param encoded Raw data buffer
     * @returns Decoded marginfi account data struct
     */
    static decode(encoded) {
        const coder = new anchor_1.BorshCoder(_1.LIP_IDL);
        return coder.accounts.decode(AccountType.Deposit, encoded);
    }
    static async _fetchAccountData(owner, lipClient) {
        const deposits = await lipClient.getDepositsForOwner(owner);
        await lipClient.reload();
        const relevantCampaignPks = deposits.map((d) => d.campaign.toBase58());
        const campaignsData = lipClient.campaigns.filter((c) => relevantCampaignPks.includes(c.publicKey.toBase58()));
        const shapedDeposits = deposits.map((deposit) => {
            const campaign = lipClient.campaigns.find((c) => deposit.campaign.equals(c.publicKey));
            if (!campaign)
                throw Error("Campaign not found");
            const bank = lipClient.mfiClient.banks.get(campaign.bank.address.toBase58());
            if (!bank)
                throw Error("Bank not found");
            return Deposit.fromAccountParsed(deposit, bank, campaign);
        });
        return {
            deposits: shapedDeposits,
            campaigns: campaignsData,
        };
    }
    /**
     * Update instance data by fetching and storing the latest on-chain state.
     */
    async reload() {
        const { deposits, campaigns } = await LipAccount._fetchAccountData(this.owner, this.client);
        this.campaigns = campaigns;
        this.deposits = deposits;
    }
    /**
     * Update instance data by fetching and storing the latest on-chain state.
     */
    async reloadAndClone() {
        await this.reload();
        return new LipAccount(this.client, this.mfiClient, this.owner, this.campaigns, this.deposits);
    }
}
exports.default = LipAccount;
// Client types
class Deposit {
    constructor(address, amount, campaign, startDate) {
        this.address = address;
        this.amount = amount;
        this.campaign = campaign;
        this.startDate = startDate;
    }
    get endDate() {
        const endDate = new Date(this.startDate);
        endDate.setSeconds(endDate.getSeconds() + this.campaign.lockupPeriod);
        return endDate;
    }
    get maturityAmount() {
        return this.amount + (this.amount / this.campaign.maxDeposits) * this.campaign.maxRewards;
    }
    get lockupPeriodInDays() {
        return this.campaign.lockupPeriod / 60 / 60 / 24;
    }
    computeUsdValue(oraclePrice, bank) {
        return bank
            .computeUsdValue(oraclePrice, (0, bignumber_js_1.default)(this.amount), marginfi_client_v2_1.PriceBias.None, false, new bignumber_js_1.default(1), false)
            .toNumber();
    }
    static fromAccountParsed(data, bank, campaign) {
        return new Deposit(data.address, (0, mrgn_common_1.nativeToUi)(data.amount, bank.mintDecimals), campaign, new Date(data.startTime * 1000));
    }
}
exports.Deposit = Deposit;
class Campaign {
    constructor(bank, oraclePrice, data) {
        this.bank = bank;
        this.oraclePrice = oraclePrice;
        this.publicKey = data.publicKey;
        this.maxDeposits = (0, mrgn_common_1.nativeToUi)(data.maxDeposits, bank.mintDecimals);
        this.maxRewards = (0, mrgn_common_1.nativeToUi)(data.maxRewards, bank.mintDecimals);
        this.lockupPeriod = data.lockupPeriod.toNumber();
        this.remainingCapacity = (0, mrgn_common_1.nativeToUi)(data.remainingCapacity, bank.mintDecimals);
        this.guaranteedApy = this.computeGuaranteedApyForCampaign();
    }
    computeGuaranteedApyForCampaign() {
        return (0, utils_1.computeGuaranteedApy)(this.lockupPeriod, this.maxDeposits, this.maxRewards);
    }
}
exports.Campaign = Campaign;
var AccountType;
(function (AccountType) {
    AccountType["Deposit"] = "deposit";
    AccountType["Campaign"] = "campaign";
})(AccountType = exports.AccountType || (exports.AccountType = {}));
