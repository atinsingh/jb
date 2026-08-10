import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { AppLoggerService } from '../../common/logger/logger.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {
    const envSecret = configService.get<string>('JWT_SECRET');
    if (!envSecret && process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET must be set in production — refusing to start with an insecure default secret.',
      );
    }
    const secret = envSecret || 'dev-insecure-secret-change-me';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.logger.setContext('JwtStrategy');
    this.logger.debug(
      `JWT Strategy initialized with secret: ${envSecret ? `***${secret.slice(0, 4)}…*** (length: ${secret.length})` : 'DEV FALLBACK — set JWT_SECRET before deploying'}`,
    );
  }

  async validate(payload: any) {
    this.logger.debug(`Validating JWT payload: { id: ${payload.id}, email: ${payload.email} }`);

    if (!payload.id) {
      this.logger.error('JWT payload missing id field');
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.userModel.findById(payload.id);
    if (!user) {
      this.logger.warn(`JWT validation failed - User not found in database: ${payload.id}`);
      throw new UnauthorizedException('User not found');
    }

    // Reject tokens from a superseded session generation (set on logout). A
    // token minted before this field existed carries no tokenVersion and is
    // treated as generation 0, matching a user who has never logged out.
    const tokenGen = payload.tokenVersion ?? 0;
    if (tokenGen !== (user.tokenVersion ?? 0)) {
      this.logger.warn(`JWT rejected - stale session generation for ${user.email}`);
      throw new UnauthorizedException('Session expired, please log in again');
    }

    this.logger.debug(`JWT validation successful - User found: ${user.email} (ID: ${user._id})`);
    return user;
  }
}

