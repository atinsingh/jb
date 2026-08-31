import {
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  Request,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { StorageService } from '../storage';
import { BillingService } from '../billing/billing.service';

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        'Invalid file type. Only JPG, PNG, GIF, and WEBP allowed.',
      ),
      false,
    );
  }
};

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private usersService: UsersService,
    private readonly storageService: StorageService,
    private readonly billingService: BillingService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user\'s profile. Uses JWT token to identify the user - no userId parameter needed.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Request() req) {
    const user = await this.usersService.getProfile(req.user._id.toString());
    return {
      message: 'Profile retrieved successfully',
      user,
    };
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get the current user's billing history",
    description:
      'Read straight from Stripe by the stored customer id. A user who never ' +
      'checked out has no Stripe customer and gets an empty list, not an error.',
  })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInvoices(@Request() req) {
    const invoices = await this.billingService.getUserInvoices(
      req.user._id.toString(),
    );
    return { invoices };
  }

  @Get('autofill-payload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Autofill payload for the browser extension',
    description:
      'Returns the candidate profile fields the extension fills into external ATS forms. Only includes information the user has already provided; the extension fills, then pauses for the user to review and submit.',
  })
  @ApiResponse({ status: 200, description: 'Autofill payload retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAutofillPayload(@Request() req) {
    const payload = await this.usersService.getAutofillPayload(
      req.user._id.toString(),
    );
    return { payload };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    this.logger.log(
      `Updating profile for user: ${req.user?.email || 'unknown'}`,
    );
    const user = await this.usersService.updateProfile(
      req.user._id.toString(),
      updateProfileDto,
    );
    return {
      message: 'Profile updated successfully',
      user,
    };
  }

  @Post('profile/picture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('picture', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter,
    }),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        picture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture (JPG, PNG, GIF, WEBP, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile picture updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or no file uploaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.log(
      `Uploading profile picture for user: ${req.user?.email || 'unknown'}`,
    );

    // Persist the uploaded avatar via the storage abstraction (local disk or
    // S3 depending on config) and store the served URL on the user.
    const ext = extname(file.originalname).toLowerCase();
    const key = `avatars/${req.user._id}${ext}`;
    const { url: pictureUrl } = await this.storageService.put(key, file.buffer, {
      contentType: file.mimetype,
    });

    const user = await this.usersService.updateProfilePicture(
      req.user._id.toString(),
      pictureUrl,
    );

    return {
      message: 'Profile picture updated successfully',
      user,
      pictureUrl,
    };
  }

  /*
   * Email change, password change, and the two password-reset routes used to
   * live here. Supabase Auth owns credentials now: the frontend calls
   * supabase.auth.updateUser() and resetPasswordForEmail() directly, so these
   * would have been a second, diverging way to change the same secret.
   *
   * The email route was already broken by the migration: it verified the
   * supplied password against the Mongo hash, which Supabase no longer keeps
   * up to date.
   */
}

