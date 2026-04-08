import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(RefreshTokenEntity)
    private refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  private generateRandomToken(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createRefreshToken(
    userId: string,
    deviceInfo?: { userAgent?: string; ip?: string },
  ): Promise<string> {
    const token = this.generateRandomToken();
    const tokenHash = this.hashToken(token);
    const tokenFamily = crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      tokenHash,
      tokenFamily,
      expiresAt,
      deviceInfo,
    });

    await this.refreshTokenRepository.save(refreshToken);

    this.logger.log(`Created refresh token for user ${userId}`);

    return token;
  }

  async rotateRefreshToken(
    oldToken: string,
    deviceInfo?: { userAgent?: string; ip?: string },
  ): Promise<{ newToken: string; userId: string }> {
    const tokenHash = this.hashToken(oldToken);

    const existingToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existingToken.isRevoked) {
      this.logger.warn(
        `Reuse detected! Token family ${existingToken.tokenFamily} compromised`,
      );
      await this.revokeTokenFamily(existingToken.tokenFamily);
      throw new UnauthorizedException(
        'Token reuse detected. All tokens in this family have been revoked. Please login again.',
      );
    }

    if (new Date() > existingToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.refreshTokenRepository.update(existingToken.id, {
      isRevoked: true,
      revokedAt: new Date(),
    });

    const newToken = this.generateRandomToken();
    const newTokenHash = this.hashToken(newToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshToken = this.refreshTokenRepository.create({
      userId: existingToken.userId,
      tokenHash: newTokenHash,
      tokenFamily: existingToken.tokenFamily,
      expiresAt,
      deviceInfo,
    });

    await this.refreshTokenRepository.save(refreshToken);

    /*   this.logger.log(`Rotated refresh token for user ${existingToken.userId}`); */

    return {
      newToken,
      userId: existingToken.userId,
    };
  }

  async revokeToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const result = await this.refreshTokenRepository.update(
      { tokenHash, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
      },
    );

    if (result.affected === 0) {
      throw new BadRequestException('Token not found or already revoked');
    }

    this.logger.log(`Revoked refresh token`);
  }

  async revokeTokenFamily(tokenFamily: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { tokenFamily, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
      },
    );

    this.logger.warn(`Revoked entire token family: ${tokenFamily}`);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
      },
    );

    this.logger.log(`Revoked all tokens for user ${userId}`);
  }

  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.log(
      `Cleaned up ${result.affected || 0} expired refresh tokens`,
    );
  }
}
