var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import { create } from "zustand";
function createJupiterStore() {
    return create(stateCreator);
}
const stateCreator = (set, get) => ({
    // State
    initialized: false,
    isRefreshingStore: false,
    tokenMap: new Map(),
    tokenAccountMap: new Map(),
    connection: null,
    wallet: null,
    // Actions
    fetchJupiterState: (args) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        let tokenMap = get().tokenMap;
        if (tokenMap.size <= 1) {
            const preferredTokenListMode = "ahha";
            const tokens = yield (preferredTokenListMode === "strict"
                ? yield fetch("https://token.jup.ag/strict")
                : yield fetch("https://token.jup.ag/all")).json();
            // Dynamically import TokenListContainer when needed
            const { TokenListContainer } = yield import("@solana/spl-token-registry");
            const res = new TokenListContainer(tokens);
            const list = res.filterByChainId(101).getList();
            tokenMap = list.reduce((acc, item) => {
                acc.set(item.address, item);
                return acc;
            }, new Map());
        }
        const connection = (_a = args === null || args === void 0 ? void 0 : args.connection) !== null && _a !== void 0 ? _a : get().connection;
        const wallet = (_b = args === null || args === void 0 ? void 0 : args.wallet) !== null && _b !== void 0 ? _b : get().wallet;
        if (!connection)
            throw new Error("Connection not found");
        let tokenAccountMap;
        if (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) {
            const response = yield connection.getParsedTokenAccountsByOwner(wallet.publicKey, { programId: TOKEN_PROGRAM_ID }, "confirmed");
            const reducedResult = response.value.map((item) => {
                return {
                    created: true,
                    mint: new PublicKey(item.account.data.parsed.info.mint),
                    balance: item.account.data.parsed.info.tokenAmount.uiAmount,
                };
            });
            tokenAccountMap = new Map(reducedResult.map((tokenAccount) => [tokenAccount.mint.toString(), tokenAccount]));
        }
        else {
            tokenAccountMap = new Map();
        }
        set({
            initialized: true,
            isRefreshingStore: false,
            tokenAccountMap,
            tokenMap,
            connection,
            wallet,
        });
    }),
    setIsRefreshingStore: (isRefreshingStore) => set({ isRefreshingStore }),
});
export { createJupiterStore };
