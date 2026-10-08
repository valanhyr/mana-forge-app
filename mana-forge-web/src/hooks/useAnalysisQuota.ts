import { useCallback, useEffect, useState } from 'react';
import { DeckService, type AnalysisQuota } from '../services/DeckService';
import { useUser } from '../services/UserContext';

export function useAnalysisQuota() {
  const { user, isAuthenticated } = useUser();
  const identity = isAuthenticated ? user?.userId || 'session' : 'anonymous';
  const [state, setState] = useState<{ identity: string; quota: AnalysisQuota | null }>({ identity, quota: null });
  const quota = state.identity === identity ? state.quota : null;
  const setQuota = useCallback((value: AnalysisQuota | null) => setState({ identity, quota: value }), [identity]);
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const value = await DeckService.getAnalysisQuota();
      if (!cancelled) setQuota(value);
    };
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [setQuota]);

  useEffect(() => {
    if (!quota?.resetsAt) return;
    const reset = Date.parse(quota.resetsAt);
    if (!Number.isFinite(reset) || reset <= Date.now()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const value = await DeckService.getAnalysisQuota();
      if (!cancelled) setQuota(value);
    }, Math.min(reset - Date.now() + 1000, 2147483647));
    return () => { cancelled = true; clearTimeout(timer); };
  }, [quota?.resetsAt, setQuota]);
  return { quota, setQuota };
}
