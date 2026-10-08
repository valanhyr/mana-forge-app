# Mana Forge Frontdesk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `mana-forge-frontdesk`, an internal backoffice web app for Mana Forge providing support tickets, User 360 inspection, email outreach with templates, and audit logging, backed by in-memory mock repositories and ports.

**Architecture:** Hexagonal architecture with pure TypeScript domain models, decoupled ports (`ITicketRepository`, `IUserRepository`, `IEmailService`, `IAuditRepository`), in-memory mock adapters with realistic Magic: The Gathering seed data, and a React 19 + TypeScript + Vite + Tailwind CSS frontend.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Lucide React, @tanstack/react-query, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-08-mana-forge-frontdesk-design.md`

## Global Constraints

- Standalone project located in `mana-forge-frontdesk/`.
- UI strings, code, comments, tests, and documentation must be in English.
- No direct coupling between UI components and mock implementations; components consume React Query hooks that resolve dependencies via `container.ts`.
- Mock repositories must support realistic MtG test data and localStorage persistence with a reset utility.

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `mana-forge-frontdesk/package.json`
- Create: `mana-forge-frontdesk/tsconfig.json`
- Create: `mana-forge-frontdesk/tsconfig.node.json`
- Create: `mana-forge-frontdesk/vite.config.ts`
- Create: `mana-forge-frontdesk/index.html`
- Create: `mana-forge-frontdesk/src/index.css`
- Create: `mana-forge-frontdesk/src/test/setup.ts`
- Test: `mana-forge-frontdesk/src/test/sanity.test.ts`

**Interfaces:**
- Produces: Runnable Vite dev server and Vitest test runner for `mana-forge-frontdesk`.

- [ ] **Step 1: Write the failing sanity test**

```typescript
// mana-forge-frontdesk/src/test/sanity.test.ts
import { describe, it, expect } from 'vitest';

