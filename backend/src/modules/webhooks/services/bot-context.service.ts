import { Injectable } from '@nestjs/common';
import { MunicipioData, SearchResult } from '../bot.types';

@Injectable()
export class BotContextService {
  // ── 1. Formatter: single municipality ────────────────────────────────────

  contextoMunicipio(mun: MunicipioData): string {
    const linhas: string[] = [`📊 Dados de *${mun.nome}* (Eleições 2026):`];
    if (mun.mesorregiao) linhas.push(`• Mesorregião: ${mun.mesorregiao}`);
    if (mun.rm_ra) linhas.push(`• RM/RA: ${mun.rm_ra}`);
    if (mun.regiao) linhas.push(`• Região: ${mun.regiao}`);
    // votos_22 = 0 é dado real e DEVE ser mostrado (não omitir zero!)
    if (mun.votos_22 != null) linhas.push(`• Votos MV em 2022: ${mun.votos_22 === 0 ? '*0 votos* (sem presença registrada em 2022)' : mun.votos_22.toLocaleString('pt-BR')}`);
    if (mun.eleitores_22 != null) linhas.push(`• Eleitores em 2022: ${mun.eleitores_22.toLocaleString('pt-BR')}`);
    if (mun.votos_validos_22 != null) linhas.push(`• Votos válidos 2022: ${mun.votos_validos_22.toLocaleString('pt-BR')}`);
    if (mun.percentual_mv != null) linhas.push(`• % dos votos válidos 2022: ${(mun.percentual_mv * 100).toFixed(2)}%`);
    if (mun.ranking_mv != null) linhas.push(`• Ranking entre deputados federais 2022: ${mun.ranking_mv}º lugar`);
    if (mun.tipo_cadastro) linhas.push(`• Tipo de Base: ${mun.tipo_cadastro}`);
    if (mun.lideranca) linhas.push(`• Liderança 1: ${mun.lideranca}${mun.funcao_cargo ? ` (${mun.funcao_cargo})` : ''}`);
    if (mun.coordenacao) linhas.push(`• Coordenação 1: ${mun.coordenacao}`);
    if (mun.projecao_votos != null) linhas.push(`• Projeção Base Apoiadores (2026): ${mun.projecao_votos.toLocaleString('pt-BR')}`);
    if (mun.projecao_base != null && mun.projecao_base > 0) linhas.push(`• Projeção Base Instituição (2026): ${mun.projecao_base.toLocaleString('pt-BR')}`);
    if (mun.coord_lideranca_2) linhas.push(`• Liderança 2: ${mun.coord_lideranca_2}${mun.funcao_cargo_2 ? ` (${mun.funcao_cargo_2})` : ''}`);
    if (mun.projecao_2 != null) linhas.push(`• Projeção Liderança 2 (2026): ${mun.projecao_2.toLocaleString('pt-BR')}`);
    if (mun.projecao_apoio_iurd != null && mun.projecao_apoio_iurd > 0) linhas.push(`• Projeção Apoio IURD (2026): ${mun.projecao_apoio_iurd.toLocaleString('pt-BR')}`);
    const contribuicoes = [mun.projecao_votos, mun.projecao_base, mun.projecao_2, mun.projecao_apoio_iurd].filter(Boolean) as number[];
    const totalContribuicoes = contribuicoes.reduce((s, v) => s + v, 0);
    if (mun.votos_22 && totalContribuicoes > 0) {
      linhas.push(`• META MÍNIMA 2026 (base 2022 + lideranças): ${(mun.votos_22 + totalContribuicoes).toLocaleString('pt-BR')} votos`);
    }
    if (mun.candidato_nome) linhas.push(`• Candidato vinculado: ${mun.candidato_nome} (${mun.candidato_cargo || ''})`);
    return linhas.join('\n');
  }

  // ── 1b. Formatter: municipality with all leadership rows ──────────────────

