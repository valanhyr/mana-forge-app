export interface User {
  userId: string;
  name: string;
  username: string;
  email: string;
  pendingEmail?: string | null;
  canChangeEmail?: boolean | null;
  biography: string;
  friends: string[];
  avatar: string;
  betaAccepted?: boolean;
}
