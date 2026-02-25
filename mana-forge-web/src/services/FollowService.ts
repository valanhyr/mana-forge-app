import { api } from "./api";
import type { FriendUser } from "./FriendService";

export interface FollowStatus {
  following: boolean;
  followersCount: number;
  followingCount: number;
}

export const FollowService = {
  follow: (userId: string): Promise<void> =>
    api.post(`/follows/${userId}`).then(() => {}),

  unfollow: (userId: string): Promise<void> =>
    api.delete(`/follows/${userId}`).then(() => {}),

  getFollowing: (): Promise<FriendUser[]> =>
    api.get("/follows/following").then((r) => r.data),

  getFollowers: (): Promise<FriendUser[]> =>
    api.get("/follows/followers").then((r) => r.data),

  getStatus: (userId: string): Promise<FollowStatus> =>
    api.get(`/follows/${userId}/status`).then((r) => r.data),
};
