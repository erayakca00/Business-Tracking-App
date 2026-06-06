import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../database/entities/user.entity';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  /**
   * Registers a new user in the system.
   * Ensures email uniqueness, hashes the password securely,
   * generates a verification token, and triggers a verification email.
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, skills } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (pre-verified as requested)
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      skills: skills || [],
      isVerified: true,
      verificationToken: null,
    });

    await this.userRepository.save(user);

    return {
      message:
        'Registration successful. You can now log in immediately.',
    };
  }

  /**
   * Authenticates an existing user and returns a JWT access token.
   * Verifies the password and enforces that the email has been verified.
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verification check disabled for local/non-email setup

    // Generate JWT token
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        skills: user.skills,
      },
    };
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token.');
    }

    user.isVerified = true;
    user.verificationToken = null;
    await this.userRepository.save(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Fail silently/gracefully to prevent user enumeration
    if (!user) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await this.userRepository.save(user);
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, pass: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { resetToken: token },
    });

    if (
      !user ||
      !user.resetTokenExpiry ||
      user.resetTokenExpiry.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const hashedPassword = await bcrypt.hash(pass, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await this.userRepository.save(user);
  }

  /**
   * Helper method used by Passport JS local strategy (if applicable)
   * to validate user credentials asynchronously. Returns the user object
   * without the password field if successful.
   */
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('User not found with this email');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (isMatch) {
      const { password, ...result } = user;
      return result;
    } else {
      throw new UnauthorizedException('Incorrect password');
    }
    return null;
  }
}
