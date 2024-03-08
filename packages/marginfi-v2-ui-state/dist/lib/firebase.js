var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { STATUS_BAD_REQUEST, STATUS_INTERNAL_ERROR, STATUS_NOT_FOUND, STATUS_OK, STATUS_UNAUTHORIZED, } from "../constants";
import { v4 as uuidv4 } from "uuid";
import { Transaction } from "@solana/web3.js";
import { createMemoInstruction } from "@mrgnlabs/mrgn-common";
import base58 from "bs58";
import { object, string, optional } from "superstruct";
import { FIREBASE_CONFIG } from "../config";
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);
export { app, db, auth };
function loginOrSignup(walletAddress, walletId, referralCode) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield getUser(walletAddress);
        if (user) {
            yield login(walletAddress, walletId);
        }
        else {
            yield signup(walletAddress, walletId, referralCode);
        }
    });
}
function getUser(walletAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("/api/user/get", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ wallet: walletAddress }),
        });
        if (response.status === STATUS_OK) {
            // User found
            const { user } = yield response.json();
            return user;
        }
        else if (response.status === STATUS_NOT_FOUND) {
            // User not found
            return undefined;
        }
        else {
            // Error
            const { error } = yield response.json();
            throw new Error(`Failed to fetch user: ${error}`);
        }
    });
}
const LoginPayloadStruct = object({
    uuid: string(),
});
function login(walletAddress, walletId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield loginWithAddress(walletAddress, walletId);
    });
}
const SignupPayloadStruct = object({
    uuid: string(),
    referralCode: optional(string()),
});
const MigratePayloadStruct = object({
    fromWalletAddress: string(),
    toWalletAddress: string(),
});
function signup(walletAddress, walletId, referralCode) {
    return __awaiter(this, void 0, void 0, function* () {
        if (referralCode !== undefined && typeof referralCode !== "string") {
            throw new Error("Invalid referral code provided.");
        }
        const uuid = uuidv4();
        const authData = {
            uuid,
            referralCode,
        };
        yield signupWithAddress(walletAddress, authData, walletId);
    });
}
function migratePoints(signingMethod, blockhash, wallet, toWalletAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const authData = {
            fromWalletAddress: wallet.publicKey.toBase58(),
            toWalletAddress,
        };
        const signedDataRaw = signingMethod === "tx" ? yield signMigrateTx(wallet, authData, blockhash) : yield signMigrateMemo(wallet, authData);
        const response = yield fetch("/api/user/migrate-points", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ method: signingMethod, signedDataRaw }),
        });
        const data = yield response.json();
        console.log(response.status, data);
        return data;
    });
}
export { getUser, loginOrSignup, signup, login, migratePoints, SignupPayloadStruct, LoginPayloadStruct, MigratePayloadStruct, };
// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function signupWithAddress(walletAddress, payload, walletId) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("/api/user/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ walletAddress, payload, walletId }),
        });
        const data = yield response.json();
        switch (response.status) {
            case STATUS_BAD_REQUEST:
                throw new Error(data.error);
            case STATUS_UNAUTHORIZED:
            case STATUS_INTERNAL_ERROR:
                throw new Error("Something went wrong during sign-up");
            default: {
            }
        }
        if (!data.token)
            throw new Error("Something went wrong during sign-up");
        yield signinFirebaseAuth(data.token);
    });
}
function loginWithAddress(walletAddress, walletId) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("/api/user/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ walletAddress, walletId }),
        });
        const data = yield response.json();
        if (!data.token)
            throw new Error("Something went wrong during sign-in");
        yield signinFirebaseAuth(data.token);
    });
}
function signMigrateMemo(wallet, migrateData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!wallet.publicKey) {
            throw new Error("Wallet not connected!");
        }
        if (!wallet.signMessage) {
            throw new Error("Current wallet does not support required action: `signMessage`");
        }
        const encodedMessage = new TextEncoder().encode(JSON.stringify(migrateData));
        const signature = yield wallet.signMessage(encodedMessage);
        const signedData = JSON.stringify({
            data: migrateData,
            signature: base58.encode(signature),
            signer: wallet.publicKey.toBase58(),
        });
        return signedData;
    });
}
function signMigrateTx(wallet, migrateData, blockhash) {
    return __awaiter(this, void 0, void 0, function* () {
        const walletAddress = wallet.publicKey;
        const authDummyTx = new Transaction().add(createMemoInstruction(JSON.stringify(migrateData), [walletAddress]));
        authDummyTx.feePayer = walletAddress;
        authDummyTx.recentBlockhash = blockhash.blockhash;
        authDummyTx.lastValidBlockHeight = blockhash.lastValidBlockHeight;
        if (!wallet.signTransaction) {
            throw new Error("Current wallet does not support required action: `signTransaction`");
        }
        const signedAuthDummyTx = yield wallet.signTransaction(authDummyTx);
        let signedData = signedAuthDummyTx.serialize().toString("base64");
        return signedData;
    });
}
/**
 * @deprecated
 * Signing functionality
 */
