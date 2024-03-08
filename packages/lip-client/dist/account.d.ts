/// <reference types="@coral-xyz/anchor/node_modules/@solana/web3.js" />
/// <reference types="node" />
/// <reference types="bn.js" />
import { Address, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import LipClient from "./client";
import { MarginfiClient, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { InstructionsWrapper } from "@mrgnlabs/mrgn-common";
import { Bank } from "@mrgnlabs/marginfi-client-v2/dist/models/bank";
/**
 * Wrapper class around a specific LIP account.
 */
declare class LipAccount {
    readonly client: LipClient;
    readonly mfiClient: MarginfiClient;
    readonly owner: PublicKey;
    campaigns: Campaign[];
    deposits: Deposit[];
    constructor(client: LipClient, mfiClient: MarginfiClient, owner: PublicKey, campaigns: Campaign[], deposits: Deposit[]);
    static fetch(walletPk: Address, client: LipClient, mfiClient: MarginfiClient): Promise<LipAccount>;
    getTotalBalance(): BigNumber;
    makeClosePositionIx(deposit: Deposit): Promise<InstructionsWrapper>;
    closePosition(deposit: Deposit): Promise<string>;
    /**
     * Decode marginfi account data according to the Anchor IDL.
     *
     * @param encoded Raw data buffer
     * @returns Decoded marginfi account data struct
     */
    static decode(encoded: Buffer): DepositData;
    private static _fetchAccountData;
    /**
     * Update instance data by fetching and storing the latest on-chain state.
     */
    reload(): Promise<void>;
    /**
     * Update instance data by fetching and storing the latest on-chain state.
     */
    reloadAndClone(): Promise<LipAccount>;
}
export default LipAccount;
export declare class Deposit {
    address: PublicKey;
    amount: number;
    campaign: Campaign;
    startDate: Date;
    constructor(address: PublicKey, amount: number, campaign: Campaign, startDate: Date);
    get endDate(): Date;
    get maturityAmount(): number;
    get lockupPeriodInDays(): number;
    computeUsdValue(oraclePrice: OraclePrice, bank: Bank): number;
    static fromAccountParsed(data: DepositData, bank: Bank, campaign: Campaign): Deposit;
}
export declare class Campaign {
    readonly bank: Bank;
    readonly oraclePrice: OraclePrice;
    publicKey: PublicKey;
    maxDeposits: number;
    maxRewards: number;
    lockupPeriod: number;
    remainingCapacity: number;
    guaranteedApy: number;
    constructor(bank: Bank, oraclePrice: OraclePrice, data: CampaignData);
    computeGuaranteedApyForCampaign(): number;
}
export interface DepositData {
    address: PublicKey;
    owner: PublicKey;
    amount: BN;
    startTime: number;
    campaign: PublicKey;
}
export interface CampaignData {
    publicKey: PublicKey;
    marginfiBankPk: PublicKey;
    maxDeposits: BN;
    maxRewards: BN;
    lockupPeriod: BN;
    remainingCapacity: BN;
}
export declare enum AccountType {
    Deposit = "deposit",
    Campaign = "campaign"
}
//# sourceMappingURL=account.d.ts.map