import { SigningMethod } from "../types";
import { BlockhashWithExpiryBlockHeight } from "@solana/web3.js";
import { Infer } from "superstruct";
import { Wallet } from "@mrgnlabs/mrgn-common";
declare const app: import("@firebase/app").FirebaseApp;
declare const db: import("@firebase/firestore").Firestore;
declare const auth: import("@firebase/auth").Auth;
export { app, db, auth };
interface UserData {
    id: string;
}
declare function loginOrSignup(walletAddress: string, walletId?: string, referralCode?: string): Promise<void>;
declare function getUser(walletAddress: string): Promise<UserData | undefined>;
declare const LoginPayloadStruct: import("superstruct").Struct<{
    uuid: string;
}, {
    uuid: import("superstruct").Struct<string, null>;
}>;
declare function login(walletAddress: string, walletId?: string): Promise<void>;
declare const SignupPayloadStruct: import("superstruct").Struct<{
    uuid: string;
    referralCode?: string | undefined;
}, {
    uuid: import("superstruct").Struct<string, null>;
    referralCode: import("superstruct").Struct<string | undefined, null>;
}>;
type SignupPayload = Infer<typeof SignupPayloadStruct>;
declare const MigratePayloadStruct: import("superstruct").Struct<{
    fromWalletAddress: string;
    toWalletAddress: string;
}, {
    fromWalletAddress: import("superstruct").Struct<string, null>;
    toWalletAddress: import("superstruct").Struct<string, null>;
}>;
type MigratePayload = Infer<typeof MigratePayloadStruct>;
declare function signup(walletAddress: string, walletId?: string, referralCode?: string): Promise<void>;
declare function migratePoints(signingMethod: SigningMethod, blockhash: BlockhashWithExpiryBlockHeight, wallet: Wallet, toWalletAddress: string): Promise<any>;
export { getUser, loginOrSignup, signup, login, migratePoints, SignupPayloadStruct, LoginPayloadStruct, MigratePayloadStruct, };
export type { UserData, SignupPayload, MigratePayload };
//# sourceMappingURL=firebase.d.ts.map