import { Connection, PublicKey } from "@solana/web3.js";
import { AccountSummary, ExtendedBankInfo, ExtendedBankMetadata, TokenPriceMap } from "../lib";
import type { Wallet, BankMetadataMap, TokenMetadataMap } from "@mrgnlabs/mrgn-common";
import type { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import type { MarginfiClient, MarginfiConfig } from "@mrgnlabs/marginfi-client-v2";
interface ProtocolStats {
    deposits: number;
    borrows: number;
    tvl: number;
    pointsTotal: number;
}
interface MrgnlendState {
    initialized: boolean;
    userDataFetched: boolean;
    isRefreshingStore: boolean;
    marginfiClient: MarginfiClient | null;
    marginfiAccounts: MarginfiAccountWrapper[];
    bankMetadataMap: BankMetadataMap;
    tokenMetadataMap: TokenMetadataMap;
    extendedBankMetadatas: ExtendedBankMetadata[];
    extendedBankInfos: ExtendedBankInfo[];
    protocolStats: ProtocolStats;
    selectedAccount: MarginfiAccountWrapper | null;
    nativeSolBalance: number;
    accountSummary: AccountSummary;
    emissionTokenMap: TokenPriceMap | null;
    birdEyeApiKey: string;
    fetchMrgnlendState: (args?: {
        marginfiConfig?: MarginfiConfig;
        connection?: Connection;
        wallet?: Wallet;
        isOverride?: boolean;
        birdEyeApiKey?: string;
    }) => Promise<void>;
    setIsRefreshingStore: (isRefreshingStore: boolean) => void;
    resetUserData: () => void;
}
declare function createMrgnlendStore(): import("zustand").UseBoundStore<import("zustand").StoreApi<MrgnlendState>>;
declare function createPersistentMrgnlendStore(): import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<MrgnlendState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<MrgnlendState, Pick<MrgnlendState, "protocolStats">>>) => void;
        clearStorage: () => void;
        rehydrate: () => void | Promise<void>;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: MrgnlendState) => void) => () => void;
        onFinishHydration: (fn: (state: MrgnlendState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<MrgnlendState, Pick<MrgnlendState, "protocolStats">>>;
    };
}>;
export declare function clearAccountCache(authority: PublicKey): void;
export { createMrgnlendStore, createPersistentMrgnlendStore };
export type { MrgnlendState };
//# sourceMappingURL=mrgnlendStore.d.ts.map