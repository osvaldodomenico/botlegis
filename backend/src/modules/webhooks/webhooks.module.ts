import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { IntegracoesModule } from '../integracoes/integracoes.module';
import { BotSearchService } from './services/bot-search.service';
import { BotContextService } from './services/bot-context.service';
import { BotLLMService } from './services/bot-llm.service';
import { BotSecurityService } from './services/bot-security.service';

@Module({
  imports: [IntegracoesModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    BotSearchService,
    BotContextService,
    BotLLMService,
    BotSecurityService,
  ],
})
export class WebhooksModule {}
