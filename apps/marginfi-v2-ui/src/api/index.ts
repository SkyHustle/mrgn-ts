import { MarginfiClient, nativeToUi } from "@mrgnlabs/marginfi-client-v2";
import MarginfiAccount, { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2/src/account";
import Bank from "@mrgnlabs/marginfi-client-v2/src/bank";
import { toast } from "react-toastify";
import { AccountSummary } from "~/types";

const DEFAULT_ACCOUNT_SUMMARY = {
  balance: 0,
  lendingAmount: 0,
  borrowingAmount: 0,
  apy: 0,
  positions: [],
};

function computeAccountSummary(marginfiAccount: MarginfiAccount): AccountSummary {
  const equityComponents = marginfiAccount.getHealthComponents(MarginRequirementType.Equity);

  return {
    balance: equityComponents.assets.minus(equityComponents.liabilities).toNumber(),
    lendingAmount: equityComponents.assets.toNumber(),
    borrowingAmount: equityComponents.liabilities.toNumber(),
    apy: marginfiAccount.computeApy(), // TODO: prob pff, wrote something quick for this
    positions: marginfiAccount.getActiveBalances().map((balance) => {
      const bank = marginfiAccount.group.getBankByPk(balance.bankPk);
      if (!bank) throw new Error(`Bank ${balance.bankPk} not found`);
      const amounts = balance.getQuantity(bank);
      const usdValues = balance.getUsdValue(bank, MarginRequirementType.Equity);
      const isLending = usdValues.liabilities.isZero();
      return {
        amount: isLending
          ? nativeToUi(amounts.assets.toNumber(), bank.mintDecimals)
          : nativeToUi(amounts.liabilities.toNumber(), bank.mintDecimals),
        usdValue: isLending ? usdValues.assets.toNumber() : usdValues.liabilities.toNumber(),
        assetName: bank.label,
        assetMint: bank.mint,
        isLending,
        apy: isLending
          ? bank.getInterestRates().lendingRate.toNumber()
          : bank.getInterestRates().borrowingRate.toNumber(),
        bank,
        bankMetadata: { icon: "solana_logo.png" },
      };
    }),
  };
}

export { DEFAULT_ACCOUNT_SUMMARY, computeAccountSummary };