  contextoMunicipioCompleto(registros: MunicipioData[]): string {
    if (registros.length <= 1) return this.contextoMunicipio(registros[0]);

    // Use first record for base data (2022 stats are the same across rows)
    const base = registros[0];
    const linhas: string[] = [`📊 Dados de *${base.nome}* (Eleições 2026):`];
    if (base.mesorregiao) linhas.push(`• Mesorregião: ${base.mesorregiao}`);
    if (base.rm_ra) linhas.push(`• RM/RA: ${base.rm_ra}`);
    if (base.regiao) linhas.push(`• Região: ${base.regiao}`);
    if (base.votos_22 != null) linhas.push(`• Votos MV em 2022: ${base.votos_22 === 0 ? '*0 votos* (sem presença registrada em 2022)' : base.votos_22.toLocaleString('pt-BR')}`);
    if (base.eleitores_22 != null) linhas.push(`• Eleitores em 2022: ${base.eleitores_22.toLocaleString('pt-BR')}`);
    if (base.votos_validos_22 != null) linhas.push(`• Votos válidos 2022: ${base.votos_validos_22.toLocaleString('pt-BR')}`);
    if (base.percentual_mv != null) linhas.push(`• % dos votos válidos 2022: ${(base.percentual_mv * 100).toFixed(2)}%`);
    if (base.ranking_mv != null) linhas.push(`• Ranking entre deputados federais 2022: ${base.ranking_mv}º lugar`);

    // Group records by tipo_cadastro
    const grupos: Record<string, MunicipioData[]> = {};
    for (const r of registros) {
      const tipo = r.tipo_cadastro || 'SEM TIPO';
      if (!grupos[tipo]) grupos[tipo] = [];
      grupos[tipo].push(r);
    }

    let totalProjecao = 0;
    const tipoLabels: Record<string, string> = {
      'EXTERNO': '🌐 EXTERNO (fora da igreja)',
      'BASE - INSTITUIÇÃO': '⛪ BASE INSTITUIÇÃO (IURD)',
      'BASE APOIADORES': '🤝 BASE APOIADORES',
      'SEM TIPO': '📋 OUTROS',
    };

    for (const [tipo, regs] of Object.entries(grupos)) {
      linhas.push('');
      linhas.push(`${tipoLabels[tipo] || tipo} (${regs.length} registros):`);
      let subtotal = 0;
      for (const r of regs) {
        const projLid1 = r.projecao_votos || 0;
        const projBase = r.projecao_base || 0;
        const projLid2 = r.projecao_2 || 0;
        const projIurd = r.projecao_apoio_iurd || 0;
        const contrib = projLid1 + projBase + projLid2 + projIurd;
        subtotal += contrib;
        totalProjecao += contrib;

        if (r.lideranca) {
          linhas.push(`• ${r.lideranca}${r.funcao_cargo ? ` (${r.funcao_cargo})` : ''} — projeção: ${projLid1.toLocaleString('pt-BR')} votos`);
        }
        if (r.coordenacao && r.coordenacao !== r.lideranca) {
          linhas.push(`  Coordenação: ${r.coordenacao}`);
        }
        if (r.coord_lideranca_2) {
          linhas.push(`• ${r.coord_lideranca_2}${r.funcao_cargo_2 ? ` (${r.funcao_cargo_2})` : ''} — projeção 2: ${projLid2.toLocaleString('pt-BR')} votos`);
        }
        if (projBase > 0) linhas.push(`  Base Instituição: +${projBase.toLocaleString('pt-BR')}`);
        if (projIurd > 0) linhas.push(`  Apoio IURD: +${projIurd.toLocaleString('pt-BR')}`);
      }
      linhas.push(`  Subtotal ${tipo}: +${subtotal.toLocaleString('pt-BR')} votos`);
    }

    linhas.push('');
    linhas.push(`📊 TOTAL PROJEÇÕES 2026: +${totalProjecao.toLocaleString('pt-BR')} votos`);
    if (base.votos_22 != null) {
      linhas.push(`🎯 META MÍNIMA 2026 (base 2022 + todas as lideranças): ${((base.votos_22 || 0) + totalProjecao).toLocaleString('pt-BR')} votos`);
    }
    if (base.candidato_nome) linhas.push(`• Candidato vinculado: ${base.candidato_nome} (${base.candidato_cargo || ''})`);
    return linhas.join('\n');
  }

  // ── 2. Formatter: region ──────────────────────────────────────────────────

