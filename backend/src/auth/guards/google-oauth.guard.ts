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

    return {
      scope: ['profile', 'email'],
      prompt: 'select_account',
      session: false,
    };
  }
}
