import { describe, it, expect } from 'vitest';
import { MessageService } from '../../../services/MessageService';

describe('MessageService', () => {
  it('getConversations llama GET /messages/conversations', async () => {
    const result = await MessageService.getConversations();
    expect(Array.isArray(result)).toBe(true);
  });

  it('getConversation llama GET /messages/:friendId', async () => {
    const result = await MessageService.getConversation('user-2');
    expect(Array.isArray(result)).toBe(true);
  });

  it('sendMessage llama POST /messages/:friendId y retorna ChatMessage', async () => {
    const msg = await MessageService.sendMessage('user-2', 'Hola!');
    expect(msg).toHaveProperty('id');
    expect(msg).toHaveProperty('content');
  });

  it('markAsRead llama PUT /messages/:friendId/read', async () => {
    await expect(MessageService.markAsRead('user-2')).resolves.toBeUndefined();
  });

  it('getUnreadCount retorna un número', async () => {
    const count = await MessageService.getUnreadCount();
    expect(typeof count).toBe('number');
  });
});
