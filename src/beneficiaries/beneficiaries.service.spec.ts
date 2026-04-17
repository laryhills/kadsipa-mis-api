import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BeneficiariesService } from './beneficiaries.service';
import { BeneficiaryEntity } from './entities/beneficiary.entity';
import {
  BeneficiaryListSortBy,
  QueryBeneficiariesDto,
} from './dto/query-beneficiaries.dto';

describe('BeneficiariesService', () => {
  let service: BeneficiariesService;

  const mockQb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BeneficiariesService,
        {
          provide: getRepositoryToken(BeneficiaryEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQb),
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(BeneficiariesService);
    jest.clearAllMocks();
  });

  it('rejects totalAmountReceived sort on intervention-scoped list', async () => {
    const interventionId = '550e8400-e29b-41d4-a716-446655440000';
    const query: QueryBeneficiariesDto = {
      sortBy: BeneficiaryListSortBy.totalAmountReceived,
    };

    await expect(
      service.findAllByIntervention(interventionId, query),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