describe('Sanity Check', () => {
  it('should verify test environment is properly configured', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Create project configuration files**

Create `mana-forge-frontdesk/package.json`:
```json
{
  "name": "mana-forge-frontdesk",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.90.12",
    "lucide-react": "^0.562.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.18",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^24.10.4",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react-swc": "^4.2.2",
    "jsdom": "^29.0.2",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.9.3",
    "vite": "^7.2.4",
    "vitest": "^4.1.4"
  }
}
```

Create `mana-forge-frontdesk/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

Create `mana-forge-frontdesk/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

Create `mana-forge-frontdesk/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

Create `mana-forge-frontdesk/index.html`:
```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mana Forge Frontdesk</title>
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `mana-forge-frontdesk/src/index.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 3: Run sanity test**

Run: `cd mana-forge-frontdesk && npm test`
Expected: PASS

---

### Task 2: Core Domain Entities & Macro Interpolator

**Files:**
- Create: `mana-forge-frontdesk/src/core/domain/ticket.ts`
- Create: `mana-forge-frontdesk/src/core/domain/user.ts`
- Create: `mana-forge-frontdesk/src/core/domain/email.ts`
- Create: `mana-forge-frontdesk/src/core/domain/audit.ts`
- Test: `mana-forge-frontdesk/src/core/domain/email.test.ts`

**Interfaces:**
- Produces: `Ticket`, `TicketMessage`, `TicketStatus`, `TicketPriority`, `TicketCategory`
- Produces: `User360`, `UserTier`, `UserSummaryDeck`
- Produces: `EmailTemplate`, `SendEmailPayload`, `interpolateTemplate(template, variables)`
- Produces: `AuditEntry`, `AuditAction`

- [ ] **Step 1: Write failing tests for email template interpolation**

```typescript
// mana-forge-frontdesk/src/core/domain/email.test.ts
import { describe, it, expect } from 'vitest';
import { interpolateTemplate } from './email';

describe('interpolateTemplate', () => {
  it('should replace dynamic placeholders with variable values', () => {
    const template = 'Hello {{user.name}}, your deck {{deck.title}} has been reviewed.';
    const variables = { 'user.name': 'Urza', 'deck.title': 'Mono Blue Control' };
    const result = interpolateTemplate(template, variables);
    expect(result).toBe('Hello Urza, your deck Mono Blue Control has been reviewed.');
  });

  it('should retain unknown placeholders unchanged', () => {
    const template = 'Ticket {{ticket.id}} status: {{unknown.field}}';
    const variables = { 'ticket.id': 'TCK-101' };
    const result = interpolateTemplate(template, variables);
    expect(result).toBe('Ticket TCK-101 status: {{unknown.field}}');
  });
});
```

- [ ] **Step 2: Implement domain models and `interpolateTemplate`**

Create `mana-forge-frontdesk/src/core/domain/ticket.ts`:
```typescript
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'DECK_BUILDER' | 'AI_ANALYSIS' | 'RULES_FORMAT' | 'ACCOUNT' | 'OTHER';

export interface TicketMessage {
  id: string;
  sender: 'OPERATOR' | 'USER' | 'SYSTEM';
  senderName: string;
  content: string;
  createdAt: string;
  isInternalNote?: boolean;
}

export interface Ticket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  metadata?: {
    deckId?: string;
    deckTitle?: string;
    format?: string;
  };
}
```

Create `mana-forge-frontdesk/src/core/domain/user.ts`:
```typescript
export type UserTier = 'FREE' | 'PRO' | 'PATREON';

export interface UserSummaryDeck {
  id: string;
  name: string;
  format: string;
  cardCount: number;
  updatedAt: string;
}

export interface User360 {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  tier: UserTier;
  createdAt: string;
  lastLoginAt: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  stats: {
    totalDecks: number;
    aiQueriesThisMonth: number;
    aiQuotaLimit: number;
    failedImportsCount: number;
  };
  recentDecks: UserSummaryDeck[];
  openTicketsCount: number;
}
```

Create `mana-forge-frontdesk/src/core/domain/email.ts`:
```typescript
export interface EmailTemplate {
  id: string;
  title: string;
  category: string;
  subject: string;
  bodyTemplate: string;
  availableMacros: string[];
}

export interface SendEmailPayload {
  to: string;
  recipientName: string;
  subject: string;
  body: string;
  templateId?: string;
  ticketId?: string;
}

export function interpolateTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
}
```

Create `mana-forge-frontdesk/src/core/domain/audit.ts`:
```typescript
export type AuditAction = 
  | 'USER_LOGIN'
  | 'USER_STATUS_UPDATE'
  | 'AI_QUOTA_RESET'
  | 'TICKET_CREATED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_NOTE_ADDED'
  | 'EMAIL_SENT'
  | 'DECK_IMPORT_FAILED';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: 'OPERATOR' | 'USER' | 'SYSTEM';
  };
  targetUserId?: string;
  targetUserName?: string;
  action: AuditAction;
  details: string;
  metadata?: Record<string, unknown>;
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd mana-forge-frontdesk && npm test src/core/domain/email.test.ts`
Expected: PASS

---

### Task 3: Ports & In-Memory Mock Adapters with Seeds

**Files:**
- Create: `mana-forge-frontdesk/src/core/ports/ticket-repository.port.ts`
- Create: `mana-forge-frontdesk/src/core/ports/user-repository.port.ts`
- Create: `mana-forge-frontdesk/src/core/ports/email-service.port.ts`
- Create: `mana-forge-frontdesk/src/core/ports/audit-repository.port.ts`
- Create: `mana-forge-frontdesk/src/infrastructure/mocks/seeds/seed-users.ts`
- Create: `mana-forge-frontdesk/src/infrastructure/mocks/seeds/seed-tickets.ts`
- Create: `mana-forge-frontdesk/src/infrastructure/mocks/seeds/seed-templates.ts`
- Create: `mana-forge-frontdesk/src/infrastructure/mocks/seeds/seed-audit.ts`
- Create: `mana-forge-frontdesk/src/infrastructure/mocks/mock-ticket-repository.ts`
- Create: `mana-forge-frontdesk/src/infrastructure/mocks/mock-user-repository.ts`
- Create: `mana-forge-frontdesk/src/infrastructure/mocks/mock-email-service.ts`
- Create: `mana-forge-frontdesk/src/infrastructure/mocks/mock-audit-repository.ts`
- Test: `mana-forge-frontdesk/src/infrastructure/mocks/mock-repositories.test.ts`

**Interfaces:**
- Consumes: Domain types from `src/core/domain/*`
- Produces: `ITicketRepository`, `IUserRepository`, `IEmailService`, `IAuditRepository`
- Produces: Mock classes implementing each port with simulated latency and storage sync.

- [ ] **Step 1: Write failing tests for mock repositories**

```typescript
// mana-forge-frontdesk/src/infrastructure/mocks/mock-repositories.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MockTicketRepository } from './mock-ticket-repository';
import { MockUserRepository } from './mock-user-repository';

describe('Mock Repositories', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should list initial seed tickets', async () => {
    const repo = new MockTicketRepository();
    const tickets = await repo.list();
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0]).toHaveProperty('id');
    expect(tickets[0]).toHaveProperty('subject');
  });

  it('should add message to ticket and update status', async () => {
    const repo = new MockTicketRepository();
    const tickets = await repo.list();
    const ticketId = tickets[0].id;

    const updated = await repo.addMessage(ticketId, {
      sender: 'OPERATOR',
      senderName: 'Support Agent',
      content: 'We are investigating your Premodern legality question.',
      isInternalNote: false,
    });

    expect(updated.messages.some(m => m.content.includes('Premodern legality'))).toBe(true);
  });

  it('should search users by username or email', async () => {
    const userRepo = new MockUserRepository();
    const results = await userRepo.search('mishra');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].username.toLowerCase()).toContain('mishra');
  });

  it('should reset AI quota for a user', async () => {
    const userRepo = new MockUserRepository();
    const users = await userRepo.search('urza');
    const user = users[0];
    const updated = await userRepo.resetAiQuota(user.id);
    expect(updated.stats.aiQueriesThisMonth).toBe(0);
  });
});
```

- [ ] **Step 2: Create Port interfaces**

Define ports in `src/core/ports/`:
- `ticket-repository.port.ts`: `list`, `getById`, `createTicket`, `addMessage`, `updateStatus`, `assignOperator`.
- `user-repository.port.ts`: `search`, `getById`, `updateStatus`, `resetAiQuota`.
- `email-service.port.ts`: `listTemplates`, `sendEmail`, `renderTemplate`.
- `audit-repository.port.ts`: `list`, `logEvent`.

- [ ] **Step 3: Create realistic MtG seed datasets**

Create realistic seeds:
- Users: `urza@manaforge.gg` (PRO tier, 18 decks, high AI usage), `mishra@manaforge.gg` (FREE tier, reached monthly limit, 2 import failures), `teferi@manaforge.gg` (PATREON tier).
- Tickets:
  - *"AI sideboard suggestions include Modern-only cards for Premodern deck"* (HIGH priority, assigned to Operator).
  - *"Deck import fails when text has Scryfall card IDs"* (MEDIUM priority, OPEN).
  - *"Quota reset request after testing AI combo analysis"* (RESOLVED).
- Email Templates:
  - *"AI Quota Reset Notification"*: `Hello {{user.name}}, your monthly AI query limit has been refreshed...`
  - *"Format Legality Clarification"*: `Hi {{user.name}}, regarding your deck {{deck.title}}, the cards flagged...`
- Audit Entries: Logins, quota adjustments, ticket creation logs.

- [ ] **Step 4: Implement mock repositories with localStorage support**

Implement `MockTicketRepository`, `MockUserRepository`, `MockEmailService`, and `MockAuditRepository`.
Each reads/writes from memory cache and syncs to `localStorage` under `mana_forge_frontdesk_*` keys.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd mana-forge-frontdesk && npm test src/infrastructure/mocks/mock-repositories.test.ts`
Expected: PASS

---

### Task 4: Service Container & React Query Hooks

**Files:**
- Create: `mana-forge-frontdesk/src/infrastructure/container.ts`
- Create: `mana-forge-frontdesk/src/hooks/use-tickets.ts`
- Create: `mana-forge-frontdesk/src/hooks/use-users.ts`
- Create: `mana-forge-frontdesk/src/hooks/use-emails.ts`
- Create: `mana-forge-frontdesk/src/hooks/use-audit.ts`
- Test: `mana-forge-frontdesk/src/hooks/use-tickets.test.tsx`

**Interfaces:**
- Consumes: Ports and mock repository implementations.
- Produces: `container` exposing singleton port instances.
- Produces: React Query custom hooks (`useTickets`, `useTicket`, `useAddTicketMessage`, `useUpdateTicketStatus`, `useUserSearch`, `useUser`, `useResetAiQuota`, `useEmailTemplates`, `useSendEmail`, `useAuditLog`).

- [ ] **Step 1: Write failing tests for ticket hooks**

```typescript
// mana-forge-frontdesk/src/hooks/use-tickets.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { useTickets } from './use-tickets';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTickets', () => {
  it('should fetch tickets successfully', async () => {
    const { result } = renderHook(() => useTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement container and custom hooks**

Create `src/infrastructure/container.ts`:
```typescript
import { ITicketRepository } from '../core/ports/ticket-repository.port';
import { IUserRepository } from '../core/ports/user-repository.port';
import { IEmailService } from '../core/ports/email-service.port';
import { IAuditRepository } from '../core/ports/audit-repository.port';
import { MockTicketRepository } from './mocks/mock-ticket-repository';
import { MockUserRepository } from './mocks/mock-user-repository';
import { MockEmailService } from './mocks/mock-email-service';
import { MockAuditRepository } from './mocks/mock-audit-repository';

class ServiceContainer {
  public ticketRepo: ITicketRepository = new MockTicketRepository();
  public userRepo: IUserRepository = new MockUserRepository();
  public emailService: IEmailService = new MockEmailService();
  public auditRepo: IAuditRepository = new MockAuditRepository();
}

export const container = new ServiceContainer();
```

Implement hooks in `src/hooks/` wrapping `container.*` operations using `@tanstack/react-query`.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd mana-forge-frontdesk && npm test src/hooks/use-tickets.test.tsx`
Expected: PASS

---

### Task 5: Layout, Shell & Navigation Components

**Files:**
- Create: `mana-forge-frontdesk/src/components/layout/Sidebar.tsx`
- Create: `mana-forge-frontdesk/src/components/layout/Header.tsx`
- Create: `mana-forge-frontdesk/src/components/layout/Omnibox.tsx`
- Create: `mana-forge-frontdesk/src/components/ui/StatusBadge.tsx`
- Create: `mana-forge-frontdesk/src/components/ui/PriorityBadge.tsx`
- Test: `mana-forge-frontdesk/src/components/layout/Omnibox.test.tsx`

**Interfaces:**
- Produces: Navigation shell with responsive collapsible sidebar, top bar with quick actions, and global `Cmd+K` Omnibox modal for searching users and tickets.

- [ ] **Step 1: Write failing test for Omnibox**

```typescript
// mana-forge-frontdesk/src/components/layout/Omnibox.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { Omnibox } from './Omnibox';

describe('Omnibox', () => {
  it('should render search input and call onSearch when typing', () => {
    const onSearch = vi.fn();
    render(<Omnibox isOpen={true} onClose={() => {}} onSelect={() => {}} />);
    const input = screen.getByPlaceholderText(/search users, tickets/i);
    fireEvent.change(input, { target: { value: 'urza' } });
    expect(screen.getByDisplayValue('urza')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement Layout & Badges**

Create:
- `StatusBadge.tsx`: Visual badge with styling for `OPEN`, `IN_PROGRESS`, `WAITING_USER`, `RESOLVED`, `CLOSED`.
- `PriorityBadge.tsx`: Badges for `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- `Sidebar.tsx`: Navigation items (`Tickets`, `Users 360`, `Email Outreach`, `Audit Log`) with active state indicators and count badges.
- `Header.tsx`: Operator profile snippet, environment indicator (`MOCK MODE`), and `Search (Cmd+K)` button.
- `Omnibox.tsx`: Modal overlay triggered on `Cmd+K` / `Ctrl+K` displaying instant search results across users and tickets.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd mana-forge-frontdesk && npm test src/components/layout/Omnibox.test.tsx`
Expected: PASS

---

### Task 6: Tickets Module (Triage Table, Detail & Conversation Thread)

**Files:**
- Create: `mana-forge-frontdesk/src/components/tickets/TicketList.tsx`
- Create: `mana-forge-frontdesk/src/components/tickets/TicketFilter.tsx`
- Create: `mana-forge-frontdesk/src/components/tickets/TicketDetail.tsx`
- Create: `mana-forge-frontdesk/src/components/tickets/ReplyBox.tsx`
- Create: `mana-forge-frontdesk/src/views/TicketsView.tsx`
- Test: `mana-forge-frontdesk/src/components/tickets/TicketDetail.test.tsx`

**Interfaces:**
- Consumes: `useTickets`, `useTicket`, `useAddTicketMessage`, `useUpdateTicketStatus`
- Produces: Ticket management view with search filters, status tabs, message history with internal notes flag, and reply submission.

- [ ] **Step 1: Write failing test for TicketDetail**

```typescript
// mana-forge-frontdesk/src/components/tickets/TicketDetail.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { TicketDetail } from './TicketDetail';
import { Ticket } from '../../core/domain/ticket';

const mockTicket: Ticket = {
  id: 'TCK-001',
  userId: 'USR-01',
  userName: 'Urza Planeswalker',
  userEmail: 'urza@manaforge.gg',
  subject: 'Legality check failed for Premodern deck',
  category: 'DECK_BUILDER',
  priority: 'HIGH',
  status: 'OPEN',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: 'MSG-01',
      sender: 'USER',
      senderName: 'Urza Planeswalker',
      content: 'Why is Gilded Drake flagged in Premodern?',
      createdAt: new Date().toISOString(),
    },
  ],
};

describe('TicketDetail', () => {
  it('should display ticket details and messages', () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onAddMessage={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );
    expect(screen.getByText(/Legality check failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Why is Gilded Drake flagged/i)).toBeInTheDocument();
  });

  it('should allow toggling internal note mode in reply', () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onAddMessage={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );
    const internalCheckbox = screen.getByLabelText(/internal note/i);
    expect(internalCheckbox).not.toBeChecked();
    fireEvent.click(internalCheckbox);
    expect(internalCheckbox).toBeChecked();
  });
});
```

- [ ] **Step 2: Implement Ticket components**

- `TicketFilter.tsx`: Filters for status (`ALL`, `OPEN`, `IN_PROGRESS`, `RESOLVED`), priority, and category.
- `TicketList.tsx`: Responsive table with ticket IDs, user details, category badges, date, and unread indicator.
- `ReplyBox.tsx`: Rich text area with "Internal Note" toggle checkbox, shortcut hints, and Submit button.
- `TicketDetail.tsx`: Comprehensive header with status selector, assignee dropdown, conversation stream (styling operator, user, and internal notes distinctively), and `ReplyBox`.
- `TicketsView.tsx`: Split layout with ticket list on the left and active ticket conversation on the right.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd mana-forge-frontdesk && npm test src/components/tickets/TicketDetail.test.tsx`
Expected: PASS

---

### Task 7: User 360 Module (Profile Inspector, AI Quota & Deck List)

**Files:**
- Create: `mana-forge-frontdesk/src/components/users/UserCard.tsx`
- Create: `mana-forge-frontdesk/src/components/users/User360View.tsx`
- Create: `mana-forge-frontdesk/src/components/users/QuotaMeter.tsx`
- Create: `mana-forge-frontdesk/src/components/users/DeckMiniList.tsx`
- Create: `mana-forge-frontdesk/src/views/UsersView.tsx`
- Test: `mana-forge-frontdesk/src/components/users/User360View.test.tsx`

**Interfaces:**
- Consumes: `useUsers`, `useUser`, `useResetAiQuota`
- Produces: User 360 inspector with membership tier, monthly AI quota meter with reset action button, deck list, and status ban/suspend controls.

- [ ] **Step 1: Write failing test for User360View**

```typescript
// mana-forge-frontdesk/src/components/users/User360View.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { User360View } from './User360View';
import { User360 } from '../../core/domain/user';

const mockUser: User360 = {
  id: 'USR-01',
  email: 'urza@manaforge.gg',
  username: 'Urza',
  tier: 'PRO',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: '2026-10-08T10:00:00Z',
  stats: {
    totalDecks: 14,
    aiQueriesThisMonth: 95,
    aiQuotaLimit: 100,
    failedImportsCount: 1,
  },
  recentDecks: [
    { id: 'DK-01', name: 'Mono Blue Tide', format: 'Premodern', cardCount: 60, updatedAt: '2026-10-07' }
  ],
  openTicketsCount: 1,
};

describe('User360View', () => {
  it('should render user statistics and tier badge', () => {
    render(<User360View user={mockUser} onResetQuota={vi.fn()} onUpdateStatus={vi.fn()} />);
    expect(screen.getByText('Urza')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText(/95 \/ 100/)).toBeInTheDocument();
  });

  it('should trigger quota reset handler on button click', () => {
    const onResetQuota = vi.fn();
    render(<User360View user={mockUser} onResetQuota={onResetQuota} onUpdateStatus={vi.fn()} />);
    const button = screen.getByRole('button', { name: /reset quota/i });
    fireEvent.click(button);
    expect(onResetQuota).toHaveBeenCalledWith('USR-01');
  });
});
```

- [ ] **Step 2: Implement User 360 components**

- `QuotaMeter.tsx`: Progress bar indicating AI queries consumed vs monthly limit with color thresholding (green < 80%, yellow 80-99%, red at 100%).
- `DeckMiniList.tsx`: Compact cards displaying recent deck titles, format pills (e.g. Premodern), card counts, and direct links.
- `UserCard.tsx`: Summary card used in grid/list searches.
- `User360View.tsx`: Full dossier view showing account details, activity KPIs, ban/suspend controls, and the quota reset button.
- `UsersView.tsx`: Search bar with instant results list and side-by-side User 360 dossier.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd mana-forge-frontdesk && npm test src/components/users/User360View.test.tsx`
Expected: PASS

---

### Task 8: Email Outreach & Template Macro Engine

**Files:**
- Create: `mana-forge-frontdesk/src/components/emails/TemplateSelector.tsx`
- Create: `mana-forge-frontdesk/src/components/emails/MacroPreview.tsx`
- Create: `mana-forge-frontdesk/src/components/emails/EmailComposer.tsx`
- Create: `mana-forge-frontdesk/src/views/EmailOutreachView.tsx`
- Test: `mana-forge-frontdesk/src/components/emails/EmailComposer.test.tsx`

**Interfaces:**
- Consumes: `useEmailTemplates`, `useSendEmail`
- Produces: Email dispatch interface supporting template selection, dynamic variable form inputs, live preview, and dispatch action.

- [ ] **Step 1: Write failing test for EmailComposer**

```typescript
// mana-forge-frontdesk/src/components/emails/EmailComposer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { EmailComposer } from './EmailComposer';
import { EmailTemplate } from '../../core/domain/email';

const mockTemplate: EmailTemplate = {
  id: 'TPL-01',
  title: 'AI Quota Restored',
  category: 'SUPPORT',
  subject: 'Your AI Quota on Mana Forge has been reset',
  bodyTemplate: 'Dear {{user.name}},\n\nYour limit has been restored.',
  availableMacros: ['user.name'],
};

describe('EmailComposer', () => {
  it('should render template fields and live preview', () => {
    render(<EmailComposer templates={[mockTemplate]} onSend={vi.fn()} />);
    const recipientInput = screen.getByLabelText(/recipient email/i);
    fireEvent.change(recipientInput, { target: { value: 'mishra@manaforge.gg' } });
    expect(screen.getByDisplayValue('mishra@manaforge.gg')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement Email Outreach components**

- `TemplateSelector.tsx`: Dropdown / pill selector with template categories (Support, Welcome, Policy, Feature Announcement).
- `MacroPreview.tsx`: Side-by-side live preview showing rendered HTML/Markdown after substituting variable inputs.
- `EmailComposer.tsx`: Full email drafting interface with Recipient input, Subject, Macro chips (clicking inserts variable tag), and Send button with loading state.
- `EmailOutreachView.tsx`: View container integrating template picker, composer, and recent dispatch history.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd mana-forge-frontdesk && npm test src/components/emails/EmailComposer.test.tsx`
Expected: PASS

---

### Task 9: Audit Trail Module & Main App Integration

**Files:**
- Create: `mana-forge-frontdesk/src/components/audit/AuditTimeline.tsx`
- Create: `mana-forge-frontdesk/src/components/audit/AuditFilter.tsx`
- Create: `mana-forge-frontdesk/src/views/AuditView.tsx`
- Create: `mana-forge-frontdesk/src/views/DashboardView.tsx`
- Create: `mana-forge-frontdesk/src/App.tsx`
- Create: `mana-forge-frontdesk/src/main.tsx`
- Test: `mana-forge-frontdesk/src/App.test.tsx`

**Interfaces:**
- Consumes: All views and navigation layout.
- Produces: Fully integrated application with routing, state persistence reset button, and end-to-end user navigation.

- [ ] **Step 1: Write failing integration test for App**

```typescript
// mana-forge-frontdesk/src/App.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Integration', () => {
  it('should render the application dashboard with navigation', async () => {
    render(<App />);
    expect(screen.getByText(/Mana Forge Frontdesk/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tickets/i })).toBeInTheDocument();
  });

  it('should switch views when navigation links are clicked', async () => {
    render(<App />);
    const usersBtn = screen.getByRole('button', { name: /users 360/i });
    fireEvent.click(usersBtn);
    expect(screen.getByPlaceholderText(/search users by username/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement Audit & Dashboard Views and App Shell**

- `AuditTimeline.tsx`: Chronological stream showing operator/user icons, action badges, timestamps, and expandable payload details.
- `AuditFilter.tsx`: Category filter buttons for logins, quota changes, ticket status updates, and emails.
- `DashboardView.tsx`: KPI widgets (Open Tickets, AI Quotas Exceeded, Daily Inquiries, Active Users) and quick triage queues.
- `App.tsx`: App wrapper with `QueryClientProvider`, navigation state, header, sidebar, omnibox shortcut listener (`Cmd+K`), and view switcher.
- `main.tsx`: Standard React 19 entry point mounting `App` into `#root`.

- [ ] **Step 3: Run integration test and full test suite**

Run: `cd mana-forge-frontdesk && npm test`
Expected: ALL PASS
