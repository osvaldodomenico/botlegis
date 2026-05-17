import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { IntegracoesModule } from '../integracoes/integracoes.module';
import { BotSearchService } from './services/bot-search.service';
import { BotContextService } from './services/bot-context.service';
import { BotLLMService } from './services/bot-llm.service';
import { BotSecurityService } from './services/bot-security.service';
import { BotIntentService } from './services/bot-intent.service';
import { BotGreetingService } from './services/bot-greeting.service';
import { BotMemoryService } from './services/bot-memory.service';
import { BotAudioService } from './services/bot-audio.service';

@Module({
  imports: [IntegracoesModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    BotSearchService,
    BotContextService,
    BotLLMService,
    BotSecurityService,
    BotIntentService,
    BotGreetingService,
    BotMemoryService,
    BotAudioService,
  ],
})
export class WebhooksModule {}
