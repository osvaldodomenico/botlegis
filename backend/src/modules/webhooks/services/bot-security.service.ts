import { Injectable, Logger } from '@nestjs/common';

export type SecurityCheckResult = {
  safe: boolean;
  sanitized: string;
  reason?: string;
};

@Injectable()
export class BotSecurityService {
  private readonly logger = new Logger(BotSecurityService.name);

  // ── Injection detection patterns ──────────────────────────────────────────

  private readonly INJECTION_PATTERNS: RegExp[] = [
    /ignore\s+(?:previous|above|all)\s+instructions?/i,
    /\bsystem\s*:/i,
    /pretend\s+(?:you\s+are|to\s+be)/i,
    /you\s+are\s+now\s+(?:a|an)\b/i,
    /dan\s+mode/i,
    /jailbreak/i,
    /act\s+as\s+if/i,
    /forget\s+(?:all\s+)?(?:your\s+)?(?:previous\s+)?(?:instructions?|training|context)/i,
    /disregard\s+(?:all\s+)?(?:previous\s+)?instructions?/i,
    /override\s+(?:your\s+)?(?:instructions?|system\s+prompt)/i,
    /\[system\]/i,
    /<system>/i,
    /roleplay\s+as/i,
    /new\s+persona/i,
    /without\s+(?:any\s+)?restrictions?/i,
  ];

  // ── Input sanitization ────────────────────────────────────────────────────

  sanitize(input: string): string {
    let result = input;

    // Remove zero-width characters
    result = result.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

    // Remove control characters (except newlines and tabs)
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Limit length to 2000 characters
    if (result.length > 2000) {
      result = result.substring(0, 2000);
    }

    return result.trim();
  }

  // ── Injection detection ───────────────────────────────────────────────────

  checkInjection(text: string): boolean {
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        this.logger.warn(`Prompt injection attempt detected: pattern=${pattern.source}, text="${text.substring(0, 100)}"`);
        return true;
      }
    }
    return false;
  }

  // ── Full security check ───────────────────────────────────────────────────

  check(rawInput: string): SecurityCheckResult {
    // First sanitize
    const sanitized = this.sanitize(rawInput);

    // Then check for injection attempts
    if (this.checkInjection(sanitized)) {
      return {
        safe: false,
        sanitized,
        reason: 'injection_attempt',
      };
    }

    return { safe: true, sanitized };
  }

  // ── Neutral response for injection attempts ───────────────────────────────

  neutralResponse(nome?: string): string {
    const prefix = nome ? `*${nome}*, ` : '';
    return `${prefix}só consigo ajudar com informações da campanha *Eleições 2026* do *Grupo Milton Vieira*. Em que posso ajudar? 🏛️`;
  }
}
