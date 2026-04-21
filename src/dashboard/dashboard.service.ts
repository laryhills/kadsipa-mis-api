import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
import { DisbursementStatus } from '../disbursements/entities/disbursement.entity';
import { PendingBeneficiaryStatus } from '../data-review/entities/pending-beneficiary.entity';
import { InterventionStatus } from '../interventions/entities/intervention.entity';
import {
  BeneficiaryGrowthPeriod,
  RecentDisbursementsQueryDto,
  TopListQueryDto,
} from './dto/dashboard-queries.dto';
import { DashboardCacheService } from './dashboard-cache.service';
import { ActivityLogsService } from '../audit/services/activity-logs.service';

const OVERVIEW_CACHE_MS = 120_000;
const TOP_CACHE_MS = 120_000;
const GROWTH_CACHE_MS = 300_000;
const BUDGET_CACHE_MS = 120_000;
const RECENT_CACHE_MS = 60_000;
const LGA_CACHE_MS = 120_000;

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly dashboardCache: DashboardCacheService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private toNum(v: unknown): number {
    if (v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Percent change (current vs prior period).
   * When both are zero → `0`. When prior is exactly zero and current is positive → `100`
   * (conventional “from zero” growth; the ratio is undefined in pure math but this reads as a clear increase in product/analytics UIs).
   */
  private percentChange(current: number, prior: number): number {
    if (prior === 0 && current === 0) return 0;
    if (prior === 0 && current > 0) return 100;
    const raw = ((current - prior) / prior) * 100;
    return Math.round(raw * 10) / 10;
  }

  private scopedCacheKey(logicalKey: string): string {
    return `${logicalKey}:e${this.dashboardCache.getEpoch()}`;
  }

  private async cached<T>(
    logicalKey: string,
    factory: () => Promise<T>,
    ttlMs: number,
  ): Promise<T> {
    const key = this.scopedCacheKey(logicalKey);
    const hit = await this.cache.get<T>(key);
    if (hit !== undefined && hit !== null) {
      return hit;
    }
    const value = await factory();
    await this.cache.set(key, value, ttlMs);
    return value;
  }

  async getOverview() {
    const [stats, recentActivity] = await Promise.all([
      this.cached(
        'dashboard:overview:v3',
        () => this.buildOverviewStatistics(),
        OVERVIEW_CACHE_MS,
      ),
      this.cached(
        'dashboard:overview:recentActivity:v1',
        () => this.activityLogsService.findRecentForDashboard(),
        RECENT_CACHE_MS,
      ),
    ]);

    return { ...stats, recentActivity };
  }

  private async buildOverviewStatistics() {
    const [
      [interventionStatsRow],
      demoRow,
      interventionBudgetRow,
      orgBudgetRow,
      disbursedRow,
      pendingRow,
      disbursedMomRow,
      beneficiaryMomRow,
      activeProgramsMomRow,
    ] = await Promise.all([
      this.dataSource.query<
        { total: string; active: string; pending: string }[]
      >(
        `SELECT
            COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE status = $1)::text AS active,
            COUNT(*) FILTER (WHERE status IN ($2, $3))::text AS pending
          FROM interventions
          WHERE deleted_at IS NULL`,
        [
          InterventionStatus.ACTIVE,
          InterventionStatus.DRAFT,
          InterventionStatus.SUSPENDED,
        ],
      ),
      this.dataSource.query<
        {
          total: string;
          male: string;
          female: string;
          other: string;
          unknown_gender: string;
          with_disability: string;
          without_disability: string;
        }[]
      >(
        `SELECT
              COUNT(DISTINCT b.id)::text AS total,
              COUNT(DISTINCT b.id) FILTER (WHERE b.gender = 'Male')::text AS male,
              COUNT(DISTINCT b.id) FILTER (WHERE b.gender = 'Female')::text AS female,
              COUNT(DISTINCT b.id) FILTER (WHERE b.gender = 'Other')::text AS other,
              COUNT(DISTINCT b.id) FILTER (WHERE b.gender IS NULL)::text AS unknown_gender,
              COUNT(DISTINCT b.id) FILTER (WHERE b.has_disability = true)::text AS with_disability,
              COUNT(DISTINCT b.id) FILTER (WHERE b.has_disability = false)::text AS without_disability
            FROM beneficiaries b
            INNER JOIN intervention_enrollments e ON e.beneficiary_id = b.id
            WHERE b.deleted_at IS NULL`,
      ),
      this.dataSource.query<{ intervention_total: string }[]>(
        `SELECT COALESCE(SUM(budget_allocated), 0)::text AS intervention_total
             FROM interventions WHERE deleted_at IS NULL`,
      ),
      this.dataSource.query<{ org_budget: string }[]>(
        `SELECT COALESCE(SUM(allocated_amount), 0)::text AS org_budget
             FROM budget_lines WHERE is_active = true`,
      ),
      this.dataSource.query<{ total: string }[]>(
        `SELECT COALESCE(SUM(amount), 0)::text AS total
             FROM disbursements WHERE status = $1`,
        [DisbursementStatus.PAID],
      ),
      this.dataSource.query<{ count: string }[]>(
        `SELECT COUNT(*)::text AS count FROM pending_beneficiaries WHERE status = $1`,
        [PendingBeneficiaryStatus.PENDING_REVIEW],
      ),
      this.dataSource.query<{ cur: string; prev: string }[]>(
        `WITH m AS (SELECT date_trunc('month', CURRENT_TIMESTAMP) AS cur_month)
         SELECT
           COALESCE(SUM(d.amount) FILTER (
             WHERE date_trunc('month', COALESCE(d.payment_date, d.created_at)) = (SELECT cur_month FROM m)
           ), 0)::text AS cur,
           COALESCE(SUM(d.amount) FILTER (
             WHERE date_trunc('month', COALESCE(d.payment_date, d.created_at)) =
               (SELECT cur_month FROM m) - interval '1 month'
           ), 0)::text AS prev
         FROM disbursements d
         WHERE d.status = $1`,
        [DisbursementStatus.PAID],
      ),
      this.dataSource.query<{ total_end_prev_month: string }[]>(
        `SELECT (
             SELECT COUNT(DISTINCT e.beneficiary_id)::text
             FROM intervention_enrollments e
             INNER JOIN beneficiaries b ON b.id = e.beneficiary_id AND b.deleted_at IS NULL
             WHERE e.created_at < date_trunc('month', CURRENT_TIMESTAMP)
           ) AS total_end_prev_month`,
      ),
      this.dataSource.query<
        { active_now: string; active_before_month: string }[]
      >(
        `SELECT
           COUNT(*) FILTER (WHERE status = $1)::text AS active_now,
           COUNT(*) FILTER (
             WHERE status = $1 AND created_at < date_trunc('month', CURRENT_TIMESTAMP)
           )::text AS active_before_month
         FROM interventions
         WHERE deleted_at IS NULL`,
        [InterventionStatus.ACTIVE],
      ),
    ]);

    const demo = demoRow[0];
    const disbMom = disbursedMomRow[0];
    const benMom = beneficiaryMomRow[0];
    const actMom = activeProgramsMomRow[0];

    const disbursedThisMonth = this.toNum(disbMom?.cur);
    const disbursedPrevMonth = this.toNum(disbMom?.prev);
    const beneficiariesEndPrev = this.toNum(benMom?.total_end_prev_month);
    const activeNow = this.toNum(actMom?.active_now);
    const activeBeforeMonth = this.toNum(actMom?.active_before_month);

    return {
      interventions: {
        total: this.toNum(interventionStatsRow?.total),
        active: this.toNum(interventionStatsRow?.active),
        pending: this.toNum(interventionStatsRow?.pending),
        activeChangePercentVsLastMonth: this.percentChange(
          activeNow,
          activeBeforeMonth,
        ),
      },
      beneficiaries: {
        totalEnrolled: this.toNum(demo?.total),
        byGender: {
          male: this.toNum(demo?.male),
          female: this.toNum(demo?.female),
          other: this.toNum(demo?.other),
          unknown: this.toNum(demo?.unknown_gender),
        },
        byDisability: {
          withDisability: this.toNum(demo?.with_disability),
          withoutDisability: this.toNum(demo?.without_disability),
        },
        totalEnrolledChangePercentVsLastMonth: this.percentChange(
          this.toNum(demo?.total),
          beneficiariesEndPrev,
        ),
      },
      budget: {
        interventionsAllocated: this.toNum(
          interventionBudgetRow[0]?.intervention_total,
        ),
        organizationAllocated: this.toNum(orgBudgetRow[0]?.org_budget),
        totalDisbursed: this.toNum(disbursedRow[0]?.total),
        monthlyDisbursedChangePercentVsLastMonth: this.percentChange(
          disbursedThisMonth,
          disbursedPrevMonth,
        ),
      },
      pendingVerification: {
        pendingBeneficiaryReviews: this.toNum(pendingRow[0]?.count),
      },
    };
  }

  async getTopInterventions(query: TopListQueryDto) {
    const limit = query.limit ?? 10;
    const key = `dashboard:interventions:top:v1:${limit}`;
    return this.cached(
      key,
      async () => {
        const rows = await this.dataSource.query<
          {
            id: string;
            name: string;
            program_code: string;
            status: string;
            beneficiary_count: string;
            budget_allocated: string;
            disbursed: string;
          }[]
        >(
          `SELECT
            i.id,
            i.name,
            i.program_code,
            i.status::text AS status,
            (
              SELECT COUNT(DISTINCT e.beneficiary_id)::text
              FROM intervention_enrollments e
              WHERE e.intervention_id = i.id
            ) AS beneficiary_count,
            i.budget_allocated::text AS budget_allocated,
            COALESCE(
              (
                SELECT SUM(d.amount)::text
                FROM disbursements d
                WHERE d.intervention_id = i.id AND d.status = $1
              ),
              '0'
            ) AS disbursed
          FROM interventions i
          WHERE i.deleted_at IS NULL`,
          [DisbursementStatus.PAID],
        );

        const mapped = rows.map((r) => ({
          interventionId: r.id,
          name: r.name,
          programCode: r.program_code,
          status: r.status,
          beneficiaryCount: this.toNum(r.beneficiary_count),
          budgetAllocated: this.toNum(r.budget_allocated),
          totalDisbursed: this.toNum(r.disbursed),
        }));

        const byBeneficiaries = [...mapped]
          .sort((a, b) => b.beneficiaryCount - a.beneficiaryCount)
          .slice(0, limit)
          .map((r, i) => ({ ...r, rank: i + 1 }));

        const byBudget = [...mapped]
          .sort((a, b) => b.budgetAllocated - a.budgetAllocated)
          .slice(0, limit)
          .map((r, i) => ({ ...r, rank: i + 1 }));

        const byDisbursal = [...mapped]
          .sort((a, b) => b.totalDisbursed - a.totalDisbursed)
          .slice(0, limit)
          .map((r, i) => ({ ...r, rank: i + 1 }));

        return { limit, byBeneficiaries, byBudget, byDisbursal };
      },
      TOP_CACHE_MS,
    );
  }

  async getBeneficiaryGrowth(period: BeneficiaryGrowthPeriod) {
    const key = `dashboard:beneficiaries:growth:v1:${period}`;
    return this.cached(
      key,
      async () => {
        const trunc =
          period === BeneficiaryGrowthPeriod.MONTHLY
            ? 'month'
            : period === BeneficiaryGrowthPeriod.QUARTERLY
              ? 'quarter'
              : 'year';

        const rows = await this.dataSource.query<
          { period_start: Date; new_beneficiaries: string }[]
        >(
          `SELECT
            date_trunc($1, e.created_at) AS period_start,
            COUNT(DISTINCT e.beneficiary_id)::text AS new_beneficiaries
          FROM intervention_enrollments e
          INNER JOIN beneficiaries b ON b.id = e.beneficiary_id AND b.deleted_at IS NULL
          GROUP BY 1
          ORDER BY 1 ASC`,
          [trunc],
        );

        let cumulative = 0;
        const series = rows.map((r) => {
          const newBeneficiaries = this.toNum(r.new_beneficiaries);
          cumulative += newBeneficiaries;
          return {
            periodStart: r.period_start.toISOString(),
            newBeneficiaries,
            cumulativeBeneficiaries: cumulative,
          };
        });

        return { period, series };
      },
      GROWTH_CACHE_MS,
    );
  }

  async getBudgetUtilization() {
    return this.cached(
      'dashboard:budget:utilization:v1',
      async () => {
        const byIntervention = await this.dataSource.query<
          {
            id: string;
            name: string;
            program_code: string;
            allocated: string;
            disbursed: string;
          }[]
        >(
          `SELECT
            i.id,
            i.name,
            i.program_code,
            i.budget_allocated::text AS allocated,
            COALESCE(
              (
                SELECT SUM(d.amount)::text
                FROM disbursements d
                WHERE d.intervention_id = i.id AND d.status = $1
              ),
              '0'
            ) AS disbursed
          FROM interventions i
          WHERE i.deleted_at IS NULL
          ORDER BY i.name ASC`,
          [DisbursementStatus.PAID],
        );

        const byBudgetLine = await this.dataSource.query<
          {
            id: string;
            name: string;
            category: string;
            allocated: string;
            spent: string;
          }[]
        >(
          `SELECT
            bl.id,
            bl.name,
            bl.category::text AS category,
            bl.allocated_amount::text AS allocated,
            bl.spent_amount::text AS spent
          FROM budget_lines bl
          WHERE bl.is_active = true
          ORDER BY bl.name ASC`,
        );

        const interventionItems = byIntervention.map((r) => {
          const allocated = this.toNum(r.allocated);
          const disbursed = this.toNum(r.disbursed);
          const utilizationRate =
            allocated > 0
              ? Math.round((disbursed / allocated) * 10000) / 100
              : 0;
          return {
            interventionId: r.id,
            name: r.name,
            programCode: r.program_code,
            allocated,
            disbursed,
            utilizationRate,
          };
        });

        const budgetLineItems = byBudgetLine.map((r) => {
          const allocated = this.toNum(r.allocated);
          const spent = this.toNum(r.spent);
          const utilizationRate =
            allocated > 0 ? Math.round((spent / allocated) * 10000) / 100 : 0;
          return {
            budgetLineId: r.id,
            name: r.name,
            category: r.category,
            allocated,
            spent,
            utilizationRate,
          };
        });

        return {
          byIntervention: interventionItems,
          byBudgetLine: budgetLineItems,
        };
      },
      BUDGET_CACHE_MS,
    );
  }

  async getBudgetCategories() {
    return this.cached(
      'dashboard:budget:categories:v1',
      async () => {
        const rows = await this.dataSource.query<
          {
            category: string;
            line_count: string;
            total_allocated: string;
            total_spent: string;
          }[]
        >(
          `SELECT
            bl.category::text AS category,
            COUNT(*)::text AS line_count,
            COALESCE(SUM(bl.allocated_amount), 0)::text AS total_allocated,
            COALESCE(SUM(bl.spent_amount), 0)::text AS total_spent
          FROM budget_lines bl
          WHERE bl.is_active = true
          GROUP BY bl.category
          ORDER BY total_allocated DESC`,
        );

        return {
          categories: rows.map((r) => {
            const allocated = this.toNum(r.total_allocated);
            const spent = this.toNum(r.total_spent);
            const utilizationRate =
              allocated > 0 ? Math.round((spent / allocated) * 10000) / 100 : 0;
            return {
              category: r.category,
              budgetLineCount: this.toNum(r.line_count),
              totalAllocated: allocated,
              totalSpent: spent,
              utilizationRate,
            };
          }),
        };
      },
      BUDGET_CACHE_MS,
    );
  }

  async getRecentDisbursements(query: RecentDisbursementsQueryDto) {
    const limit = query.limit ?? 20;
    const key = `dashboard:disbursements:recent:v1:${limit}`;
    return this.cached(
      key,
      async () => {
        const rows = await this.dataSource.query<
          {
            id: string;
            batch_number: string;
            amount: string;
            status: string;
            payment_date: Date | null;
            created_at: Date;
            intervention_name: string;
            beneficiary_first_name: string;
            beneficiary_last_name: string;
          }[]
        >(
          `SELECT
            d.id,
            d.batch_number,
            d.amount::text,
            d.status::text,
            d.payment_date,
            d.created_at,
            i.name AS intervention_name,
            b.first_name AS beneficiary_first_name,
            b.last_name AS beneficiary_last_name
          FROM disbursements d
          INNER JOIN interventions i ON i.id = d.intervention_id
          INNER JOIN beneficiaries b ON b.id = d.beneficiary_id
          ORDER BY COALESCE(d.payment_date, d.created_at) DESC
          LIMIT $1`,
          [limit],
        );

        return {
          limit,
          items: rows.map((r) => ({
            id: r.id,
            batchNumber: r.batch_number,
            amount: this.toNum(r.amount),
            status: r.status,
            paymentDate: r.payment_date ? r.payment_date.toISOString() : null,
            createdAt: r.created_at.toISOString(),
            interventionName: r.intervention_name,
            beneficiaryName:
              `${r.beneficiary_first_name} ${r.beneficiary_last_name}`.trim(),
          })),
        };
      },
      RECENT_CACHE_MS,
    );
  }

  async getTopLgas(query: TopListQueryDto) {
    const limit = query.limit ?? 10;
    const key = `dashboard:lgas:top:v1:${limit}`;
    return this.cached(
      key,
      async () => {
        const byDisbursement = await this.dataSource.query<
          {
            lga_name: string;
            total_disbursed: string;
            beneficiary_count: string;
          }[]
        >(
          `SELECT
            COALESCE(NULLIF(TRIM(b.lga), ''), 'Unknown') AS lga_name,
            COALESCE(SUM(d.amount), 0)::text AS total_disbursed,
            COUNT(DISTINCT d.beneficiary_id)::text AS beneficiary_count
          FROM disbursements d
          INNER JOIN beneficiaries b ON b.id = d.beneficiary_id
          WHERE d.status = $1 AND b.deleted_at IS NULL
          GROUP BY 1
          ORDER BY SUM(d.amount) DESC NULLS LAST
          LIMIT $2`,
          [DisbursementStatus.PAID, limit],
        );

        const byBeneficiaries = await this.dataSource.query<
          { lga_name: string; beneficiary_count: string }[]
        >(
          `SELECT
            COALESCE(NULLIF(TRIM(b.lga), ''), 'Unknown') AS lga_name,
            COUNT(DISTINCT e.beneficiary_id)::text AS beneficiary_count
          FROM intervention_enrollments e
          INNER JOIN beneficiaries b ON b.id = e.beneficiary_id
          WHERE b.deleted_at IS NULL
          GROUP BY 1
          ORDER BY COUNT(DISTINCT e.beneficiary_id) DESC
          LIMIT $1`,
          [limit],
        );

        return {
          limit,
          byDisbursement: byDisbursement.map((r, i) => ({
            lgaName: r.lga_name,
            totalDisbursed: this.toNum(r.total_disbursed),
            payingBeneficiaryCount: this.toNum(r.beneficiary_count),
            rank: i + 1,
          })),
          byBeneficiaries: byBeneficiaries.map((r, i) => ({
            lgaName: r.lga_name,
            enrolledBeneficiaryCount: this.toNum(r.beneficiary_count),
            rank: i + 1,
          })),
        };
      },
      LGA_CACHE_MS,
    );
  }
}
