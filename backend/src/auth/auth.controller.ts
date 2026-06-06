import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('verify-email')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'Email verified successfully. You can now log in.' };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
    return { message: 'Password has been reset successfully.' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      skills: req.user.skills,
      webTheme: req.user.webTheme,
      mobileTheme: req.user.mobileTheme,
    };
  }
}
