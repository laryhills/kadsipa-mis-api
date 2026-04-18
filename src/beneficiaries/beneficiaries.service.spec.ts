import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BeneficiariesService } from './beneficiaries.service';
import {
  BeneficiaryEntity,
  BeneficiaryType,
} from './entities/beneficiary.entity';
import { LgasService } from '../lgas/lgas.service';
import {
  BeneficiaryListSortBy,
  QueryBeneficiariesDto,
} from './dto/query-beneficiaries.dto';

describe('BeneficiariesService', () => {
  let service: BeneficiariesService;
  let beneficiaryRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
  };
  let lgasService: { findIdsByNormalizedNames: jest.Mock };

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
    const moduleRef: TestingModule = await Test.createTestingModule({
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
        {
          provide: LgasService,
          useValue: {
            findIdsByNormalizedNames: jest
              .fn()
              .mockResolvedValue(new Map<string, number>()),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(BeneficiariesService);
    beneficiaryRepository = moduleRef.get(
      getRepositoryToken(BeneficiaryEntity),
    );
    lgasService = moduleRef.get(LgasService);
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

  it('rejects create when LGA name does not match master list', async () => {
    beneficiaryRepository.find.mockResolvedValue([]);
    lgasService.findIdsByNormalizedNames.mockResolvedValue(new Map());

    await expect(
      service.create([
        {
          nidhh: '12345678901',
          legacy_id: 'legacy',
          account_number: '1234567890',
          bank: 'Test Bank',
          community: 'Comm',
          beneficiary_type: BeneficiaryType.INDIVIDUAL,
          first_name: 'A',
          last_name: 'B',
          nin: '12345678901',
          lga: 'Not A Real LGA',
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(beneficiaryRepository.save).not.toHaveBeenCalled();
  });
});
