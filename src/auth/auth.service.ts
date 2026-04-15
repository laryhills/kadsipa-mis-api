import { UserEntity, UserStatus } from '@/users/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { comparePassword } from '@/common/utils/hash.util';
import { JwtService } from '@nestjs/jwt';

type AuthInput = {
  email: string;
  password: string;
};

export type LoginData = Pick<
  UserEntity,
  'id' | 'email' | 'full_name' | 'status'
> & {
  requirePasswordChange?: boolean;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = LoginData & TokenPair;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /*   async authenticate(authInput: AuthInput): Promise<AuthData> {
    const user = await this.validateUser(authInput);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // update last login at
    await this.usersService.updateLastLoginAt(user.id);

    return {
      ...user,
      // token: this.generateAccessToken(user),
      token: 'access_token',
    };
  } */

  async validateUser(authInput: AuthInput): Promise<LoginData | null> {
    const user = await this.usersService.findOneByEmail(authInput.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Allow ACTIVE and PENDING users (PENDING = first login with temporary password)
    if (
      user.status !== UserStatus.ACTIVE &&
      user.status !== UserStatus.PENDING
    ) {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await comparePassword(
      authInput.password,
      user.password,
    );
    if (isPasswordValid) {
      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        status: user.status,
        requirePasswordChange: user.status === UserStatus.PENDING,
      };
    }
    return null;
  }

  async login(user: LoginData): Promise<LoginData> {
    await this.usersService.updateLastLoginAt(user.id);
    return user;
  }

  generateAccessToken(user: LoginData): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }

  async verifyAccessToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
