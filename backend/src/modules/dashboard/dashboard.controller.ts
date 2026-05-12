import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('dashboard')
  getStats() {
    return this.service.getStats();
  }

  @Get('ranking')
  getRanking(@Query() query: any) {
    return this.service.getRanking(query);
  }
}
