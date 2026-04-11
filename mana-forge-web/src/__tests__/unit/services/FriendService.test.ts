import { describe, it, expect } from 'vitest';
import { FriendService } from '../../../services/FriendService';

describe('FriendService', () => {
  it('getFriends llama GET /friends y retorna array', async () => {
    const result = await FriendService.getFriends();
    expect(Array.isArray(result)).toBe(true);
  });

  it('getReceivedRequests llama GET /friends/requests/received', async () => {
    const result = await FriendService.getReceivedRequests();
    expect(Array.isArray(result)).toBe(true);
  });

  it('getSentRequests llama GET /friends/requests/sent', async () => {
    const result = await FriendService.getSentRequests();
    expect(Array.isArray(result)).toBe(true);
  });

  it('sendRequest llama POST /friends/requests/:targetUserId', async () => {
    await expect(FriendService.sendRequest('user-2')).resolves.toBeUndefined();
  });

  it('acceptRequest llama PUT /friends/requests/:requestId/accept', async () => {
    await expect(FriendService.acceptRequest('req-1')).resolves.toBeUndefined();
  });

  it('deleteRequest llama DELETE /friends/requests/:requestId', async () => {
    await expect(FriendService.deleteRequest('req-1')).resolves.toBeUndefined();
  });

  it('removeFriend llama DELETE /friends/:friendId', async () => {
    await expect(FriendService.removeFriend('user-2')).resolves.toBeUndefined();
  });

  it('searchUsers llama GET /friends/search con query param', async () => {
    const result = await FriendService.searchUsers('john');
    expect(Array.isArray(result)).toBe(true);
  });
});
