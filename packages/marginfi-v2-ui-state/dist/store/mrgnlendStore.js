var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getValueInsensitive } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import { DEFAULT_ACCOUNT_SUMMARY, makeEmissionsPriceMap, computeAccountSummary, fetchTokenAccounts, makeExtendedBankInfo, makeExtendedBankMetadata, makeExtendedBankEmission, } from "../lib";
import { getPointsSummary } from "../lib/points";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
function createMrgnlendStore() {
    return create(stateCreator);
}
function createPersistentMrgnlendStore() {
    return create(persist(stateCreator, {
        name: "mrgnlend-peristent-store",
        partialize(state) {
            return {
                protocolStats: state.protocolStats,
            };
        },
    }));
}
function createLocalStorageKey(authority) {
    return `marginfi_accounts-${authority.toString()}`;
}
function getCachedMarginfiAccountsForAuthority(authority, client) {
    return __awaiter(this, void 0, void 0, function* () {
        const debug = require("debug")("mfi:getCachedMarginfiAccountsForAuthority");
        if (typeof window === "undefined") {
            return client.getMarginfiAccountsForAuthority(authority);
        }
        const cacheKey = createLocalStorageKey(authority);
        const cachedAccounts = window.localStorage.getItem(cacheKey);
        debug("cachedAccounts", cachedAccounts);
        if (cachedAccounts) {
            const accountAddresses = JSON.parse(cachedAccounts).map((address) => new PublicKey(address));
            debug("Loading ", accountAddresses.length, "accounts from cache");
            return client.getMultipleMarginfiAccounts(accountAddresses);
        }
        else {
            const accounts = yield client.getMarginfiAccountsForAuthority(authority);
            const accountAddresses = accounts.map((account) => account.address.toString());
            window.localStorage.setItem(cacheKey, JSON.stringify(accountAddresses));
            return accounts;
        }
    });
}
export function clearAccountCache(authority) {
    try {
        const cacheKey = createLocalStorageKey(authority);
        window.localStorage.removeItem(cacheKey);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error clearing account cache.`);
        }
        else {
            throw new Error("An unknown error occurred while clearing account cache.");
        }
    }
}
const stateCreator = (set, get) => ({
    // State
    initialized: false,
    userDataFetched: false,
    isRefreshingStore: false,
    marginfiClient: null,
    marginfiAccounts: [],
    bankMetadataMap: {},
    tokenMetadataMap: {},
    extendedBankMetadatas: [],
    extendedBankInfos: [],
    protocolStats: {
        deposits: 0,
        borrows: 0,
        tvl: 0,
        pointsTotal: 0,
    },
    marginfiAccountCount: 0,
    selectedAccount: null,
    nativeSolBalance: 0,
    accountSummary: DEFAULT_ACCOUNT_SUMMARY,
    birdEyeApiKey: "",
    emissionTokenMap: {},
    // Actions
    fetchMrgnlendState: (args) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        try {
            const { MarginfiClient } = yield import("@mrgnlabs/marginfi-client-v2");
            const { loadBankMetadatas, loadTokenMetadatas } = yield import("@mrgnlabs/mrgn-common");
            let userDataFetched = false;
            const connection = (_a = args === null || args === void 0 ? void 0 : args.connection) !== null && _a !== void 0 ? _a : (_b = get().marginfiClient) === null || _b === void 0 ? void 0 : _b.provider.connection;
            if (!connection)
                throw new Error("Connection not found");
            const wallet = (_c = args === null || args === void 0 ? void 0 : args.wallet) !== null && _c !== void 0 ? _c : (_e = (_d = get().marginfiClient) === null || _d === void 0 ? void 0 : _d.provider) === null || _e === void 0 ? void 0 : _e.wallet;
            const marginfiConfig = (_f = args === null || args === void 0 ? void 0 : args.marginfiConfig) !== null && _f !== void 0 ? _f : (_g = get().marginfiClient) === null || _g === void 0 ? void 0 : _g.config;
            if (!marginfiConfig)
                throw new Error("Marginfi config must be provided at least once");
            const isReadOnly = (args === null || args === void 0 ? void 0 : args.isOverride) !== undefined ? args.isOverride : (_j = (_h = get().marginfiClient) === null || _h === void 0 ? void 0 : _h.isReadOnly) !== null && _j !== void 0 ? _j : false;
            const [bankMetadataMap, tokenMetadataMap] = yield Promise.all([loadBankMetadatas(), loadTokenMetadatas()]);
            const bankAddresses = Object.keys(bankMetadataMap).map((address) => new PublicKey(address));
            const marginfiClient = yield MarginfiClient.fetch(marginfiConfig, wallet !== null && wallet !== void 0 ? wallet : {}, connection, undefined, isReadOnly, { preloadedBankAddresses: bankAddresses });
            const banks = [...marginfiClient.banks.values()];
            const birdEyeApiKey = (_k = args === null || args === void 0 ? void 0 : args.birdEyeApiKey) !== null && _k !== void 0 ? _k : get().birdEyeApiKey;
            const emissionsTokenMap = (_l = get().emissionTokenMap) !== null && _l !== void 0 ? _l : null;
            const priceMap = yield makeEmissionsPriceMap(banks, connection, emissionsTokenMap);
            let nativeSolBalance = 0;
            let tokenAccountMap;
            let marginfiAccounts = [];
            let selectedAccount = null;
            if (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) {
                const [tokenData, marginfiAccountWrappers] = yield Promise.all([
                    fetchTokenAccounts(connection, wallet.publicKey, banks.map((bank) => ({ mint: bank.mint, mintDecimals: bank.mintDecimals }))),
                    getCachedMarginfiAccountsForAuthority(wallet.publicKey, marginfiClient),
                ]);
                nativeSolBalance = tokenData.nativeSolBalance;
                tokenAccountMap = tokenData.tokenAccountMap;
                marginfiAccounts = marginfiAccountWrappers;
                //@ts-ignore
                const selectedAccountAddress = localStorage.getItem("mfiAccount");
                if (!selectedAccountAddress && marginfiAccounts.length > 0) {
                    // if no account is saved, select the highest value account (first one)
                    selectedAccount = marginfiAccounts[0];
                }
                else {
                    // if account is saved, select it if found, otherwise forget saved one
                    const maybeSelectedAccount = marginfiAccounts.find((account) => account.address.toBase58() === selectedAccountAddress);
                    if (maybeSelectedAccount) {
                        selectedAccount = maybeSelectedAccount;
                    }
                    else {
                        //@ts-ignore
                        localStorage.removeItem("mfiAccount");
                        selectedAccount = null;
                    }
                }
                userDataFetched = true;
            }
            const banksWithPriceAndToken = [];
            banks.forEach((bank) => {
                const oraclePrice = marginfiClient.getOraclePriceByBank(bank.address);
                if (!oraclePrice) {
                    return;
                }
                const bankMetadata = bankMetadataMap[bank.address.toBase58()];
                if (bankMetadata === undefined) {
                    return;
                }
                try {
                    const tokenMetadata = getValueInsensitive(tokenMetadataMap, bankMetadata.tokenSymbol);
                    if (!tokenMetadata) {
                        return;
                    }
                    banksWithPriceAndToken.push({ bank, oraclePrice, tokenMetadata });
                }
                catch (err) {
                    console.error("error fetching token metadata: ", err);
                }
            });
            const [extendedBankInfos, extendedBankMetadatas] = banksWithPriceAndToken.reduce((acc, { bank, oraclePrice, tokenMetadata }) => {
                const emissionTokenPriceData = priceMap[bank.emissionsMint.toBase58()];
                let userData;
                if (wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) {
                    const tokenAccount = tokenAccountMap.get(bank.mint.toBase58());
                    if (!tokenAccount) {
                        return acc;
                    }
                    userData = {
                        nativeSolBalance,
                        tokenAccount,
                        marginfiAccount: selectedAccount,
                    };
                }
                acc[0].push(makeExtendedBankInfo(tokenMetadata, bank, oraclePrice, emissionTokenPriceData, userData));
                acc[1].push(makeExtendedBankMetadata(new PublicKey(bank.address), tokenMetadata));
                return acc;
            }, [[], []]);
            const sortedExtendedBankInfos = extendedBankInfos.sort((a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price);
            const sortedExtendedBankMetadatas = extendedBankMetadatas.sort((am, bm) => {
                const a = sortedExtendedBankInfos.find((a) => a.address.equals(am.address));
                const b = sortedExtendedBankInfos.find((b) => b.address.equals(bm.address));
                return b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price;
            });
            const { deposits, borrows } = extendedBankInfos.reduce((acc, bank) => {
                const price = getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber();
                acc.deposits += bank.info.state.totalDeposits * price;
                acc.borrows += bank.info.state.totalBorrows * price;
                return acc;
            }, { deposits: 0, borrows: 0 });
            let accountSummary = DEFAULT_ACCOUNT_SUMMARY;
            if ((wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) && selectedAccount) {
                accountSummary = computeAccountSummary(selectedAccount, extendedBankInfos);
            }
            const pointsTotal = get().protocolStats.pointsTotal;
            set({
                initialized: true,
                userDataFetched,
                isRefreshingStore: false,
                marginfiClient,
                marginfiAccounts,
                bankMetadataMap,
                tokenMetadataMap,
                extendedBankInfos: sortedExtendedBankInfos,
                extendedBankMetadatas: sortedExtendedBankMetadatas,
                protocolStats: {
                    deposits,
                    borrows,
                    tvl: deposits - borrows,
                    pointsTotal: pointsTotal,
                },
                selectedAccount,
                nativeSolBalance,
                accountSummary,
                birdEyeApiKey,
            });
            const pointSummary = yield getPointsSummary();
            set({
                protocolStats: { deposits, borrows, tvl: deposits - borrows, pointsTotal: pointSummary.points_total },
            });
            const [sortedExtendedBankEmission, sortedExtendedBankMetadatasEmission, newEmissionsTokenMap] = yield makeExtendedBankEmission(sortedExtendedBankInfos, sortedExtendedBankMetadatas, priceMap, birdEyeApiKey);
            if (newEmissionsTokenMap !== null) {
                set({
                    extendedBankInfos: sortedExtendedBankEmission,
                    extendedBankMetadatas: sortedExtendedBankMetadatasEmission,
                    emissionTokenMap: newEmissionsTokenMap,
                });
            }
            else {
                if (emissionsTokenMap && Object.keys(emissionsTokenMap).length === 0) {
                    set({
                        extendedBankInfos: sortedExtendedBankEmission,
                        extendedBankMetadatas: sortedExtendedBankMetadatasEmission,
                        emissionTokenMap: null,
                    });
                }
            }
        }
        catch (err) {
            console.error("error refreshing state: ", err);
            set({ isRefreshingStore: false });
        }
    }),
    setIsRefreshingStore: (isRefreshingStore) => set({ isRefreshingStore }),
    resetUserData: () => {
        const extendedBankInfos = get().extendedBankInfos.map((extendedBankInfo) => (Object.assign(Object.assign({}, extendedBankInfo), { userInfo: {
                tokenAccount: {
                    created: false,
                    mint: extendedBankInfo.info.state.mint,
                    balance: 0,
                },
                maxDeposit: 0,
                maxRepay: 0,
                maxWithdraw: 0,
                maxBorrow: 0,
            } })));
        set({
            userDataFetched: false,
            selectedAccount: null,
            nativeSolBalance: 0,
            accountSummary: DEFAULT_ACCOUNT_SUMMARY,
            extendedBankInfos,
            marginfiClient: null,
        });
    },
});
export { createMrgnlendStore, createPersistentMrgnlendStore };
