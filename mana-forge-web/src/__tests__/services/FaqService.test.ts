import { describe, expect, it, vi, afterEach } from 'vitest';
import { api } from '../../services/api';
import { FaqService } from '../../services/FaqService';

describe('FaqService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('requests the active locale from the content API', async () => {
    const topics = [{ id: 'general', title: 'General', questions: [] }];
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: topics });
    await expect(FaqService.getTopics('en')).resolves.toEqual(topics);
    expect(get).toHaveBeenCalledWith('/v1/content/faqs', { params: { locale: 'en' } });
  });

  it('propagates errors rather than falling back to local content', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('unavailable'));
    await expect(FaqService.getTopics('es')).rejects.toThrow('unavailable');
  });

  it('rejects malformed API responses', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [{ id: 'broken', questions: null }] });
    await expect(FaqService.getTopics('es')).rejects.toThrow();
  });
});
