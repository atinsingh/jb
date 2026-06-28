import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AppLoggerService } from '../common/logger/logger.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('AuthService');
  }


  generateToken(user: UserDocument) {
    const payload = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ email });
    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async register(registerDto: RegisterDto): Promise<{ user: UserDocument; token: string }> {
    const { name, email, password, role } = registerDto;

    this.logger.debug(`register() called with params: { email: ${email}, name: ${name}, role: ${role || 'ROLE_CANDIDATE'} }`);

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      this.logger.warn(`Registration attempt with existing email: ${email}`);
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Use provided role or default to ROLE_CANDIDATE
    const userRole = role || 'ROLE_CANDIDATE';

    // Create new user
    const user = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      provider: 'local',
      role: userRole,
      lastLogin: new Date(),
    });

    this.logger.log(`New user registered: ${user.email} (ID: ${user._id})`);

    // Generate token
    const token = this.generateToken(user);

    // Return user without password
    const userWithoutPassword = await this.userModel.findById(user._id).select('-password');

    this.logger.debug(`register() completed successfully for user: ${email}`);

    return {
      user: userWithoutPassword!,
      token,
    };
  }

  async login(loginDto: LoginDto): Promise<string> {
    const { email, password } = loginDto;

    this.logger.debug(`login() called with params: { email: ${email} }`);

    const user = await this.validateUser(email, password);
    if (!user) {
      this.logger.warn(`Failed login attempt - Invalid email or password for: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    this.logger.log(`User logged in successfully: ${user.email} (ID: ${user._id})`);

    // Generate token with user details (id, email, name, role)
    const token = this.generateToken(user);

    this.logger.debug(`login() completed successfully for user: ${email}`);

    return token;
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password');
  }


  async handleLinkedInCallback(code: string): Promise<UserDocument> {
    this.logger.log('🔵 [LinkedIn] Processing callback with authorization code');
    
    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        null,
        {
          params: {
            grant_type: 'authorization_code',
            code,
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET,
            redirect_uri:
              process.env.LINKEDIN_REDIRECT_URI ||
              'http://localhost:8000/api/auth/linkedin/callback',
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const accessToken = tokenResponse.data.access_token;
      this.logger.debug('🔵 [LinkedIn] Access token obtained');

      // Get user profile
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const profile = profileResponse.data;
      this.logger.log(`🔵 [LinkedIn] Profile retrieved for: ${profile.email}`);

      // Find or create user
      let user = await this.userModel.findOne({ linkedinId: profile.sub });

      if (!user) {
        user = await this.userModel.findOne({ email: profile.email });

        if (user) {
          // Link LinkedIn account to existing user
          user.linkedinId = profile.sub;
          user.picture = profile.picture || user.picture;
          user.provider = 'linkedin';
          user.lastLogin = new Date();
          await user.save();
          this.logger.log(`🔵 [LinkedIn] Linked account to existing user: ${user.email}`);
        } else {
          // Create new user
          user = await this.userModel.create({
            linkedinId: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            provider: 'linkedin',
            role: 'ROLE_CANDIDATE',
            lastLogin: new Date(),
          });
          this.logger.log(`🔵 [LinkedIn] Created new user: ${user.email}`);
        }
      } else {
        // Update existing LinkedIn user
        user.lastLogin = new Date();
        user.picture = profile.picture || user.picture;
        await user.save();
        this.logger.log(`🔵 [LinkedIn] Updated existing user: ${user.email}`);
      }

      return user;
    } catch (error: any) {
      this.logger.error(
        '❌ [LinkedIn] Error processing callback',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
