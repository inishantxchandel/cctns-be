import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetDropdownsQueryDto } from './dto/get-dropdowns-query.dto';
import {
  ReferenceDropdownsResponse,
  ReferenceService,
} from './reference.service';

@Controller('reference')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  /**
   * Issue types and districts are always populated.
   * Pass `districtId` to load police stations for that district (for cascading selects).
   */
  @Get('dropdowns')
  @UseGuards(JwtAuthGuard)
  getDropdowns(
    @Query() query: GetDropdownsQueryDto,
  ): Promise<ReferenceDropdownsResponse> {
    return this.referenceService.getDropdowns(query.districtId);
  }
}
