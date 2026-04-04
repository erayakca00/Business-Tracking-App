import {
    Injectable,
    ConflictException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
    ) { }

    /**
     * Registers a new user in the system.
     * Ensures email uniqueness, hashes the password securely,
     * and auto-logs the user in by generating a fast JWT token.
     * 
     * @param registerDto Contains user email, password, name, and optional skills.
     * @returns AuthResponseDto containing the JWT and user profile.
     * @throws ConflictException if the email is already taken.
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

        // Create user
        const user = this.userRepository.create({
            email,
            password: hashedPassword,
            name,
            skills: skills || [],
        });

        await this.userRepository.save(user);

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

    /**
     * Authenticates an existing user and returns a JWT access token.
     * Verifies the provided plaintext password against the stored bcrypt hash.
     * 
     * @param loginDto Contains user email and plaintext password.
     * @returns AuthResponseDto containing the JWT and user profile.
     * @throws UnauthorizedException on incorrect email or password.
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
