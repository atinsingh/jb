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
import { UpdateEmailDto } from './dto/update-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { memoryStorage } from 'multer';
import { extname } from 'path';

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

  constructor(private usersService: UsersService) {}

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

    // In a real application, you would upload to cloud storage (S3, Cloudinary, etc.)
    // For now, we'll store the file path or URL
    // This is a placeholder - you should implement actual file storage
    const pictureUrl = `/uploads/profile-pictures/${req.user._id}-${Date.now()}${extname(file.originalname)}`;

    // TODO: Implement actual file upload to storage service
    // For now, we'll just save the metadata
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

  @Patch('email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user email address' })
  @ApiBody({ type: UpdateEmailDto })
  @ApiResponse({ status: 200, description: 'Email updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid password' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateEmail(@Request() req, @Body() updateEmailDto: UpdateEmailDto) {
    this.logger.log(
      `Updating email for user: ${req.user?.email || 'unknown'}`,
    );
    const user = await this.usersService.updateEmail(
      req.user._id.toString(),
      updateEmailDto,
    );
    return {
      message: 'Email updated successfully. Please verify your new email.',
      user,
    };
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid current password' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    this.logger.log(
      `Changing password for user: ${req.user?.email || 'unknown'}`,
    );
    await this.usersService.changePassword(
      req.user._id.toString(),
      changePasswordDto,
    );
    return {
      message: 'Password changed successfully',
    };
  }

  @Post('password/reset-request')
  @ApiOperation({ summary: 'Request password reset (sends email with reset link)' })
  @ApiBody({ type: ResetPasswordRequestDto })
  @ApiResponse({
    status: 200,
    description: 'If the email exists, a password reset link has been sent',
  })
  @ApiResponse({ status: 400, description: 'Failed to send reset email' })
  async requestPasswordReset(@Body() resetPasswordRequestDto: ResetPasswordRequestDto) {
    this.logger.log(
      `Password reset requested for email: ${resetPasswordRequestDto.email}`,
    );
    return await this.usersService.requestPasswordReset(resetPasswordRequestDto);
  }

  @Post('password/reset')
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    this.logger.log('Password reset attempt with token');
    return await this.usersService.resetPassword(resetPasswordDto);
  }
}

