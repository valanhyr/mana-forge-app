import { Operator } from '../domain/operator';

export interface IAuthService {
  currentOperator(): Promise<Operator>;
  signIn(username: string, password: string): Promise<Operator>;
  signOut(): Promise<void>;
  googleLoginUrl(): string;
  onAccessFailure(listener: (status: number) => void): () => void;
}
