import { UserEntity, UserStatus } from '@/users/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { comparePassword } from '@/common/utils/hash.util';
import { JwtService } from '@nestjs/jwt';

type AuthInput = {
  email: string;
  password: string;
};

export type LoginData = Pick<
  UserEntity,
  'id' | 'email' | 'full_name' | 'status'
>;
export type LoginResponse = LoginData & {
  token: string;
};

@Injectable()
export class AuthService {
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

    // check if user is active
    if (user.status !== UserStatus.ACTIVE) {
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
      };
    }
    return null;
  }

  async login(user: LoginData): Promise<LoginData> {
    // update last login at
    await this.usersService.updateLastLoginAt(user.id);

    return user;
  }
}
