/// <reference types="@coral-xyz/anchor/node_modules/@solana/web3.js" />
import { Address } from "@coral-xyz/anchor";
import { ConfirmOptions, PublicKey, Signer, Transaction, TransactionSignature } from "@solana/web3.js";
import { LipConfig, LipProgram } from "./types";
import { Bank, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { Campaign, DepositData } from "./account";
import { Amount, InstructionsWrapper, TransactionOptions, Wallet } from "@mrgnlabs/mrgn-common";
/**
 * Entrypoint to interact with the LIP contract.
 */
declare class LipClient {
    readonly config: LipConfig;
    readonly program: LipProgram;
    readonly wallet: Wallet;
    readonly mfiClient: MarginfiClient;
    readonly programId: PublicKey;
    campaigns: Campaign[];
    /**
     * @internal
     */
    private constructor();
    static fetch(config: LipConfig, marginfiClient: MarginfiClient, opts?: ConfirmOptions): Promise<LipClient>;
    reload(): Promise<void>;
    private static _fetchAccountData;
    /**
     * Retrieves all deposit accounts.
     *
     * @returns Deposit instances
     */
    getAllDepositsPerOwner(): Promise<{
        [owner: string]: DepositData[];
    }>;
    /**
     * Retrieves all deposit accounts for specified owner.
     *
     * @returns Deposit instances
     */
    getDepositsForOwner(owner?: Address): Promise<DepositData[]>;
    makeDepositIx(campaign: PublicKey, amount: Amount, bank: Bank): Promise<InstructionsWrapper>;
    deposit(campaign: PublicKey, amount: Amount, bank: Bank): Promise<string>;
    processTransaction(transaction: Transaction, signers?: Array<Signer>, opts?: TransactionOptions): Promise<TransactionSignature>;
}
export default LipClient;
//# sourceMappingURL=client.d.ts.map