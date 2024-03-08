/// <reference types="@coral-xyz/anchor/node_modules/@solana/web3.js" />
import { PublicKey } from "@solana/web3.js";
export declare function computeGuaranteedApy(duration: number, principal: number, interest: number): number;
export declare function getCampaignRewardVault(campaignPk: PublicKey, programId: PublicKey): [PublicKey, number];
export declare function getCampaignRewardVaultAuthority(campaignPk: PublicKey, programId: PublicKey): [PublicKey, number];
export declare function getMfiPdaSigner(depositPk: PublicKey, programId: PublicKey): [PublicKey, number];
export declare function getTempTokenAccountAuthority(depositPk: PublicKey, programId: PublicKey): [PublicKey, number];
export declare function getMarginfiAccount(depositPk: PublicKey, programId: PublicKey): [PublicKey, number];
//# sourceMappingURL=utils.d.ts.map