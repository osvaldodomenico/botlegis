import { Injectable, Logger } from '@nestjs/common';

export type ValidationResult = {
  valid: boolean;
  response: string;
  issues: string[];
};

@Injectable()
export class BotValidatorService {
  private readonly logger = new Logger(BotValidatorService.name);

  // ── Jargão político a filtrar ─────────────────────────────────────────────

  private readonly POLITIQUESE: RegExp[] = [
    /\b(sinergia|sinergias)\b/gi,
    /\b(capilaridade)\b/gi,
    /\b(potencializar)\b/gi,
    /\b(protagonismo)\b/gi,
    /\b(empoderamento)\b/gi,
    /\b(governança)\b/gi,
    /\b(accountability)\b/gi,
    /\b(stakeholder[s]?)\b/gi,
    /\b(benchmarking)\b/gi,
    /\b(paradigma[s]?)\b/gi,
  ];

  // ── Frases genéricas de encerramento (filler) ────────────────────────────

  private readonly FILLER_ENDINGS: RegExp[] = [
    /\n*\s*(se precisar|caso precise|qualquer d[uú]vida|estou [àa] disposi[çc][aã]o|n[aã]o hesit|pode contar comigo|fico [àa] disposi[çc][aã]o|sempre que precisar|[eé] s[oó] falar|[eé] s[oó] chamar|s[oó] me chamar|estou aqui para (ajudar|te ajudar|auxiliar)|conte comigo|a seu dispor|ao seu dispor|me coloco [àa] disposi[çc][aã]o|posso ajudar com mais alguma coisa|precisa de algo mais|algo mais que eu possa|se quiser estrat[eé]gias espec[ií]ficas).*$/gim,
  ];

  // ── Extract numbers > 100 from text ──────────────────────────────────────

  private extractNumbers(text: string): number[] {
    const matches = text.match(/\b\d[\d.,]*\b/g) || [];
    return matches
      .map(m => parseFloat(m.replace(/\./g, '').replace(',', '.')))
      .filter(n => !isNaN(n) && n > 100);
  }

  // ── Check if number exists in context (or is a valid sum) ────────────────

  private numberExistsInContext(n: number, contextNumbers: number[]): boolean {
    // Exact match
    if (contextNumbers.some(cn => Math.abs(cn - n) < 1)) return true;

    // Allow a sum of any 2-4 context numbers (for META MÍNIMA calculations)
    for (let i = 0; i < contextNumbers.length; i++) {
      for (let j = i + 1; j < contextNumbers.length; j++) {
        if (Math.abs(contextNumbers[i] + contextNumbers[j] - n) < 2) return true;
        for (let k = j + 1; k < contextNumbers.length; k++) {
          if (Math.abs(contextNumbers[i] + contextNumbers[j] + contextNumbers[k] - n) < 2) return true;
        }
      }
    }

    return false;
  }

  // ── Strip filler endings ───────────────────────────────────────────────────

  private stripFillerEndings(text: string): string {
    let result = text;
    for (const pattern of this.FILLER_ENDINGS) {
      result = result.replace(pattern, '');
    }
    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  // ── Remove political jargon ───────────────────────────────────────────────

  private filterPolitiquese(text: string): string {
    let result = text;
    for (const pattern of this.POLITIQUESE) {
      result = result.replace(pattern, (match) => {
        this.logger.debug(`Filtered politiquês: "${match}"`);
        return '';
      });
    }
    // Clean up double spaces left by removals
    return result.replace(/  +/g, ' ').trim();
  }

  // ── Truncate to WhatsApp limit ────────────────────────────────────────────

  private truncateWhatsApp(text: string, maxLength = 4000): string {
    if (text.length <= maxLength) return text;
    // Try to cut at a sentence boundary
    const cutPoint = text.lastIndexOf('.', maxLength);
    if (cutPoint > maxLength * 0.8) {
      return text.substring(0, cutPoint + 1);
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  // ── Full validation ───────────────────────────────────────────────────────

  validate(response: string, context?: string): ValidationResult {
    const issues: string[] = [];
    let result = response;

    // 1. Filter jargão político
    const filtered = this.filterPolitiquese(result);
    if (filtered !== result) {
      issues.push('filtered_politiquese');
      result = filtered;
    }

    // 2. Strip filler endings ("estou à disposição", "qualquer dúvida", etc.)
    const stripped = this.stripFillerEndings(result);
    if (stripped !== result) {
      issues.push('stripped_filler_ending');
      result = stripped;
    }

    // 3. Truncate to WhatsApp limit
    if (result.length > 4000) {
      result = this.truncateWhatsApp(result);
      issues.push('truncated_to_4000');
    }

    // 4. Check "não recebeu votos" hallucination — context may have votos_22 > 0
    if (context) {
      const votosMatch = context.match(/Votos MV em 2022:\s*([\d.]+)/);
      if (votosMatch) {
        const votosNo = parseFloat(votosMatch[1].replace(/\./g, '').replace(',', '.'));
        if (votosNo > 0 && /não recebeu votos|sem votos|nenhum voto/i.test(result)) {
          this.logger.warn(`Hallucination: context has ${votosNo} votes but response says "não recebeu votos"`);
          issues.push('possible_hallucination:zero_votes_lie');
          return { valid: false, response: result, issues };
        }
      }
    }

    // 5. Check for hallucinated numbers (only if context is provided)
    if (context && context.length > 0) {
      const responseNumbers = this.extractNumbers(result);
      const contextNumbers = this.extractNumbers(context);

      if (responseNumbers.length > 0 && contextNumbers.length > 0) {
        const hallucinated = responseNumbers.filter(n => !this.numberExistsInContext(n, contextNumbers));
        if (hallucinated.length > 0) {
          this.logger.warn(`Possible hallucinated numbers: ${hallucinated.join(', ')}`);
          issues.push(`possible_hallucination:${hallucinated.join(',')}`);
          // For now, log and flag but don't reject — hallucination retry is in BotLLMService
          return { valid: false, response: result, issues };
        }
      }
    }

    return { valid: true, response: result, issues };
  }
}
