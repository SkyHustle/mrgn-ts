var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { signOut } from "firebase/auth";
import { create } from "zustand";
import { firebaseApi } from "../lib";
import { DEFAULT_USER_POINTS_DATA, getPointsDataForUser } from "../lib/points";
function createUserProfileStore() {
    return create()((set, get) => ({
        // State
        lendZoomLevel: 3,
        denominationUSD: false,
        showBadges: false,
        currentFirebaseUser: null,
        hasUser: null,
        userPointsData: DEFAULT_USER_POINTS_DATA,
        // Actions
        setLendZoomLevel: (level) => set(() => ({ lendZoomLevel: level })),
        setDenominationUSD: (checked) => set(() => ({ denominationUSD: checked })),
        setShowBadges: (checked) => set(() => ({ showBadges: checked })),
        checkForFirebaseUser: (walletAddress) => __awaiter(this, void 0, void 0, function* () {
            let user;
            try {
                user = yield firebaseApi.getUser(walletAddress);
            }
            catch (error) { }
            set({ hasUser: !!user });
        }),
        setFirebaseUser: (user) => {
            set(() => ({ currentFirebaseUser: user }));
        },
        signoutFirebaseUser: (isConnected, walletAddress) => __awaiter(this, void 0, void 0, function* () {
            const currentFirebaseUser = get().currentFirebaseUser;
            const disconnected = !isConnected && currentFirebaseUser;
            const mismatchingId = walletAddress && (currentFirebaseUser === null || currentFirebaseUser === void 0 ? void 0 : currentFirebaseUser.uid) && walletAddress !== currentFirebaseUser.uid;
            if (disconnected || mismatchingId) {
                yield signOut(firebaseApi.auth);
                set(() => ({ currentFirebaseUser: null }));
            }
        }),
        fetchPoints: (wallet) => __awaiter(this, void 0, void 0, function* () { return set({ userPointsData: yield getPointsDataForUser(wallet) }); }),
        resetPoints: () => set({ userPointsData: DEFAULT_USER_POINTS_DATA }),
    }));
}
export { createUserProfileStore };
