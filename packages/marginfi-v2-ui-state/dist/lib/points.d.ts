import { DocumentData } from "firebase/firestore";
import { Connection } from "@solana/web3.js";
type LeaderboardRow = {
    id: string;
    owner: string;
    domain: string;
    rank: number;
    total_activity_deposit_points: number;
    total_activity_borrow_points: number;
    total_referral_deposit_points: number;
    total_referral_borrow_points: number;
    total_deposit_points: number;
    total_borrow_points: number;
    total_referral_points: number;
    socialPoints: number;
    total_points: number;
};
type LeaderboardSettings = {
    pageSize: number;
    currentPage: number;
    orderCol: string;
    orderDir: "desc" | "asc";
    pageDirection?: "next" | "prev";
    search?: string;
};
declare function fetchLeaderboardData(connection: Connection, settings: LeaderboardSettings): Promise<LeaderboardRow[]>;
declare function fetchTotalLeaderboardCount(): Promise<number>;
declare function fetchUserRank(address: string): Promise<number>;
declare function fetchTotalUserCount(): Promise<number>;
interface UserPointsData {
    owner: string;
    depositPoints: number;
    borrowPoints: number;
    referralPoints: number;
    referralLink: string;
    isCustomReferralLink: boolean;
    userRank: number | null;
    totalPoints: number;
}
declare const DEFAULT_USER_POINTS_DATA: UserPointsData;
declare const getPointsDataForUser: (wallet: string | undefined) => Promise<UserPointsData>;
declare function getPointsSummary(): Promise<DocumentData>;
export { fetchLeaderboardData, fetchTotalLeaderboardCount, fetchUserRank, fetchTotalUserCount, getPointsSummary, getPointsDataForUser, DEFAULT_USER_POINTS_DATA, };
export type { LeaderboardRow, LeaderboardSettings, UserPointsData };
//# sourceMappingURL=points.d.ts.map