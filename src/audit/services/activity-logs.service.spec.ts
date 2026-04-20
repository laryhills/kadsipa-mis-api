import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog } from '../schemas/activity-log.schema';
import { ActivityType } from '../constants/audit-action.enum';

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;
  const execMock = jest.fn();
  const leanMock = jest.fn(() => ({ exec: execMock }));
  const limitMock = jest.fn(() => ({ lean: leanMock }));
  const skipMock = jest.fn(() => ({ limit: limitMock }));
  const sortMock = jest.fn(() => ({ skip: skipMock }));
  const findMock = jest.fn(() => ({ sort: sortMock }));
  const countExecMock = jest.fn();
  const countDocumentsMock = jest.fn();

  beforeEach(async () => {
    execMock.mockReset();
    leanMock.mockReset();
    limitMock.mockReset();
    skipMock.mockReset();
    sortMock.mockReset();
    findMock.mockReset();
    countExecMock.mockReset();
    countDocumentsMock.mockReset();
    countDocumentsMock.mockReturnValue({ exec: countExecMock });
    leanMock.mockReturnValue({ exec: execMock });
    limitMock.mockReturnValue({ lean: leanMock });
    skipMock.mockReturnValue({ limit: limitMock });
    sortMock.mockReturnValue({ skip: skipMock, limit: limitMock });
    findMock.mockReturnValue({ sort: sortMock });
    countExecMock.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        {
          provide: getModelToken(ActivityLog.name),
          useValue: { find: findMock, countDocuments: countDocumentsMock },
        },
      ],
    }).compile();

    service = module.get(ActivityLogsService);
  });

  describe('findRecentForDashboard', () => {
    it('queries non-auth activity, sorts by newest, clamps limit', async () => {
      const createdAt = new Date('2026-01-15T10:00:00.000Z');
      execMock.mockResolvedValue([
        {
          _id: '507f1f77bcf86cd799439011',
          userId: 'u1',
          activityType: ActivityType.IMPORT,
          description: 'Beneficiary spreadsheet uploaded',
          createdAt,
        },
      ]);

      const result = await service.findRecentForDashboard(200);

      expect(findMock).toHaveBeenCalledWith({
        activityType: { $ne: ActivityType.AUTH },
      });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(limitMock).toHaveBeenCalledWith(50);
      expect(result.limit).toBe(50);
      expect(result.items).toEqual([
        {
          id: '507f1f77bcf86cd799439011',
          userId: 'u1',
          activityType: ActivityType.IMPORT,
          description: 'Beneficiary spreadsheet uploaded',
          createdAt: createdAt.toISOString(),
        },
      ]);
    });

    it('uses default limit 5 when omitted', async () => {
      execMock.mockResolvedValue([]);
      await service.findRecentForDashboard();
      expect(limitMock).toHaveBeenCalledWith(5);
    });
  });

  describe('findAll', () => {
    it('applies case-insensitive description search and escapes regex metacharacters', async () => {
      execMock.mockResolvedValue([]);
      countExecMock.mockResolvedValue(0);

      await service.findAll({ search: 'a+b', page: 1, limit: 10 } as any);

      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: { $regex: 'a\\+b', $options: 'i' },
        }),
      );
    });
  });
});
