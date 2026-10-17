export interface PublicUser {
  userId: string;
  name: string;
  username: string;
  biography: string;
  avatar: string;
}

export interface User extends PublicUser {
  email: string;
  friends: string[];
  pendingEmail: string | null;
  canChangeEmail: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  betaAccepted?: boolean;
  newsletterSubscribed?: boolean;
}

/** Older API responses have no dates; absence never means "now". */
export const normalizeUser = (user: User): User => ({
  ...user,
  createdAt: user.createdAt ?? null,
  updatedAt: user.updatedAt ?? null,
  lastLoginAt: user.lastLoginAt ?? null,
});
