import { UserEntity, UserStatus } from '@/users/entities/user.entity';
import { UsersService } from '@/users/users.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { comparePassword } from '@/common/utils/hash.util';
import { JwtService } from '@nestjs/jwt';
import type { Request as ExpressRequest } from 'express';
import { RefreshTokenService } from './services/refresh-token.service';
import type { RolePermissions } from '@/roles/entities/role.entity';

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

export type IssueLoginSuccessData = {
  id: string;
  email: string;
  full_name: string;
  status: UserStatus;
  requirePasswordChange: boolean;
  roles: Array<{
    id: string;
    name: string;
    permissions: RolePermissions;
  }>;
  permissions: RolePermissions;
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
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

  /**
   * Full login payload (access + refresh + roles) — shared by verify-otp and MFA completion flows.
   */
  async issueLoginSuccessData(
    userId: string,
    req: ExpressRequest,
    ip: string,
  ): Promise<IssueLoginSuccessData> {
    const userEntity = await this.usersService.findOne(userId);
    if (
      userEntity.status !== UserStatus.ACTIVE &&
      userEntity.status !== UserStatus.PENDING
    ) {
      throw new BadRequestException('Invalid email or inactive account');
    }

    const user: LoginData = {
      id: userEntity.id,
      email: userEntity.email,
      full_name: userEntity.full_name,
      status: userEntity.status,
      requirePasswordChange: userEntity.status === UserStatus.PENDING,
    };

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      user.id,
      {
        userAgent: req.headers['user-agent'],
        ip,
      },
    );

    await this.login(user);

    const userWithRoles =
      await this.usersService.getUserWithRolesAndPermissions(userEntity.id);

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      status: user.status,
      requirePasswordChange: userWithRoles.requirePasswordChange,
      roles: userWithRoles.roles,
      permissions: userWithRoles.allPermissions,
      accessToken,
      refreshToken,
    };
  }
}
