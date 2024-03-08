import { Wallet } from "@mrgnlabs/mrgn-common";
import { Connection } from "@solana/web3.js";
import { TokenAccountMap } from "../lib";
import type { TokenInfo } from "@solana/spl-token-registry";
interface JupiterState {
    initialized: boolean;
    isRefreshingStore: boolean;
    tokenMap: Map<string, TokenInfo>;
    tokenAccountMap: TokenAccountMap;
    connection: Connection | null;
    wallet: Wallet | null;
    fetchJupiterState: (args?: {
        connection?: Connection;
        wallet?: Wallet;
    }) => Promise<void>;
    setIsRefreshingStore: (isRefreshingStore: boolean) => void;
}
declare function createJupiterStore(): import("zustand").UseBoundStore<import("zustand").StoreApi<JupiterState>>;
export { createJupiterStore };
export type { JupiterState };
//# sourceMappingURL=jupiterStore.d.ts.map