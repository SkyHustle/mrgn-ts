var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getPriceWithConfidence, MarginRequirementType, PriceBias, RiskTier, } from "@mrgnlabs/marginfi-client-v2";
import { MintLayout, getAssociatedTokenAddressSync, nativeToUi, uiToNative, unpackAccount, floor, ceil, WSOL_MINT, TOKEN_PROGRAM_ID, } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
const FEE_MARGIN = 0.01;
const VOLATILITY_FACTOR = 0.975;
const DEFAULT_ACCOUNT_SUMMARY = {
    healthFactor: 0,
    balance: 0,
    lendingAmount: 0,
    borrowingAmount: 0,
    balanceUnbiased: 0,
    lendingAmountUnbiased: 0,
    borrowingAmountUnbiased: 0,
    lendingAmountWithBiasAndWeighted: 0,
    borrowingAmountWithBiasAndWeighted: 0,
    apy: 0,
    positions: [],
    outstandingUxpEmissions: 0,
    signedFreeCollateral: 0,
};
function computeAccountSummary(marginfiAccount, banks) {
    const equityComponents = marginfiAccount.computeHealthComponents(MarginRequirementType.Equity);
    const equityComponentsWithoutBias = marginfiAccount.computeHealthComponentsWithoutBias(MarginRequirementType.Equity);
    const maintenanceComponentsWithBiasAndWeighted = marginfiAccount.computeHealthComponents(MarginRequirementType.Maintenance);
    const signedFreeCollateral = marginfiAccount.computeFreeCollateral({ clamped: false });
    let outstandingUxpEmissions = new BigNumber(0);
    const uxpBank = banks.find((bank) => bank.meta.tokenSymbol === "UXD");
    const uxpBalance = marginfiAccount.activeBalances.find((balance) => { var _a; return balance.bankPk.equals((_a = uxpBank === null || uxpBank === void 0 ? void 0 : uxpBank.address) !== null && _a !== void 0 ? _a : PublicKey.default); });
    if (uxpBank && uxpBalance) {
        outstandingUxpEmissions = uxpBalance
            .computeTotalOutstandingEmissions(uxpBank.info.rawBank)
            .div(new BigNumber(10).pow(9));
    }
    const healthFactor = maintenanceComponentsWithBiasAndWeighted.assets.isZero()
        ? 1
        : maintenanceComponentsWithBiasAndWeighted.assets
            .minus(maintenanceComponentsWithBiasAndWeighted.liabilities)
            .dividedBy(maintenanceComponentsWithBiasAndWeighted.assets)
            .toNumber();
    return {
        healthFactor,
        balance: equityComponents.assets.minus(equityComponents.liabilities).toNumber(),
        lendingAmount: equityComponents.assets.toNumber(),
        borrowingAmount: equityComponents.liabilities.toNumber(),
        balanceUnbiased: equityComponentsWithoutBias.assets.minus(equityComponentsWithoutBias.liabilities).toNumber(),
        lendingAmountUnbiased: equityComponentsWithoutBias.assets.toNumber(),
        borrowingAmountUnbiased: equityComponentsWithoutBias.liabilities.toNumber(),
        lendingAmountWithBiasAndWeighted: maintenanceComponentsWithBiasAndWeighted.assets.toNumber(),
        borrowingAmountWithBiasAndWeighted: maintenanceComponentsWithBiasAndWeighted.liabilities.toNumber(),
        apy: marginfiAccount.computeNetApy(),
        outstandingUxpEmissions: outstandingUxpEmissions.toNumber(),
        signedFreeCollateral: signedFreeCollateral.toNumber(),
    };
}
function makeBankInfo(bank, oraclePrice, emissionTokenData) {
    const { lendingRate, borrowingRate } = bank.computeInterestRates();
    const totalDeposits = nativeToUi(bank.getTotalAssetQuantity(), bank.mintDecimals);
    const totalBorrows = nativeToUi(bank.getTotalLiabilityQuantity(), bank.mintDecimals);
    const liquidity = totalDeposits - totalBorrows;
    const utilizationRate = bank.computeUtilizationRate().times(100).toNumber();
    let emissionsRate = 0;
    let emissions = Emissions.Inactive;
    if ((bank.emissionsActiveLending || bank.emissionsActiveBorrowing) && emissionTokenData) {
        const emissionsRateAmount = new BigNumber(nativeToUi(bank.emissionsRate, emissionTokenData.decimals));
        const emissionsRateValue = emissionsRateAmount.times(emissionTokenData.price);
        const emissionsRateAdditionalyApy = emissionsRateValue.div(getPriceWithConfidence(oraclePrice, false).price);
        emissionsRate = emissionsRateAdditionalyApy.toNumber();
        if (bank.emissionsActiveBorrowing) {
            emissions = Emissions.Borrowing;
        }
        else if (bank.emissionsActiveLending) {
            emissions = Emissions.Lending;
        }
    }
    return {
        price: bank.getPrice(oraclePrice, PriceBias.None).toNumber(),
        mint: bank.mint,
        mintDecimals: bank.mintDecimals,
        lendingRate: isNaN(lendingRate.toNumber()) ? 0 : lendingRate.toNumber(),
        borrowingRate: isNaN(borrowingRate.toNumber()) ? 0 : borrowingRate.toNumber(),
        emissionsRate,
        emissions,
        totalDeposits,
        depositCap: nativeToUi(bank.config.depositLimit, bank.mintDecimals),
        totalBorrows,
        borrowCap: nativeToUi(bank.config.borrowLimit, bank.mintDecimals),
        availableLiquidity: liquidity,
        utilizationRate,
        isIsolated: bank.config.riskTier === RiskTier.Isolated,
    };
}
const BIRDEYE_API = "https://public-api.birdeye.so";
export function fetchBirdeyePrices(mints, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const mintList = mints.map((mint) => mint.toBase58()).join(",");
        const response = yield fetch(`/api/birdeye?mintList=${mintList}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        const responseBody = yield response.json();
        if (responseBody.success) {
            const prices = new Map(Object.entries(responseBody.data).map(([mint, priceData]) => [mint, BigNumber(priceData.value)]));
            return mints.map((mint) => {
                const price = prices.get(mint.toBase58());
                if (!price)
                    throw new Error(`Failed to fetch price for ${mint.toBase58()}`);
                return price;
            });
        }
        throw new Error("Failed to fetch price");
    });
}
export function makeExtendedBankEmission(banks, extendedBankMetadatas, tokenMap, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const emissionsMints = Object.keys(tokenMap).map((key) => new PublicKey(key));
        let birdeyePrices = emissionsMints.map(() => new BigNumber(0));
        try {
            birdeyePrices = yield fetchBirdeyePrices(emissionsMints, apiKey);
        }
        catch (err) {
            console.log("Failed to fetch emissions prices from Birdeye", err);
            birdeyePrices = null;
        }
        emissionsMints.map((mint, idx) => {
            tokenMap[mint.toBase58()] = Object.assign(Object.assign({}, tokenMap[mint.toBase58()]), { price: birdeyePrices ? birdeyePrices[idx] : new BigNumber(0) });
        });
        const updatedBanks = banks.map((bank) => {
            const rawBank = bank.info.rawBank;
            const emissionTokenData = tokenMap[rawBank.emissionsMint.toBase58()];
            let emissionsRate = 0;
            let emissions = Emissions.Inactive;
            if ((rawBank.emissionsActiveLending || rawBank.emissionsActiveBorrowing) && emissionTokenData) {
                const emissionsRateAmount = new BigNumber(nativeToUi(rawBank.emissionsRate, emissionTokenData.decimals));
                const emissionsRateValue = emissionsRateAmount.times(emissionTokenData.price);
                const emissionsRateAdditionalyApy = emissionsRateValue.div(getPriceWithConfidence(bank.info.oraclePrice, false).price);
                emissionsRate = emissionsRateAdditionalyApy.toNumber();
                if (rawBank.emissionsActiveBorrowing) {
                    emissions = Emissions.Borrowing;
                }
                else if (rawBank.emissionsActiveLending) {
                    emissions = Emissions.Lending;
                }
                bank.info.state = Object.assign(Object.assign({}, bank.info.state), { emissionsRate,
                    emissions });
            }
            return bank;
        });
        const sortedExtendedBankInfos = updatedBanks.sort((a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price);
        const sortedExtendedBankMetadatas = extendedBankMetadatas.sort((am, bm) => {
            const a = sortedExtendedBankInfos.find((a) => a.address.equals(am.address));
            const b = sortedExtendedBankInfos.find((b) => b.address.equals(bm.address));
            return b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price;
        });
        return [sortedExtendedBankInfos, sortedExtendedBankMetadatas, birdeyePrices ? tokenMap : null];
    });
}
export function makeEmissionsPriceMap(banks, connection, emissionTokenMap) {
    return __awaiter(this, void 0, void 0, function* () {
        const banksWithEmissions = banks.filter((bank) => !bank.emissionsMint.equals(PublicKey.default));
        const emissionsMints = banksWithEmissions.map((bank) => bank.emissionsMint);
        const mintAis = yield connection.getMultipleAccountsInfo(emissionsMints);
        const mint = mintAis.map((ai) => MintLayout.decode(ai.data));
        const emissionsPrices = banksWithEmissions.map((bank, i) => {
            var _a, _b;
            return ({
                mint: bank.emissionsMint,
                price: emissionTokenMap
                    ? (_b = (_a = emissionTokenMap[bank.emissionsMint.toBase58()]) === null || _a === void 0 ? void 0 : _a.price) !== null && _b !== void 0 ? _b : new BigNumber(0)
                    : new BigNumber(0),
                decimals: mint[0].decimals,
            });
        });
        const tokenMap = {};
        for (let { mint, price, decimals } of emissionsPrices) {
            tokenMap[mint.toBase58()] = { price, decimals };
        }
        return tokenMap;
    });
}
function makeExtendedBankMetadata(bankAddress, tokenMetadata) {
    return {
        address: bankAddress,
        tokenSymbol: tokenMetadata.symbol,
        tokenName: tokenMetadata.name,
        tokenLogoUri: tokenMetadata.icon,
    };
}
function makeExtendedBankInfo(tokenMetadata, bank, oraclePrice, emissionTokenPrice, userData) {
    // Aggregate user-agnostic bank info
    const meta = makeExtendedBankMetadata(bank.address, tokenMetadata);
    const bankInfo = makeBankInfo(bank, oraclePrice, emissionTokenPrice);
    let state = {
        rawBank: bank,
        oraclePrice,
        state: bankInfo,
    };
    if (!userData) {
        const userInfo = {
            tokenAccount: {
                created: false,
                mint: bank.mint,
                balance: 0,
            },
            maxDeposit: 0,
            maxRepay: 0,
            maxWithdraw: 0,
            maxBorrow: 0,
        };
        return {
            address: bank.address,
            meta,
            info: state,
            userInfo,
            isActive: false,
        };
    }
    // Calculate user-specific info relevant regardless of whether they have an active position in this bank
    const isWrappedSol = bankInfo.mint.equals(WSOL_MINT);
    const walletBalance = floor(isWrappedSol
        ? Math.max(userData.tokenAccount.balance + userData.nativeSolBalance - FEE_MARGIN, 0)
        : userData.tokenAccount.balance, bankInfo.mintDecimals);
    const { depositCapacity: depositCapacityBN, borrowCapacity: borrowCapacityBN } = bank.computeRemainingCapacity();
    const depositCapacity = nativeToUi(depositCapacityBN, bankInfo.mintDecimals);
    const borrowCapacity = nativeToUi(borrowCapacityBN, bankInfo.mintDecimals);
    let maxDeposit = floor(Math.max(0, Math.min(walletBalance, depositCapacity)), bankInfo.mintDecimals);
    let maxBorrow = 0;
    if (userData.marginfiAccount) {
        const borrowPower = userData.marginfiAccount
            .computeMaxBorrowForBank(bank.address, { volatilityFactor: VOLATILITY_FACTOR })
            .toNumber();
        maxBorrow = floor(Math.max(0, Math.min(borrowPower, borrowCapacity, bankInfo.availableLiquidity)), bankInfo.mintDecimals);
    }
    const positionRaw = userData.marginfiAccount &&
        userData.marginfiAccount.activeBalances.find((balance) => balance.bankPk.equals(bank.address));
    if (!positionRaw) {
        const userInfo = {
            tokenAccount: userData.tokenAccount,
            maxDeposit,
            maxRepay: 0,
            maxWithdraw: 0,
            maxBorrow,
        };
        return {
            address: bank.address,
            meta,
            info: state,
            userInfo,
            isActive: false,
        };
    }
    // Calculate user-specific info relevant to their active position in this bank
    const marginfiAccount = userData.marginfiAccount;
    const position = makeLendingPosition(positionRaw, bank, bankInfo, oraclePrice, marginfiAccount);
    const maxWithdraw = floor(Math.min(marginfiAccount.computeMaxWithdrawForBank(bank.address, { volatilityFactor: VOLATILITY_FACTOR }).toNumber(), bankInfo.availableLiquidity), bankInfo.mintDecimals);
    let maxRepay = 0;
    if (position) {
        const debtAmount = ceil(position.amount, bankInfo.mintDecimals);
        maxRepay = Math.min(debtAmount, walletBalance);
    }
    const userInfo = {
        tokenAccount: userData.tokenAccount,
        maxDeposit,
        maxRepay,
        maxWithdraw,
        maxBorrow,
    };
    return {
        address: bank.address,
        meta,
        info: state,
        userInfo,
        isActive: true,
        position,
    };
}
function makeLendingPosition(balance, bank, bankInfo, oraclePrice, marginfiAccount) {
    const amounts = balance.computeQuantity(bank);
    const usdValues = balance.computeUsdValue(bank, oraclePrice, MarginRequirementType.Equity);
    const weightedUSDValues = balance.getUsdValueWithPriceBias(bank, oraclePrice, MarginRequirementType.Maintenance);
    const isLending = usdValues.liabilities.isZero();
    const amount = isLending
        ? nativeToUi(amounts.assets.integerValue(BigNumber.ROUND_DOWN).toNumber(), bankInfo.mintDecimals)
        : nativeToUi(amounts.liabilities.integerValue(BigNumber.ROUND_UP).toNumber(), bankInfo.mintDecimals);
    const isDust = uiToNative(amount, bankInfo.mintDecimals).isZero();
    const weightedUSDValue = isLending ? weightedUSDValues.assets.toNumber() : weightedUSDValues.liabilities.toNumber();
    const usdValue = isLending ? usdValues.assets.toNumber() : usdValues.liabilities.toNumber();
    const liquidationPrice = marginfiAccount.computeLiquidationPriceForBank(bank.address);
    return {
        amount,
        usdValue,
        weightedUSDValue,
        liquidationPrice,
        isLending,
        isDust,
    };
}
function fetchTokenAccounts(connection, walletAddress, bankInfos) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get relevant addresses
        const mintList = bankInfos.map((bank) => ({
            address: bank.mint,
            decimals: bank.mintDecimals,
        }));
        if (walletAddress === null) {
            const emptyTokenAccountMap = new Map(mintList.map(({ address }) => [
                address.toBase58(),
                {
                    created: false,
                    mint: address,
                    balance: 0,
                },
            ]));
            return {
                nativeSolBalance: 0,
                tokenAccountMap: emptyTokenAccountMap,
            };
        }
        const ataAddresses = mintList.map((mint) => getAssociatedTokenAddressSync(mint.address, walletAddress, true)); // We allow off curve addresses here to support Fuse.
        // Fetch relevant accounts
        const accountsAiList = yield connection.getMultipleAccountsInfo([walletAddress, ...ataAddresses]);
        // Decode account buffers
        const [walletAi, ...ataAiList] = accountsAiList;
        const nativeSolBalance = (walletAi === null || walletAi === void 0 ? void 0 : walletAi.lamports) ? walletAi.lamports / 1e9 : 0;
        const ataList = ataAiList.map((ai, index) => {
            var _a, _b;
            if (!ai ||
                (!((_a = ai === null || ai === void 0 ? void 0 : ai.owner) === null || _a === void 0 ? void 0 : _a.equals(TOKEN_PROGRAM_ID)) &&
                    !((_b = ai === null || ai === void 0 ? void 0 : ai.owner) === null || _b === void 0 ? void 0 : _b.equals(new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"))))) {
                return {
                    created: false,
                    mint: mintList[index].address,
                    balance: 0,
                };
            }
            const decoded = unpackAccount(ataAddresses[index], ai);
            return {
                created: true,
                mint: decoded.mint,
                balance: nativeToUi(new BN(decoded.amount.toString()), mintList[index].decimals),
            };
        });
        return { nativeSolBalance, tokenAccountMap: new Map(ataList.map((ata) => [ata.mint.toString(), ata])) };
    });
}
function getCurrentAction(isLendingMode, bank) {
    if (!bank.isActive) {
        return isLendingMode ? ActionType.Deposit : ActionType.Borrow;
    }
    else {
        if (bank.position.isLending) {
            if (isLendingMode) {
                return ActionType.Deposit;
            }
            else {
                return ActionType.Withdraw;
            }
        }
        else {
            if (isLendingMode) {
                return ActionType.Repay;
            }
            else {
                return ActionType.Borrow;
            }
        }
    }
}
export { DEFAULT_ACCOUNT_SUMMARY, computeAccountSummary, makeBankInfo, makeExtendedBankMetadata, makeExtendedBankInfo, fetchTokenAccounts, getCurrentAction, };
var Emissions;
(function (Emissions) {
    Emissions[Emissions["Inactive"] = 0] = "Inactive";
    Emissions[Emissions["Lending"] = 1] = "Lending";
    Emissions[Emissions["Borrowing"] = 2] = "Borrowing";
})(Emissions || (Emissions = {}));
var ActionType;
(function (ActionType) {
    ActionType["Deposit"] = "Supply";
    ActionType["Borrow"] = "Borrow";
    ActionType["Repay"] = "Repay";
    ActionType["Withdraw"] = "Withdraw";
})(ActionType || (ActionType = {}));
export { Emissions, ActionType };
