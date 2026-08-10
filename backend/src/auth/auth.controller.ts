import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  Res,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth' })
  @ApiExcludeEndpoint()
  async googleAuth() {
    this.logger.log('🟢 [Google OAuth] Initiate request received');
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback endpoint' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with token' })
  @ApiExcludeEndpoint()
  async googleAuthCallback(@Request() req, @Res() res: Response) {
    this.logger.log('🟢 [Google Callback] Callback received');
    this.logger.debug(`🟢 [Google Callback] Request user: ${req.user ? 'Present' : 'Missing'}`);

    if (!req.user) {
      this.logger.error('❌ [Google Callback] No user data in request');
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=no_user_data`,
      );
    }

    const user = req.user as any;
    this.logger.log(`🟢 [Google Callback] User ID: ${user._id}`);
    this.logger.log(`🟢 [Google Callback] User email: ${user.email}`);
    this.logger.log(`🟢 [Google Callback] User name: ${user.name}`);

    try {
      const token = this.authService.generateToken(user);
      this.logger.debug(`🟢 [Google Callback] Token generated, length: ${token.length}`);

      const userData = {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      };
      this.logger.debug(`🟢 [Google Callback] User data to send: ${JSON.stringify(userData)}`);

      const encodedUser = encodeURIComponent(JSON.stringify(userData));
      this.logger.debug(`🟢 [Google Callback] Encoded user length: ${encodedUser.length}`);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/success?token=${token}&user=${encodedUser}`;

      this.logger.log(`🟢 [Google Callback] Frontend URL: ${frontendUrl}`);
      this.logger.debug(`🟢 [Google Callback] Redirect URL length: ${redirectUrl.length}`);

      res.redirect(redirectUrl);
      this.logger.log('🟢 [Google Callback] Redirect sent successfully');
    } catch (error: any) {
      this.logger.error('❌ [Google Callback] Error generating token or redirecting', error.stack);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }

  @Get('linkedin')
  @ApiOperation({ summary: 'Initiate LinkedIn OAuth authentication' })
  @ApiResponse({ status: 302, description: 'Redirects to LinkedIn OAuth' })
  @ApiExcludeEndpoint()
  async linkedinAuth(@Query('role') role: string, @Res() res: Response) {
    const linkedinAuthUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    // `state` doubles as a CSRF token and role carrier. It embeds a
    // cryptographically random nonce (unguessable, unlike the old fixed
    // 'ROLE_EMPLOYER' constant) alongside the intended role, which LinkedIn
    // echoes back on the callback. Only ROLE_EMPLOYER intent is honored;
    // everything else falls back to candidate.
    const intendedRole = role === 'ROLE_EMPLOYER' ? 'ROLE_EMPLOYER' : 'ROLE_CANDIDATE';
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = Buffer.from(
      JSON.stringify({ nonce, role: intendedRole }),
    ).toString('base64url');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:8000/api/auth/linkedin/callback',
      scope: 'openid profile email',
      state,
    });

    res.redirect(`${linkedinAuthUrl}?${params.toString()}`);
  }

  @Get('linkedin/callback')
  @ApiOperation({ summary: 'LinkedIn OAuth callback endpoint' })
  @ApiQuery({ name: 'code', required: false, description: 'Authorization code from LinkedIn' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with token' })
  @ApiExcludeEndpoint()
  async linkedinCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    this.logger.log('🔵 [LinkedIn Callback] Callback received');

    if (!code) {
      this.logger.error('❌ [LinkedIn Callback] No authorization code received');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=linkedin_auth_failed`);
    }

    try {
      const intendedRole = this.parseRoleFromState(state);
      const user = await this.authService.handleLinkedInCallback(code, intendedRole);
      const token = this.authService.generateToken(user);
      
      const userData = {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      };

      const encodedUser = encodeURIComponent(JSON.stringify(userData));
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/success?token=${token}&user=${encodedUser}`;

      this.logger.log('🔵 [LinkedIn Callback] Authentication successful');
      res.redirect(redirectUrl);
    } catch (error: any) {
      this.logger.error('❌ [LinkedIn Callback] Error processing callback', error.stack);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=linkedin_auth_failed`);
    }
  }

  /**
   * Extract the intended role from the OAuth `state` value produced by
   * linkedinAuth (base64url of `{ nonce, role }`). Only ROLE_EMPLOYER is
   * honored as an elevated intent; anything unparseable or unexpected falls
   * back to ROLE_CANDIDATE. NOTE: this validates the *shape* of state but does
   * not yet verify the nonce against a server-side store (see security note).
   */
  private parseRoleFromState(state?: string): string {
    if (!state) {
      return 'ROLE_CANDIDATE';
    }
    // Backward-compat: legacy links passed the bare role as state.
    if (state === 'ROLE_EMPLOYER') {
      return 'ROLE_EMPLOYER';
    }
    try {
      const decoded = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8'),
      );
      return decoded?.role === 'ROLE_EMPLOYER' ? 'ROLE_EMPLOYER' : 'ROLE_CANDIDATE';
    } catch {
      return 'ROLE_CANDIDATE';
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns the current user information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    this.logger.debug(`Getting current user: ${req.user?.email || 'unknown'}`);
    return { user: req.user };
  }


  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User registered successfully' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            provider: { type: 'string' },
          },
        },
        token: { type: 'string', description: 'JWT token for authentication' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`📝 Registration attempt for email: ${registerDto.email}`);
    const result = await this.authService.register(registerDto);
    this.logger.log(`✅ User registered successfully: ${result.user.email}`);
    return {
      message: 'User registered successfully',
      ...result,
    };
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Login with email and password',
    description: 'Returns a JWT token signed with user details (id, email, name, role). Decode the token to access user information.'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful - Returns JWT token containing user details',
    schema: {
      type: 'object',
      properties: {
        token: { 
          type: 'string', 
          description: 'JWT token signed with user details (id, email, name, role). Decode this token to access user information.',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`🔐 Login attempt for email: ${loginDto.email}`);
    const token = await this.authService.login(loginDto);
    this.logger.log(`✅ User logged in successfully`);
    return {
      token,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Request() req) {
    await this.authService.logout(req.user._id.toString());
    this.logger.log('User logged out');
    return { message: 'Logged out successfully' };
  }
}
