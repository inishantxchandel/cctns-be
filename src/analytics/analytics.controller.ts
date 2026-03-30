import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Permission } from '../auth/permissions/permission.enum';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDashboardQueryDto } from './dto/analytics-dashboard-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.ACCESS_ANALYTICS_DASHBOARD)
  getDashboard(
    @Query() query: AnalyticsDashboardQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.analyticsService.getDashboard(query, user.userId, user.role);
  }
}

