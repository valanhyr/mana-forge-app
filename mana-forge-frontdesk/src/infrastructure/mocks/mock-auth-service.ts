import { EnrollmentResult, EnrollmentStart, IAuthService, LoginStep } from '../../core/ports/auth-service.port';
import { Operator } from '../../core/domain/operator';

export class MockAuthService implements IAuthService {
  async currentOperator(): Promise<Operator> { return { id: 'demo-operator', name: 'Jace Beleren (Demo)', role: 'OPERATOR' }; }
  async signIn(_email: string, _password: string): Promise<LoginStep> { return { status: 'TOTP_REQUIRED', challenge: 'demo' }; }
  async verifyTotp(_challenge: string, _code: string) { return this.currentOperator(); }
  async verifyRecovery(_challenge: string, _code: string) { return this.currentOperator(); }
  async startEnrollment(_challenge: string): Promise<EnrollmentStart> { return { secret: 'DEMODEMODEMODEMO', otpauthUri: 'otpauth://totp/demo' }; }
  async confirmEnrollment(_challenge: string, _code: string): Promise<EnrollmentResult> {
    return { operator: await this.currentOperator(), recoveryCodes: ['DEMO-DEMO-DEMO-DEMO'] };
  }
  async signOut() {}
  onAccessFailure(_listener: (status: number) => void) { return () => {}; }
}
