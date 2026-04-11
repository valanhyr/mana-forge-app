import { describe, it, expect } from 'vitest';
import { FollowService } from '../../../services/FollowService';

describe('FollowService', () => {
  it('follow llama POST /follows/:userId', async () => {
    await expect(FollowService.follow('user-2')).resolves.toBeUndefined();
  });

  it('unfollow llama DELETE /follows/:userId', async () => {
    await expect(FollowService.unfollow('user-2')).resolves.toBeUndefined();
  });

  it('getFollowing retorna array', async () => {
    const result = await FollowService.getFollowing();
    expect(Array.isArray(result)).toBe(true);
  });

  it('getFollowers retorna array', async () => {
    const result = await FollowService.getFollowers();
    expect(Array.isArray(result)).toBe(true);
  });

  it('getStatus retorna FollowStatus con el userId', async () => {
    const status = await FollowService.getStatus('user-2');
    expect(status).toHaveProperty('following');
    expect(status).toHaveProperty('followersCount');
    expect(status).toHaveProperty('followingCount');
  });
});
