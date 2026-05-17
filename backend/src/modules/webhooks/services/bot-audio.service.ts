import { Injectable, Logger } from '@nestjs/common';
import { IntegracoesService } from '../../integracoes/integracoes.service';

@Injectable()
export class BotAudioService {
  private readonly logger = new Logger(BotAudioService.name);

  constructor(private integracoes: IntegracoesService) {}

  // ── Download audio buffer from URL ────────────────────────────────────────

  private async downloadAudio(url: string): Promise<Buffer> {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15000);
    try {
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(t);
    }
  }

  // ── Transcribe audio via OpenAI Whisper ───────────────────────────────────

  async transcribe(audioUrl: string): Promise<string | null> {
    try {
      const apiKey = (await this.integracoes.getPlain('openai', 'apiKey')).trim();
      if (!apiKey) {
        this.logger.warn('OpenAI API key not configured for audio transcription');
        return null;
      }

      const audioBuffer = await this.downloadAudio(audioUrl);

      // Build multipart form data
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
      formData.append('file', audioBlob, 'audio.ogg');
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');
      formData.append('response_format', 'text');

      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 20000);

      try {
        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
          signal: ac.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Whisper error ${res.status}: ${errText}`);
        }

        const text = await res.text();
        const trimmed = text?.trim();
        return trimmed || null;
      } finally {
        clearTimeout(t);
      }
    } catch (e) {
      this.logger.error(`Audio transcription failed: ${e}`);
      return null;
    }
  }

  // ── Normalize transcribed text for fuzzy search ───────────────────────────

  normalizeTranscription(text: string): string {
    return text
      .trim()
      // Common speech-to-text normalization for Portuguese city names
      .replace(/são\s+jose\b/gi, 'são josé')
      .replace(/ribeirao\b/gi, 'ribeirão')
      .replace(/sao\s+paulo\b/gi, 'são paulo')
      .replace(/sao\s+jose\s+dos\s+campos\b/gi, 'são josé dos campos')
      .replace(/mogi\s+das\s+cruzes\b/gi, 'mogi das cruzes');
  }
}
