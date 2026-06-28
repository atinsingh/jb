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
    const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.logger.setContext('JwtStrategy');
    const secretLength = secret.length;
    const secretPreview = secret.substring(0, 4) + '...' + secret.substring(secretLength - 4);
    this.logger.debug(`JWT Strategy initialized with secret: ${secret === 'your-secret-key' ? 'DEFAULT (CHANGE THIS!)' : `***${secretPreview}*** (length: ${secretLength})`}`);
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

    this.logger.debug(`JWT validation successful - User found: ${user.email} (ID: ${user._id})`);
    return user;
  }
}

