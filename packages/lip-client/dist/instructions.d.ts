/// <reference types="@coral-xyz/anchor/node_modules/@solana/web3.js" />
/// <reference types="@coral-xyz/anchor/node_modules/@solana/web3.js" />
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { LipProgram } from "./types";
declare function makeCreateDepositIx(lipProgram: LipProgram, accounts: {
    campaign: PublicKey;
    signer: PublicKey;
    fundingAccount: PublicKey;
    tempTokenAccount: PublicKey;
    assetMint: PublicKey;
    marginfiGroup: PublicKey;
    marginfiBank: PublicKey;
    marginfiBankVault: PublicKey;
    marginfiProgram: PublicKey;
    deposit: PublicKey;
    mfiPdaSigner: PublicKey;
    marginfiAccount: PublicKey;
}, args: {
    amount: BN;
}): Promise<import("@solana/web3.js").TransactionInstruction>;
declare function makeEndDepositIx(lipProgram: LipProgram, accounts: {
    campaign: PublicKey;
    signer: PublicKey;
    tempTokenAccount: PublicKey;
    assetMint: PublicKey;
    marginfiGroup: PublicKey;
    marginfiBank: PublicKey;
    marginfiBankVault: PublicKey;
    marginfiProgram: PublicKey;
    deposit: PublicKey;
    mfiPdaSigner: PublicKey;
    marginfiAccount: PublicKey;
    campaignRewardVault: PublicKey;
    campaignRewardVaultAuthority: PublicKey;
    destinationAccount: PublicKey;
    marginfiBankVaultAuthority: PublicKey;
    tempTokenAccountAuthority: PublicKey;
}): Promise<import("@solana/web3.js").TransactionInstruction>;
declare const instructions: {
    makeCreateDepositIx: typeof makeCreateDepositIx;
    makeEndDepositIx: typeof makeEndDepositIx;
};
export default instructions;
//# sourceMappingURL=instructions.d.ts.map