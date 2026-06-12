import 'package:flutter_test/flutter_test.dart';
import 'package:legisbot_campo/api/models.dart';

void main() {
  test('DashboardStats parseia /dashboard (forma real: total_projecao/total_registros)', () {
    final stats = DashboardStats.fromJson({
      'total_municipios': 645,
      'total_projecao': 100000,
      'por_tipo': [
        {'tipo': 'EXTERNO', 'total_projecao': 25000, 'total_registros': 320},
      ],
    });
    expect(stats.totalMunicipios, 645);
    expect(stats.porTipo.first.tipo, 'EXTERNO');
    expect(stats.porTipo.first.totalProjecao, 25000);
    expect(stats.porTipo.first.totalRegistros, 320);
    // percentual não vem da API — é calculado no cliente
    expect(stats.percentualDe(stats.porTipo.first), 25.0);
  });

  test('RankingItem parseia item de /ranking com id string', () {
    final item = RankingItem.fromJson({
      'id': '12',
      'nome': 'CAMPINAS',
      'regiao': 'METROPOLITANA',
      'bloco': 'BLOCO 1',
      'projecao_votos': 4500,
      'eleitores_22': 800000,
      'posicao': 3,
    });
    expect(item.id, '12');
    expect(item.posicao, 3);
  });

  test('MunicipioResumo parseia campos mínimos', () {
    final m = MunicipioResumo.fromJson({'id': '1', 'nome': 'ADAMANTINA'});
    expect(m.nome, 'ADAMANTINA');
    expect(m.projecaoVotos, 0);
    expect(m.regiao, '');
    expect(m.divisaoRegional, '');
  });

  test('MunicipioFicha parseia /municipios/:id completo', () {
    final f = MunicipioFicha.fromJson({
      'id': '1',
      'nome': 'SÃO PAULO',
      'tipo_cadastro': 'EXTERNO',
      'regiao': 'CAPITAL',
      'bloco': 'CAPITAL - ZONA LESTE',
      'divisao_regional': 'CAPITAL - ZONA LESTE',
      'rm_ra': 'RM SP',
      'projecao_votos': 45000,
      'projecao_2': 5000,
      'projecao_apoio_iurd': 3000,
      'projecao_base': 37000,
      'coordenacao': 'COORD A',
      'lideranca': 'LIDER B',
      'funcao_cargo': 'PASTOR',
      'coord_lideranca_2': null,
      'funcao_cargo_2': null,
      'eleitores_22': 9300000,
      'votos_22': 35000,
      'votos_validos_22': 6500000,
      'percentual_mv': 0.54,
      'ranking_mv': 1,
      'observacoes': 'obs',
    });
    expect(f.nome, 'SÃO PAULO');
    expect(f.projecaoBase, 37000);
    expect(f.coordLideranca2, '');
    expect(f.percentualMv, 0.54);
  });

  test('RegiaoStats parseia lista de municípios', () {
    final s = RegiaoStats.fromJson({
      'regiao': 'METROPOLITANA',
      'total_municipios': 39,
      'total_projecao': 50000,
      'total_eleitores': 20000000,
      'municipios': [
        {'id': '2', 'nome': 'GUARULHOS'},
      ],
    });
    expect(s.municipios.length, 1);
    expect(s.municipios.first.nome, 'GUARULHOS');
  });

  test('RegiaoStats agrupa municipios por divisão', () {
    final s = RegiaoStats.fromJson({
      'regiao': 'VALE DO PARAIBA',
      'total_municipios': 2,
      'total_projecao': 900,
      'total_eleitores': 50000,
      'municipios': [
        {'id': '1', 'nome': 'TAUBATE', 'projecao_votos': 500, 'divisao_regional': 'VALE HISTORICO'},
        {'id': '2', 'nome': 'JACAREI', 'projecao_votos': 400, 'divisao_regional': 'VALE NORTE'},
      ],
    });
    final grupos = s.porDivisao();
    expect(grupos.keys, containsAll(['VALE HISTORICO', 'VALE NORTE']));
    expect(grupos['VALE HISTORICO']!.single.nome, 'TAUBATE');
  });

  test('FiltrosOpcoes parseia listas', () {
    final f = FiltrosOpcoes.fromJson({
      'regioes': ['CAPITAL', 'METROPOLITANA'],
      'blocos': ['BLOCO 1'],
      'divisoes_regionais': ['ALTA SOROCABANA'],
    });
    expect(f.regioes.length, 2);
  });
}
