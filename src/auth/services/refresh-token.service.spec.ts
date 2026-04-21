import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  const mockRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  it('revokeOtherSessions rejects unknown refresh token', async () => {
    mockRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.revokeOtherSessions('user-id', 'any-token'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokeOtherSessions revokes rows in other token families', async () => {
    mockRepository.findOne.mockResolvedValueOnce({
      userId: 'user-id',
      tokenFamily: 'family-a',
      tokenHash: 'hashed',
    });

    const execute = jest.fn().mockResolvedValue({ affected: 2 });
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    };
    mockRepository.createQueryBuilder.mockReturnValueOnce(qb);

    await service.revokeOtherSessions('user-id', 'valid-token-material');

    expect(execute).toHaveBeenCalled();
  });
});
