"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const mrgn_common_1 = require("@mrgnlabs/mrgn-common");
async function makeCreateDepositIx(lipProgram, accounts, args) {
    return lipProgram.methods
        .createDeposit(args.amount)
        .accounts({
        campaign: accounts.campaign,
        signer: accounts.signer,
        fundingAccount: accounts.fundingAccount,
        tempTokenAccount: accounts.tempTokenAccount,
        assetMint: accounts.assetMint,
        marginfiGroup: accounts.marginfiGroup,
        marginfiBank: accounts.marginfiBank,
        marginfiBankVault: accounts.marginfiBankVault,
        marginfiProgram: accounts.marginfiProgram,
        deposit: accounts.deposit,
        mfiPdaSigner: accounts.mfiPdaSigner,
        marginfiAccount: accounts.marginfiAccount,
    })
        .instruction();
}
async function makeEndDepositIx(lipProgram, accounts) {
    return lipProgram.methods
        .endDeposit()
        .accountsStrict({
        campaign: accounts.campaign,
        signer: accounts.signer,
        campaignRewardVault: accounts.campaignRewardVault,
        campaignRewardVaultAuthority: accounts.campaignRewardVaultAuthority,
        destinationAccount: accounts.destinationAccount,
        marginfiBankVaultAuthority: accounts.marginfiBankVaultAuthority,
        tempTokenAccountAuthority: accounts.tempTokenAccountAuthority,
        tempTokenAccount: accounts.tempTokenAccount,
        assetMint: accounts.assetMint,
        marginfiGroup: accounts.marginfiGroup,
        marginfiBank: accounts.marginfiBank,
        marginfiBankVault: accounts.marginfiBankVault,
        marginfiProgram: accounts.marginfiProgram,
        deposit: accounts.deposit,
        mfiPdaSigner: accounts.mfiPdaSigner,
        marginfiAccount: accounts.marginfiAccount,
        tokenProgram: mrgn_common_1.TOKEN_PROGRAM_ID,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .instruction();
}
const instructions = {
    makeCreateDepositIx,
    makeEndDepositIx,
};
exports.default = instructions;
