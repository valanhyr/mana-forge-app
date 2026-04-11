import { api } from "./api";

export interface FriendUser {
  userId: string;
  name: string;
  username: string;
  email: string;
  biography?: string;
  avatar?: string;
}

export interface ReceivedRequest {
  requestId: string;
  sender: FriendUser;
  createdAt: string;
}

export interface SentRequest {
  requestId: string;
  receiver: FriendUser;
  createdAt: string;
}

export const FriendService = {
  getFriends: (): Promise<FriendUser[]> =>
    api.get("/friends").then((r) => r.data),

  getReceivedRequests: (): Promise<ReceivedRequest[]> =>
    api.get("/friends/requests/received").then((r) => r.data),

  getSentRequests: (): Promise<SentRequest[]> =>
    api.get("/friends/requests/sent").then((r) => r.data),

  sendRequest: (targetUserId: string): Promise<void> =>
    api.post(`/friends/requests/${targetUserId}`).then(() => {}),

  acceptRequest: (requestId: string): Promise<void> =>
    api.put(`/friends/requests/${requestId}/accept`).then(() => {}),

  deleteRequest: (requestId: string): Promise<void> =>
    api.delete(`/friends/requests/${requestId}`).then(() => {}),

  removeFriend: (friendId: string): Promise<void> =>
    api.delete(`/friends/${friendId}`).then(() => {}),

  searchUsers: (q: string): Promise<FriendUser[]> =>
    api.get("/friends/search", { params: { q } }).then((r) => r.data),
};
