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
  async linkedinAuth(@Res() res: Response) {
    const linkedinAuthUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:8000/api/auth/linkedin/callback',
      scope: 'openid profile email',
      state: Math.random().toString(36).substring(7),
    });

    res.redirect(`${linkedinAuthUrl}?${params.toString()}`);
  }

  @Get('linkedin/callback')
  @ApiOperation({ summary: 'LinkedIn OAuth callback endpoint' })
  @ApiQuery({ name: 'code', required: false, description: 'Authorization code from LinkedIn' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with token' })
  @ApiExcludeEndpoint()
  async linkedinCallback(@Query('code') code: string, @Res() res: Response) {
    this.logger.log('🔵 [LinkedIn Callback] Callback received');
    
    if (!code) {
      this.logger.error('❌ [LinkedIn Callback] No authorization code received');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=linkedin_auth_failed`);
    }

    try {
      const user = await this.authService.handleLinkedInCallback(code);
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
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout() {
    this.logger.log('User logged out');
    return { message: 'Logged out successfully' };
  }
}
