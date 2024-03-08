"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOURS_PER_YEAR = exports.WSOL_MINT = exports.USDC_DECIMALS = exports.DEFAULT_CONFIRM_OPTS = exports.DEFAULT_SEND_OPTS = exports.DEFAULT_COMMITMENT = void 0;
const web3_js_1 = require("@solana/web3.js");
exports.DEFAULT_COMMITMENT = "processed";
exports.DEFAULT_SEND_OPTS = {
    skipPreflight: false,
    preflightCommitment: exports.DEFAULT_COMMITMENT,
};
exports.DEFAULT_CONFIRM_OPTS = {
    commitment: exports.DEFAULT_COMMITMENT,
    ...exports.DEFAULT_SEND_OPTS,
};
exports.USDC_DECIMALS = 6;
exports.WSOL_MINT = new web3_js_1.PublicKey("So11111111111111111111111111111111111111112");
exports.HOURS_PER_YEAR = 365.25 * 24;
