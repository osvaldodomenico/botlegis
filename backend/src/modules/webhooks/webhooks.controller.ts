import { Body, Controller, Headers, Post, Query } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private service: WebhooksService) {}

  @Post('evolution')
  evolution(@Body() body: any, @Headers() headers: any, @Query('token') token?: string) {
    return this.service.handleEvolutionWebhook({ body, headers, token });
  }
}
