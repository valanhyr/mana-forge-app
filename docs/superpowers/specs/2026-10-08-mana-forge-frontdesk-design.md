# Mana Forge Frontdesk — System Architecture & Design Spec

**Date:** 2026-10-08  
**Status:** Approved  
**Scope:** Standalone Internal Backoffice Application (`mana-forge-frontdesk`) for Customer Relationship, Support Tickets, User 360, Email Outreach, and Audit Logs.

---

## 1. Overview & Context

Mana Forge is a platform for Magic: The Gathering deck analysis and AI-assisted optimization (specifically Premodern and related formats). The ecosystem consists of:
- `mana-forge-web` (React 19 + TypeScript frontend)
- `mana-forge-api` (Spring Boot Java backend)
- `mana-forge-engine` (FastAPI Python AI engine)

To manage customer relations, technical assistance, support tickets, email communication, and operational traceability, we are introducing **`mana-forge-frontdesk`**.

In Phase 1, `mana-forge-frontdesk` is built as an independent frontend application powered by an in-memory Hexagonal/Ports-and-Adapters layer with realistic mock seeds. In Phase 2, backend API endpoints will be implemented in `mana-forge-api` and plugged in via HTTP adapters without requiring changes to UI components or business hooks.

---

## 2. Key Objectives & Scope

### Goals (Phase 1)
- **Independent Application:** Scaffolding in `mana-forge-frontdesk/` with modern tooling (React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Query).
- **Decoupled Architecture:** Strict separation between domain contracts (`ports`) and data sources (`adapters`), managed through a service container (`container.ts`).
- **Support Ticket Management:** Ticket overview, status tracking, priority, tagging, search, internal notes, and user conversation threads.
- **User 360 View:** Comprehensive profile inspector showing account details, membership tier, recent decks, AI quota consumption, flags, and incident history.
- **Email Outreach & Response Macros:** Email composer with pre-configured templates and dynamic macros (`{{user.name}}`, `{{deck.url}}`, `{{ticket.id}}`).
- **Audit & Activity Log:** Immutable audit trail capturing user lifecycle events and operator actions.
- **Realistic Mocks:** In-memory repository implementations with pre-loaded MtG-related test scenarios and localStorage persistence for state retention during development.

### Non-Goals (Phase 1)
- Live backend Spring Boot endpoints (deferred to Phase 2).
- Production authentication server handshake (a mock operator session is provided in Phase 1).

---

## 3. System Architecture & Folder Layout

The project lives alongside the existing services in the root monorepo:

```text
mana-forge-frontdesk/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── core/
│   │   ├── domain/               # Pure domain entities and value objects
│   │   │   ├── ticket.ts
│   │   │   ├── user.ts
│   │   │   ├── email.ts
│   │   │   └── audit.ts
│   │   └── ports/                # Contract interfaces
│   │       ├── ticket-repository.port.ts
│   │       ├── user-repository.port.ts
│   │       ├── email-service.port.ts
│   │       └── audit-repository.port.ts
│   ├── infrastructure/
│   │   ├── config.ts             # Environment configuration (VITE_USE_MOCKS)
│   │   ├── container.ts          # Dependency Injection / Service Locator
│   │   ├── mocks/                # In-memory mock implementations & seed data
│   │   │   ├── seeds/
│   │   │   │   ├── seed-users.ts
│   │   │   │   ├── seed-tickets.ts
│   │   │   │   ├── seed-templates.ts
│   │   │   │   └── seed-audit.ts
│   │   │   ├── mock-ticket-repository.ts
│   │   │   ├── mock-user-repository.ts
│   │   │   ├── mock-email-service.ts
│   │   │   └── mock-audit-repository.ts
│   │   └── api/                  # HTTP client adapters (stubs for Phase 2)
│   │       ├── http-ticket-repository.ts
│   │       ├── http-user-repository.ts
│   │       ├── http-email-service.ts
│   │       └── http-audit-repository.ts
│   ├── hooks/                    # Query/Mutation hooks wrapping the ports
│   │   ├── use-tickets.ts
│   │   ├── use-users.ts
│   │   ├── use-emails.ts
│   │   └── use-audit.ts
│   ├── components/
│   │   ├── layout/               # Sidebar, Header, Omnibox, StatusBadge
│   │   ├── ui/                   # Button, Card, Modal, Input, Badge, Table, Toast
│   │   ├── tickets/              # TicketList, TicketFilter, TicketDetail, ReplyBox
│   │   ├── users/                # UserCard, User360Modal, DeckMiniList, QuotaMeter
│   │   ├── emails/               # TemplateSelector, MacroPreview, EmailComposer
│   │   └── audit/                # AuditTimeline, AuditFilter
│   └── views/                    # Top-level view routes
│       ├── DashboardView.tsx
│       ├── TicketsView.tsx
│       ├── UsersView.tsx
│       ├── EmailOutreachView.tsx
│       └── AuditView.tsx
```

