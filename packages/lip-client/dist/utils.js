"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarginfiAccount = exports.getTempTokenAccountAuthority = exports.getMfiPdaSigner = exports.getCampaignRewardVaultAuthority = exports.getCampaignRewardVault = exports.computeGuaranteedApy = void 0;
const mrgn_common_1 = require("@mrgnlabs/mrgn-common");
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
function computeGuaranteedApy(duration, principal, interest) {
    const durationInYears = duration / 365 / 24 / 60 / 60;
    // @todo this needs to be cleaned up, works cleanly when there is no effective compounding right now
    return (0, mrgn_common_1.calculateApyFromInterest)(principal, durationInYears, interest);
}
exports.computeGuaranteedApy = computeGuaranteedApy;
function getCampaignRewardVault(campaignPk, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.CAMPAIGN_SEED, campaignPk.toBuffer()], programId);
}
exports.getCampaignRewardVault = getCampaignRewardVault;
function getCampaignRewardVaultAuthority(campaignPk, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.CAMPAIGN_AUTH_SEED, campaignPk.toBuffer()], programId);
}
exports.getCampaignRewardVaultAuthority = getCampaignRewardVaultAuthority;
function getMfiPdaSigner(depositPk, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.DEPOSIT_MFI_AUTH_SIGNER_SEED, depositPk.toBuffer()], programId);
}
exports.getMfiPdaSigner = getMfiPdaSigner;
function getTempTokenAccountAuthority(depositPk, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.TEMP_TOKEN_ACCOUNT_AUTH_SEED, depositPk.toBuffer()], programId);
}
exports.getTempTokenAccountAuthority = getTempTokenAccountAuthority;
function getMarginfiAccount(depositPk, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.MARGINFI_ACCOUNT_SEED, depositPk.toBuffer()], programId);
}
exports.getMarginfiAccount = getMarginfiAccount;