function signupWithAuthData(signingMethod, signedAuthDataRaw) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("/api/user/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ method: signingMethod, signedAuthDataRaw }),
        });
        const data = yield response.json();
        switch (response.status) {
            case STATUS_BAD_REQUEST:
                throw new Error(data.error);
            case STATUS_UNAUTHORIZED:
            case STATUS_INTERNAL_ERROR:
                throw new Error("Something went wrong during sign-up");
            default: {
            }
        }
        if (!data.token)
            throw new Error("Something went wrong during sign-up");
        yield signinFirebaseAuth(data.token);
    });
}
/**
 * @deprecated
 * Signing functionality
 */
function loginWithAuthData(signingMethod, signedAuthDataRaw) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("/api/user/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ method: signingMethod, signedAuthDataRaw }),
        });
        const data = yield response.json();
        if (!data.token)
            throw new Error("Something went wrong during sign-in");
        yield signinFirebaseAuth(data.token);
    });
}
/**
 * @deprecated
 * Signing functionality
 */
function signSignupMemo(wallet, authData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!wallet.publicKey) {
            throw new Error("Wallet not connected!");
        }
        if (!wallet.signMessage) {
            throw new Error("Current wallet does not support required action: `signMessage`");
        }
        const encodedMessage = new TextEncoder().encode(JSON.stringify(authData));
        const signature = yield wallet.signMessage(encodedMessage);
        const signedData = JSON.stringify({
            data: authData,
            signature: base58.encode(signature),
            signer: wallet.publicKey.toBase58(),
        });
        return signedData;
    });
}
/**
 * @deprecated
 * Signing functionality
 */
function signSignupTx(wallet, authData, blockhash) {
    return __awaiter(this, void 0, void 0, function* () {
        const walletAddress = wallet.publicKey;
        const authDummyTx = new Transaction().add(createMemoInstruction(JSON.stringify(authData), [walletAddress]));
        authDummyTx.feePayer = walletAddress;
        authDummyTx.recentBlockhash = blockhash.blockhash;
        authDummyTx.lastValidBlockHeight = blockhash.lastValidBlockHeight;
        if (!wallet.signTransaction) {
            throw new Error("Current wallet does not support required action: `signTransaction`");
        }
        const signedAuthDummyTx = yield wallet.signTransaction(authDummyTx);
        let signedData = signedAuthDummyTx.serialize().toString("base64");
        return signedData;
    });
}
/**
 * @deprecated
 * Signing functionality
 */
function signLoginMemo(wallet, authData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!wallet.publicKey) {
            throw new Error("Wallet not connected!");
        }
        if (!wallet.signMessage) {
            throw new Error("Current wallet does not support required action: `signMessage`");
        }
        const encodedMessage = new TextEncoder().encode(JSON.stringify(authData));
        const signature = yield wallet.signMessage(encodedMessage);
        const signedData = JSON.stringify({
            data: authData,
            signature: base58.encode(signature),
            signer: wallet.publicKey.toBase58(),
        });
        return signedData;
    });
}
/**
 * @deprecated
 * Signing functionality
 */
function signLoginTx(wallet, authData, blockhash) {
    return __awaiter(this, void 0, void 0, function* () {
        const walletAddress = wallet.publicKey;
        const authDummyTx = new Transaction().add(createMemoInstruction(JSON.stringify(authData), [walletAddress]));
        authDummyTx.feePayer = walletAddress;
        authDummyTx.recentBlockhash = blockhash.blockhash;
        authDummyTx.lastValidBlockHeight = blockhash.lastValidBlockHeight;
        if (!wallet.signTransaction) {
            throw new Error("Current wallet does not support required action: `signTransaction`");
        }
        const signedAuthDummyTx = yield wallet.signTransaction(authDummyTx);
        let signedData = signedAuthDummyTx.serialize().toString("base64");
        return signedData;
    });
}
function signinFirebaseAuth(token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield signInWithCustomToken(auth, token);
        }
        catch (error) {
            console.error("Error signing in with custom token: ", error);
            if (error.code === "auth/network-request-failed") {
                // @todo need to give user better experience here
                throw new Error("It appears there was a network error. Please check your internet connection and try again. If the problem persists, please try again later.");
            }
            else {
                throw new Error("An error occurred while signing in. Please try again later.");
            }
        }
    });
}