---

## 4. Domain Entities & Contract Definitions

### 4.1 Domain Models (`src/core/domain/`)

```typescript
// ticket.ts
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

// user.ts
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

// email.ts
export interface EmailTemplate {
  id: string;
  title: string;
  category: string;
  subject: string;
  bodyTemplate: string; // Supports placeholders like {{user.name}}, {{deck.title}}
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

// audit.ts
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

### 4.2 Ports (`src/core/ports/`)

```typescript
export interface ITicketRepository {
  list(filters?: { status?: TicketStatus; priority?: TicketPriority; query?: string }): Promise<Ticket[]>;
  getById(id: string): Promise<Ticket | null>;
  createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>, initialMessage: string): Promise<Ticket>;
  addMessage(ticketId: string, message: Omit<TicketMessage, 'id' | 'createdAt'>): Promise<Ticket>;
  updateStatus(ticketId: string, status: TicketStatus): Promise<Ticket>;
  assignOperator(ticketId: string, operatorId: string, operatorName: string): Promise<Ticket>;
}

export interface IUserRepository {
  search(query: string): Promise<User360[]>;
  getById(id: string): Promise<User360 | null>;
  updateStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'): Promise<User360>;
  resetAiQuota(userId: string): Promise<User360>;
}

export interface IEmailService {
  listTemplates(): Promise<EmailTemplate[]>;
  sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId: string }>;
  renderTemplate(templateId: string, variables: Record<string, string>): Promise<{ subject: string; body: string }>;
}

export interface IAuditRepository {
  list(filters?: { targetUserId?: string; action?: AuditAction; limit?: number }): Promise<AuditEntry[]>;
  logEvent(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry>;
}
```

---

## 5. Mock & Dependency Injection Strategy

1. **Service Container (`src/infrastructure/container.ts`):**  
   Reads `import.meta.env.VITE_USE_MOCKS` (defaults to `true`).  
   Exports instances adhering to the ports (`ticketRepository`, `userRepository`, `emailService`, `auditRepository`).
2. **In-Memory Store with Storage Fallback:**  
   The mock repositories initialize with realistic MtG-themed fixtures and sync state changes to `localStorage` key `mana_forge_frontdesk_store` to allow persistence across hot reloads. A "Reset to Factory Seeds" utility is provided in the development UI.
3. **Artificial Latency:**  
   Configurable 200ms delay to exercise loading indicators, skeleton states, and optimistic updates.

---

## 6. User Interface & Operator Experience

- **Modern Clean Dark/Slate Theme:** Aligned with Mana Forge's slate-gray aesthetic, featuring high contrast for administrative efficiency.
- **Top Bar Omnibox (`Cmd+K` / `Ctrl+K`):** Global fast-lookup across user names, email addresses, and ticket IDs.
- **Tabular & KanBan Views for Tickets:** Switch between triage table view and priority-based columns.
- **User 360 Drawer:** Instant right-sidebar inspection of any user with deck quick-links and quota metrics.
- **Interactive Email Template Preview:** Side-by-side template selection with live variable substitution and markdown rendering.
- **Audit Feed:** Chronological streaming log with instant category filters.

---

## 7. Testing Strategy

- **Unit Tests:** Vitest suites validating domain rules, template variable substitution, and mock repository CRUD behaviors.
- **Component Tests:** React Testing Library verifying user workflows:
  - Filtering and claiming tickets.
  - Submitting internal operator notes.
  - Viewing User 360 details and resetting quotas.
  - Selecting an email template and inspecting rendered output.
- **Architectural Conformance:** Ports interface assertions ensuring zero coupling to external HTTP libraries in core layers.

---

## 8. Integration Roadmap (Phase 2)

When Spring Boot backend endpoints are implemented:
1. Implement `http-*-repository.ts` using Axios with JWT interceptors.
2. Flip `VITE_USE_MOCKS=false` in `.env`.
3. Verify zero regressions in UI components and React Query hooks.