  contextoRegiao(cidades: MunicipioData[], nomeRegiao: string): string {
    const totalVotos22 = cidades.reduce((s, c) => s + (c.votos_22 || 0), 0);
    const totalMeta = cidades.reduce((s, c) => {
      const contrib = ([c.projecao_votos, c.projecao_base, c.projecao_2, c.projecao_apoio_iurd].filter(Boolean) as number[]).reduce((a, b) => a + b, 0);
      return s + (c.votos_22 || 0) + contrib;
    }, 0);
    const linhas: string[] = [
      `📊 Região *${nomeRegiao}* — ${cidades.length} municípios:`,
      `• Total votos MV 2022: ${totalVotos22.toLocaleString('pt-BR')} | Meta mínima 2026: ${totalMeta.toLocaleString('pt-BR')}`,
      '',
    ];
    for (const c of cidades) {
      const contrib = ([c.projecao_votos, c.projecao_base, c.projecao_2, c.projecao_apoio_iurd].filter(Boolean) as number[]).reduce((a, b) => a + b, 0);
      const meta = (c.votos_22 || 0) + contrib;
      linhas.push(`🏙️ ${c.nome}`);
      linhas.push(`  2022: ${(c.votos_22 || 0).toLocaleString('pt-BR')} votos | #${c.ranking_mv || '?'}º ranking | ${c.percentual_mv ? (c.percentual_mv * 100).toFixed(2) + '%' : '0%'} | ${(c.eleitores_22 || 0).toLocaleString('pt-BR')} eleitores`);
      if (c.lideranca || c.coordenacao) linhas.push(`  Liderança: ${c.lideranca || '-'} | Coord.: ${c.coordenacao || '-'}`);
      if (c.projecao_2 || c.coord_lideranca_2) linhas.push(`  Liderança 2: ${c.coord_lideranca_2 || '-'} | Proj.2: ${c.projecao_2 ? c.projecao_2.toLocaleString('pt-BR') : '-'}`);
      if (contrib > 0) linhas.push(`  Projeções 2026: +${contrib.toLocaleString('pt-BR')} | META MÍNIMA: ${meta.toLocaleString('pt-BR')}`);
    }
    return linhas.join('\n');
  }

  // ── 3. Formatter: geographic subdivision ─────────────────────────────────

  contextoSubdivisao(tipo: string, valor: string, cidades: MunicipioData[]): string {
    const totalVotos22 = cidades.reduce((s, c) => s + (c.votos_22 || 0), 0);
    const totalMeta = cidades.reduce((s, c) => {
      const contrib = ([c.projecao_votos, c.projecao_base, c.projecao_2, c.projecao_apoio_iurd].filter(Boolean) as number[]).reduce((a, b) => a + b, 0);
      return s + (c.votos_22 || 0) + contrib;
    }, 0);
    const linhas: string[] = [
      `📊 ${tipo}: *${valor}* — ${cidades.length} municípios`,
      `• Total votos MV 2022: ${totalVotos22.toLocaleString('pt-BR')} | Meta mínima 2026: ${totalMeta.toLocaleString('pt-BR')}`,
      '',
    ];
    for (const c of cidades) {
      const contrib = ([c.projecao_votos, c.projecao_base, c.projecao_2, c.projecao_apoio_iurd].filter(Boolean) as number[]).reduce((a, b) => a + b, 0);
      const meta = (c.votos_22 || 0) + contrib;
      linhas.push(`🏙️ ${c.nome}`);
      linhas.push(`  2022: ${(c.votos_22 || 0).toLocaleString('pt-BR')} votos | #${c.ranking_mv || '?'}º | ${c.percentual_mv ? (c.percentual_mv * 100).toFixed(2) + '%' : '0%'} | ${(c.eleitores_22 || 0).toLocaleString('pt-BR')} eleitores`);
      if (c.lideranca || c.coordenacao) linhas.push(`  Lid.: ${c.lideranca || '-'} (${c.funcao_cargo || ''}) [${c.tipo_cadastro || '-'}] | Coord.: ${c.coordenacao || '-'}`);
      if (c.coord_lideranca_2) linhas.push(`  Lid.2: ${c.coord_lideranca_2} (${c.funcao_cargo_2 || ''})`);
      if (contrib > 0) linhas.push(`  Proj.: +${contrib.toLocaleString('pt-BR')} | META: ${meta.toLocaleString('pt-BR')}`);
    }
    return linhas.join('\n');
  }

  // ── 4. Formatter: leadership/role search results ──────────────────────────

