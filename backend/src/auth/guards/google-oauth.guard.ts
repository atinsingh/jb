import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (request.path?.endsWith('/google/callback')) {
      return {
        session: false,
        failureRedirect: `${frontendUrl}/login?error=google_auth_failed`,
      };
    }

    // Carry the intended role (e.g. from an employer signup) through the OAuth
    // round-trip as `state`; Google echoes it back on the callback so a new
    // user can be created with the correct role.
    const role = request.query?.role;
    return {
      scope: ['profile', 'email'],
      prompt: 'select_account',
      session: false,
      ...(role ? { state: String(role) } : {}),
    };
  }
}
