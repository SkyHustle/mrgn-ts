import { Bank, MarginfiAccountWrapper, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { TokenMetadata } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { Connection, PublicKey } from "@solana/web3.js";
declare const DEFAULT_ACCOUNT_SUMMARY: {
    healthFactor: number;
    balance: number;
    lendingAmount: number;
    borrowingAmount: number;
    balanceUnbiased: number;
    lendingAmountUnbiased: number;
    borrowingAmountUnbiased: number;
    lendingAmountWithBiasAndWeighted: number;
    borrowingAmountWithBiasAndWeighted: number;
    apy: number;
    positions: never[];
    outstandingUxpEmissions: number;
    signedFreeCollateral: number;
};
declare function computeAccountSummary(marginfiAccount: MarginfiAccountWrapper, banks: ExtendedBankInfo[]): AccountSummary;
declare function makeBankInfo(bank: Bank, oraclePrice: OraclePrice, emissionTokenData?: TokenPrice): BankState;
export declare function fetchBirdeyePrices(mints: PublicKey[], apiKey?: string): Promise<BigNumber[]>;
export declare function makeExtendedBankEmission(banks: ExtendedBankInfo[], extendedBankMetadatas: ExtendedBankMetadata[], tokenMap: TokenPriceMap, apiKey?: string): Promise<[ExtendedBankInfo[], ExtendedBankMetadata[], TokenPriceMap | null]>;
export declare function makeEmissionsPriceMap(banks: Bank[], connection: Connection, emissionTokenMap: TokenPriceMap | null): Promise<TokenPriceMap>;
declare function makeExtendedBankMetadata(bankAddress: PublicKey, tokenMetadata: TokenMetadata): ExtendedBankMetadata;
declare function makeExtendedBankInfo(tokenMetadata: TokenMetadata, bank: Bank, oraclePrice: OraclePrice, emissionTokenPrice?: TokenPrice, userData?: {
    nativeSolBalance: number;
    marginfiAccount: MarginfiAccountWrapper | null;
    tokenAccount: TokenAccount;
}): ExtendedBankInfo;
declare function fetchTokenAccounts(connection: Connection, walletAddress: PublicKey, bankInfos: {
    mint: PublicKey;
    mintDecimals: number;
}[]): Promise<{
    nativeSolBalance: number;
    tokenAccountMap: TokenAccountMap;
}>;
declare function getCurrentAction(isLendingMode: boolean, bank: ExtendedBankInfo): ActionType;
export { DEFAULT_ACCOUNT_SUMMARY, computeAccountSummary, makeBankInfo, makeExtendedBankMetadata, makeExtendedBankInfo, fetchTokenAccounts, getCurrentAction, };
interface AccountSummary {
    healthFactor: number;
    balance: number;
    lendingAmount: number;
    borrowingAmount: number;
    apy: number;
    outstandingUxpEmissions: number;
    balanceUnbiased: number;
    lendingAmountUnbiased: number;
    borrowingAmountUnbiased: number;
    lendingAmountWithBiasAndWeighted: number;
    borrowingAmountWithBiasAndWeighted: number;
    signedFreeCollateral: number;
}
interface TokenPriceMap {
    [key: string]: TokenPrice;
}
interface TokenPrice {
    price: BigNumber;
    decimals: number;
}
interface TokenAccount {
    mint: PublicKey;
    created: boolean;
    balance: number;
}
type TokenAccountMap = Map<string, TokenAccount>;
interface ExtendedBankMetadata {
    address: PublicKey;
    tokenSymbol: string;
    tokenName: string;
    tokenLogoUri?: string;
}
interface BankState {
    mint: PublicKey;
    mintDecimals: number;
    price: number;
    lendingRate: number;
    borrowingRate: number;
    emissionsRate: number;
    emissions: Emissions;
    totalDeposits: number;
    depositCap: number;
    totalBorrows: number;
    borrowCap: number;
    availableLiquidity: number;
    utilizationRate: number;
    isIsolated: boolean;
}
interface LendingPosition {
    isLending: boolean;
    amount: number;
    usdValue: number;
    weightedUSDValue: number;
    liquidationPrice: number | null;
    isDust: boolean;
}
interface BankInfo {
    rawBank: Bank;
    oraclePrice: OraclePrice;
    state: BankState;
}
interface UserInfo {
    tokenAccount: TokenAccount;
    maxDeposit: number;
    maxRepay: number;
    maxWithdraw: number;
    maxBorrow: number;
}
interface InactiveBankInfo {
    address: PublicKey;
    meta: ExtendedBankMetadata;
    info: BankInfo;
    isActive: false;
    userInfo: UserInfo;
}
interface ActiveBankInfo {
    address: PublicKey;
    meta: ExtendedBankMetadata;
    info: BankInfo;
    isActive: true;
    userInfo: UserInfo;
    position: LendingPosition;
}
type ExtendedBankInfo = ActiveBankInfo | InactiveBankInfo;
declare enum Emissions {
    Inactive = 0,
    Lending = 1,
    Borrowing = 2
}
declare enum ActionType {
    Deposit = "Supply",
    Borrow = "Borrow",
    Repay = "Repay",
    Withdraw = "Withdraw"
}
export { Emissions, ActionType };
export type { AccountSummary, LendingPosition, TokenPriceMap, TokenPrice, TokenAccount, TokenAccountMap, ExtendedBankMetadata, ActiveBankInfo, InactiveBankInfo, ExtendedBankInfo, };
//# sourceMappingURL=mrgnlend.d.ts.map