  contextoLideranca(cidades: MunicipioData[], termoBusca: string): string {
    if (cidades.length === 1) return this.contextoMunicipio(cidades[0]);

    const linhas: string[] = [`📊 Lideranças encontradas para "${termoBusca}":`];
    for (const c of cidades) {
      const contrib = ([c.projecao_votos, c.projecao_base, c.projecao_2, c.projecao_apoio_iurd].filter(Boolean) as number[]).reduce((a, b) => a + b, 0);
      const meta = (c.votos_22 || 0) + contrib;
      linhas.push(`\n🏙️ ${c.nome} (${c.mesorregiao || ''})`);
      linhas.push(`  Liderança: ${c.lideranca || '-'} | Coord.: ${c.coordenacao || '-'}`);
      if (c.coord_lideranca_2) linhas.push(`  Liderança 2: ${c.coord_lideranca_2}`);
      linhas.push(`  2022: ${(c.votos_22 || 0).toLocaleString('pt-BR')} votos | #${c.ranking_mv || '?'}º`);
      if (contrib > 0) linhas.push(`  Projeções: +${contrib.toLocaleString('pt-BR')} | META MÍNIMA: ${meta.toLocaleString('pt-BR')}`);
    }
    return linhas.join('\n');
  }

  // ── 5. Formatter: ranking / strategy results ──────────────────────────────

  contextoRanking(cidades: MunicipioData[], criterio: string): string {
    // Group by city name
    const porCidade = new Map<string, MunicipioData[]>();
    for (const c of cidades) {
      const existing = porCidade.get(c.nome) || [];
      existing.push(c);
      porCidade.set(c.nome, existing);
    }

    const linhas: string[] = [`📊 *${criterio}*\n`];
    let pos = 0;

    for (const [nome, rows] of porCidade) {
      pos++;
      const base = rows[0];
      const votos22 = base.votos_22 || 0;
      const eleitores22 = base.eleitores_22 || 0;

      // Aggregate projections and leaders across all rows
      let totalProj = 0;
      const lideres: string[] = [];

      for (const r of rows) {
        const proj = ([r.projecao_votos, r.projecao_base, r.projecao_2, r.projecao_apoio_iurd]
          .filter(Boolean) as number[]).reduce((s, v) => s + v, 0);
        totalProj += proj;

        if (r.lideranca) {
          lideres.push(`${r.lideranca}${r.funcao_cargo ? ` (${r.funcao_cargo})` : ''} [${r.tipo_cadastro || '-'}] → +${(r.projecao_votos || 0).toLocaleString('pt-BR')}`);
        }
        if (r.coord_lideranca_2) {
          lideres.push(`${r.coord_lideranca_2}${r.funcao_cargo_2 ? ` (${r.funcao_cargo_2})` : ''} → +${(r.projecao_2 || 0).toLocaleString('pt-BR')}`);
        }
      }

      const metaMinima = votos22 + totalProj;

      linhas.push(`*${pos}. ${nome}* (${base.mesorregiao || '-'})`);
      linhas.push(`  📈 2022: ${votos22.toLocaleString('pt-BR')} votos | #${base.ranking_mv || '?'}º | ${base.percentual_mv ? (base.percentual_mv * 100).toFixed(2) + '%' : '0%'} | ${eleitores22.toLocaleString('pt-BR')} eleitores`);

      if (lideres.length > 0) {
        linhas.push(`  👥 Lideranças (${lideres.length}):`);
        for (const l of lideres) {
          linhas.push(`    • ${l}`);
        }
      } else {
        linhas.push(`  👥 *SEM LIDERANÇA CADASTRADA*`);
      }

      if (totalProj > 0) {
        linhas.push(`  🎯 Projeções: +${totalProj.toLocaleString('pt-BR')} | META MÍNIMA 2026: ${metaMinima.toLocaleString('pt-BR')}`);
      } else {
        linhas.push(`  🎯 Sem projeções 2026 | Apenas base 2022: ${votos22.toLocaleString('pt-BR')}`);
      }
      linhas.push('');
    }

    return linhas.join('\n');
  }

  // ── Build context string from unified SearchResult ────────────────────────

  buildContextFromSearch(result: SearchResult): string | undefined {
    switch (result.type) {
      case 'municipio':
        if (result.cidades && result.cidades.length > 1) {
          return this.contextoMunicipioCompleto(result.cidades);
        }
        return result.municipio ? this.contextoMunicipio(result.municipio) : undefined;
      case 'regiao':
        return result.cidades && result.regiaoNome
          ? this.contextoRegiao(result.cidades, result.regiaoNome)
          : undefined;
      case 'subdivisao':
        return result.cidades && result.subdivisaoTipo && result.subdivisaoValor
          ? this.contextoSubdivisao(result.subdivisaoTipo, result.subdivisaoValor, result.cidades)
          : undefined;
      case 'lideranca':
      case 'funcao_cargo':
        return result.cidades && result.termoBusca
          ? this.contextoLideranca(result.cidades, result.termoBusca)
          : undefined;
      case 'ranking':
        return result.cidades && result.rankingCriterio
          ? this.contextoRanking(result.cidades, result.rankingCriterio)
          : undefined;
      default:
        return undefined;
    }
  }

