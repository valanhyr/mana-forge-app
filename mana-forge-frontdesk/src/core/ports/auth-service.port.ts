import { Operator } from '../domain/operator';

export type LoginStep = { status: 'TOTP_REQUIRED' | 'ENROLLMENT_REQUIRED'; challenge: string };
export type EnrollmentStart = { secret: string; otpauthUri: string };
export type EnrollmentResult = { operator: Operator; recoveryCodes: string[] };

export interface IAuthService {
  currentOperator(): Promise<Operator>;
  /** Password step only: returns a short-lived challenge, never a session. */
  signIn(email: string, password: string): Promise<LoginStep>;
  verifyTotp(challenge: string, code: string): Promise<Operator>;
  verifyRecovery(challenge: string, code: string): Promise<Operator>;
  startEnrollment(challenge: string): Promise<EnrollmentStart>;
  confirmEnrollment(challenge: string, code: string): Promise<EnrollmentResult>;
  signOut(): Promise<void>;
  onAccessFailure(listener: (status: number) => void): () => void;
}
