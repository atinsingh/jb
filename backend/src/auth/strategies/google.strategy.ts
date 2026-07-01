import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    // Debug: Log all Google-related env vars
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_REDIRECT_URI') || 
      'http://localhost:8000/api/auth/google/callback';

    console.log('🔍 [GoogleStrategy] Config check:');
    console.log(`   GOOGLE_CLIENT_ID: ${clientID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   GOOGLE_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Missing'}`);
    console.log(`   GOOGLE_REDIRECT_URI: ${callbackURL}`);

    // Also check process.env as fallback
    const envClientID = process.env.GOOGLE_CLIENT_ID;
    const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (envClientID && !clientID) {
      console.warn('⚠️  GOOGLE_CLIENT_ID found in process.env but not in ConfigService');
    }
    if (envClientSecret && !clientSecret) {
      console.warn('⚠️  GOOGLE_CLIENT_SECRET found in process.env but not in ConfigService');
    }

    // Use process.env as fallback if ConfigService doesn't have it
    const finalClientID = clientID || envClientID;
    const finalClientSecret = clientSecret || envClientSecret;

    if (!finalClientID || !finalClientSecret) {
      const errorMsg = `Google OAuth configuration is missing. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.
Current values:
  - ConfigService GOOGLE_CLIENT_ID: ${clientID || 'undefined'}
  - ConfigService GOOGLE_CLIENT_SECRET: ${clientSecret ? '***' : 'undefined'}
  - process.env GOOGLE_CLIENT_ID: ${envClientID || 'undefined'}
  - process.env GOOGLE_CLIENT_SECRET: ${envClientSecret ? '***' : 'undefined'}`;
      
      throw new Error(errorMsg);
    }

    super({
      clientID: finalClientID,
      clientSecret: finalClientSecret,
      callbackURL,
      scope: ['profile', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    console.log('🟡 [Passport Strategy] Google profile received');
    console.log('🟡 [Passport Strategy] Profile ID:', profile.id);
    console.log('🟡 [Passport Strategy] Profile email:', profile.emails?.[0]?.value);
    console.log('🟡 [Passport Strategy] Profile name:', profile.displayName);

    try {
      let user = await this.userModel.findOne({ googleId: profile.id });
      console.log('🟡 [Passport Strategy] Existing user found by googleId:', !!user);

      if (!user) {
        user = await this.userModel.findOne({ email: profile.emails[0].value });
        console.log('🟡 [Passport Strategy] Existing user found by email:', !!user);

        if (user) {
          user.googleId = profile.id;
          user.picture = profile.photos[0]?.value || user.picture;
          user.provider = 'google';
          user.lastLogin = new Date();
          await user.save();
          console.log('🟡 [Passport Strategy] Updated existing user');
        } else {
          // Honor an intended role carried through OAuth `state` (set by an
          // employer signup); default to candidate for organic sign-ups.
          const intendedRole =
            req?.query?.state === 'ROLE_EMPLOYER'
              ? 'ROLE_EMPLOYER'
              : 'ROLE_CANDIDATE';
          user = await this.userModel.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0]?.value,
            provider: 'google',
            role: intendedRole,
            lastLogin: new Date(),
          });
          console.log(
            `🟡 [Passport Strategy] Created new user (${intendedRole}):`,
            user._id,
          );
        }
      } else {
        user.lastLogin = new Date();
        user.picture = profile.photos[0]?.value || user.picture;
        await user.save();
        console.log('🟡 [Passport Strategy] Updated existing user login time');
      }

      console.log('🟡 [Passport Strategy] Returning user:', user._id);
      return done(null, user);
    } catch (error) {
      console.error('❌ [Passport Strategy] Error:', error);
      console.error('❌ [Passport Strategy] Error stack:', error.stack);
      return done(error, null);
    }
  }
}
