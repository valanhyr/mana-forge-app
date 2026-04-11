import { api } from './api';
import type { FriendUser } from './FriendService';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  friendId: string;
  friend: FriendUser;
  lastMessage: Partial<ChatMessage>;
  unreadCount: number;
  lastMessageAt: string;
}

export const MessageService = {
  getConversations: (): Promise<Conversation[]> =>
    api.get('/messages/conversations').then((r) => r.data),

  getConversation: (friendId: string): Promise<ChatMessage[]> =>
    api.get(`/messages/${friendId}`).then((r) => r.data),

  sendMessage: (friendId: string, content: string): Promise<ChatMessage> =>
    api.post(`/messages/${friendId}`, { content }).then((r) => r.data),

  markAsRead: (friendId: string): Promise<void> =>
    api.put(`/messages/${friendId}/read`).then(() => {}),

  getUnreadCount: (): Promise<number> =>
    api.get('/messages/unread-count').then((r) => r.data.count),
};