  // ── Election summary (moved from SYSTEM_PROMPT hardcoded data) ────────────

  buildElectionSummary(): string {
    return `DADOS GERAIS DO DEPUTADO FEDERAL MILTON VIEIRA (Republicanos, nº 1055) — ELEIÇÕES 2022:
- Total de votos em SP: *98.557 votos*
- Municípios com votos: 432 de 645 | Sem nenhum voto: 213 municípios
- Eleito como Deputado Federal por São Paulo pelo Republicanos

MAIORES VOTAÇÕES (volume):
São Paulo (47.445), São José dos Campos (9.663), Taboão da Serra (3.703), Taubaté (3.603), Embu das Artes (3.291), Caraguatatuba (2.461), Diadema (2.287), Jacareí (2.158)

MELHORES RANKINGS (posição entre todos os dep. federais na cidade):
#3 Estrela do Norte (9,91%), #4 Natividade da Serra (3,67%), #5 Caraguatatuba (3,53%), #5 Paraibuna (3,27%), #5 Jambeiro (3,62%), #6 Embu das Artes (2,32%), #7 São José dos Campos (2,43%)

CIDADES MAIS FRACAS (com votos, piores %):
Araçatuba (2 votos, #490º), São Joaquim da Barra (1 voto, #325º), Birigui (3 votos, #338º), São Carlos (11 votos, #335º), Lençóis Paulista (2 votos, #330º)
Além de 213 cidades onde o Milton não recebeu nenhum voto em 2022.

MAIOR POTENCIAL INEXPLORADO (grande eleitorado + presença quase zero de MV):
• Santo André: 582.584 eleitores | 131 votos MV | 0,03% | #186º ranking
• Ribeirão Preto: 468.225 eleitores | 73 votos | 0,02% | #198º ranking
• Santos: 352.667 eleitores | 39 votos | 0,02% | #213º ranking
• São José do Rio Preto: 345.050 eleitores | 39 votos | 0,02% | #249º ranking
• Mauá: 315.450 eleitores | 48 votos | 0,02% | #216º ranking
• Piracicaba: 307.397 eleitores | 19 votos | 0,01% | #267º ranking
• Bauru: 280.158 eleitores | 47 votos | 0,03% | #189º ranking
• Barueri: 279.166 eleitores | 149 votos | 0,08% | #133º ranking
• Praia Grande: 248.856 eleitores | 35 votos | 0,02% | #180º ranking
• Franca: 247.349 eleitores | 21 votos | 0,01% | #229º ranking

LÓGICA ESTRATÉGICA — PRIORIDADE DE CIDADES:
Quando perguntarem "qual cidade trabalhar mais", "onde focar esforço", "onde estamos mais fracos" ou similar:
- PRIORIDADE 1: Cidades com grande eleitorado e presença MV quase zero (veja lista acima) — maior ROI de campanha
- PRIORIDADE 2: Cidades onde MV já tem liderança cadastrada mas votos 2022 ainda baixos
- PRIORIDADE 3: Cidades sem nenhum voto E sem liderança — zona em branco total
- NÃO priorize apenas cidades com 0 votos — cidades pequenas com 0 votos têm menor impacto que uma grande cidade com 50 votos
- Cidades com 2-3 votos absolutamente NÃO são "destaques" — são casos normais de presença mínima

DADOS DE BI: Você tem acesso aos dados de votação 2022 e projeções 2026 de todos os 645 municípios de SP. Os dados detalhados do município do usuário são fornecidos no contexto de cada mensagem.

REGRAS PARA RESPONDER SOBRE DADOS:
- Perguntas gerais ("quantos votos em 2022?", "qual o total?") → responda com os dados gerais acima, SEM pedir cidade
- Perguntas específicas de cidade ("como foi em Campinas?") → use o contexto do município se disponível, ou pergunte a cidade
- NUNCA peça informação que você já tem. Se o dado está no contexto ou nos dados gerais acima, responda direto.`;
  }
}
