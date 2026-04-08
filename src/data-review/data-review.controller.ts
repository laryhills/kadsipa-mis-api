import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DataReviewService } from './data-review.service';
import { UploadBeneficiariesDto } from './dto/upload-beneficiaries.dto';
import { ApprovePendingDto } from './dto/approve-pending.dto';
import { RejectPendingDto } from './dto/reject-pending.dto';
import { LinkPendingDto } from './dto/link-pending.dto';
import { BulkApproveDto } from './dto/bulk-approve.dto';
import { BulkRejectDto } from './dto/bulk-reject.dto';
import { PendingBeneficiaryStatus } from './entities/pending-beneficiary.entity';
import { successResponse } from '../common';

@Controller({ version: '1', path: 'data-review' })
@UseGuards(PassportJwtGuard, RolesGuard)
export class DataReviewController {
  constructor(private readonly dataReviewService: DataReviewService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission('interventions.manageBeneficiaries')
  async uploadBeneficiaries(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadBeneficiariesDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const result = await this.dataReviewService.uploadBeneficiaries(
      file,
      dto.interventionId,
      currentUser.id,
    );
    return successResponse('Beneficiaries uploaded successfully', result);
  }

  @Get('pending')
  @RequirePermission('interventions.viewInterventions')
  async findAllPending(
    @Query('status') status?: PendingBeneficiaryStatus,
    @Query('interventionId') interventionId?: string,
  ) {
    const pending = await this.dataReviewService.findAllPending(
      status,
      interventionId,
    );
    return successResponse(
      'Pending beneficiaries fetched successfully',
      pending,
    );
  }

  @Get('pending/:id')
  @RequirePermission('interventions.viewInterventions')
  async findOne(@Param('id') id: string) {
    const pending = await this.dataReviewService.findOne(id);
    return successResponse('Pending beneficiary fetched successfully', pending);
  }

  @Get('duplicates/:nin')
  @RequirePermission('interventions.viewInterventions')
  async findDuplicates(@Param('nin') nin: string) {
    const duplicates = await this.dataReviewService.findDuplicatesByNIN(nin);
    return successResponse('Duplicates fetched successfully', duplicates);
  }

  @Get('statistics')
  @RequirePermission('interventions.viewInterventions')
  async getStatistics() {
    const statistics = await this.dataReviewService.getStatistics();
    return successResponse('Statistics fetched successfully', statistics);
  }

  @Patch('pending/:id/approve')
  @RequirePermission('interventions.manageBeneficiaries')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApprovePendingDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const pending = await this.dataReviewService.approve(
      id,
      dto,
      currentUser.id,
    );
    return successResponse(
      'Pending beneficiary approved successfully',
      pending,
    );
  }

  @Patch('pending/:id/reject')
  @RequirePermission('interventions.manageBeneficiaries')
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectPendingDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const pending = await this.dataReviewService.reject(
      id,
      dto,
      currentUser.id,
    );
    return successResponse(
      'Pending beneficiary rejected successfully',
      pending,
    );
  }

  @Post('pending/:id/link')
  @RequirePermission('interventions.manageBeneficiaries')
  async linkToExisting(
    @Param('id') id: string,
    @Body() dto: LinkPendingDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const pending = await this.dataReviewService.linkToExisting(
      id,
      dto,
      currentUser.id,
    );
    return successResponse('Pending beneficiary linked successfully', pending);
  }

  @Post('pending/bulk-approve')
  @RequirePermission('interventions.manageBeneficiaries')
  async bulkApprove(
    @Body() dto: BulkApproveDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const result = await this.dataReviewService.bulkApprove(
      dto.pendingIds,
      currentUser.id,
      dto.notes,
    );
    return successResponse(
      `Bulk approval completed: ${result.successful.length} succeeded, ${result.failed.length} failed`,
      result,
    );
  }

  @Post('pending/bulk-reject')
  @RequirePermission('interventions.manageBeneficiaries')
  async bulkReject(
    @Body() dto: BulkRejectDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const result = await this.dataReviewService.bulkReject(
      dto.pendingIds,
      currentUser.id,
      dto.reason,
    );
    return successResponse(
      `Bulk rejection completed: ${result.successful.length} succeeded, ${result.failed.length} failed`,
      result,
    );
  }
}
