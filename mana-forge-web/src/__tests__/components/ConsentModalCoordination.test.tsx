import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import App from '../../App';

vi.mock('../../components/ui/KlaroConsent', () => ({
  default: ({ onConsentResolved }: { onConsentResolved?: (resolved: boolean) => void }) =>
    <button onClick={() => onConsentResolved?.(true)}>Choose consent</button>,
}));
vi.mock('../../components/ui/WhatsNewModal', () => ({ default: () => <div>Release notes modal</div> }));
vi.mock('../../components/layout/Layout', () => ({ default: () => <div>Page</div> }));
vi.mock('../../services/UserContext', () => ({
  UserProvider: ({ children }: { children: ReactNode }) => children,
  useUser: () => ({ isAuthenticated: false, user: null }),
}));

describe('consent and release notes', () => {
  it('does not open the release notes modal until the consent notice is resolved', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByText('Release notes modal')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Choose consent' }));
    expect(screen.getByText('Release notes modal')).toBeInTheDocument();
  });
});
