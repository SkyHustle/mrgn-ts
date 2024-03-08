import { User } from "firebase/auth";
import { UserPointsData } from "../lib/points";
type ZoomLevel = 1 | 2 | 3;
interface UserProfileState {
    lendZoomLevel: ZoomLevel;
    denominationUSD: boolean;
    showBadges: boolean;
    currentFirebaseUser: User | null;
    hasUser: boolean | null;
    userPointsData: UserPointsData;
    setLendZoomLevel: (level: ZoomLevel) => void;
    setDenominationUSD: (checked: boolean) => void;
    setShowBadges: (checked: boolean) => void;
    checkForFirebaseUser: (walletAddress: string) => Promise<void>;
    setFirebaseUser: (user: User | null) => void;
    signoutFirebaseUser: (isConnected: boolean, walletAddress?: string) => Promise<void>;
    fetchPoints: (walletAddress: string) => Promise<void>;
    resetPoints: () => void;
}
declare function createUserProfileStore(): import("zustand").UseBoundStore<import("zustand").StoreApi<UserProfileState>>;
export { createUserProfileStore };
export type { ZoomLevel, UserProfileState };
//# sourceMappingURL=userProfileStore.d.ts.map