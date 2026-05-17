-- Migration: corrige dados de Areias (ausente na migration anterior) e reseta flag BI sync
-- Areias (SP) — votos_22=1, eleitores_22=3257, votos_validos_22=2438, ranking_mv=118

UPDATE municipios
SET
  votos_22         = 1,
  eleitores_22     = 3257,
  votos_validos_22 = 2438,
  percentual_mv    = 0.000410,
  ranking_mv       = 118
WHERE uf = 'SP' AND nome = 'Areias';

-- Reset flag para forçar BI sync completo no próximo startup
DELETE FROM integracoes_configuracoes
WHERE namespace = 'bi' AND chave = 'dados_sincronizados';
