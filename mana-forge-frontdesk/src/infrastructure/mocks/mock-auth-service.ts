import { IAuthService } from '../../core/ports/auth-service.port';
import { Operator } from '../../core/domain/operator';

export class MockAuthService implements IAuthService {
  async currentOperator(): Promise<Operator> { return { id: 'demo-operator', name: 'Jace Beleren (Demo)', role: 'OPERATOR' }; }
  async signIn(_username: string, _password: string) { return this.currentOperator(); }
  async signOut() {}
  googleLoginUrl() { return ''; }
  onAccessFailure(_listener: (status: number) => void) { return () => {}; }
}
