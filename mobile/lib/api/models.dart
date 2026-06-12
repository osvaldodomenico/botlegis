/// Helpers tolerantes: a API serializa BigInt como string e pode omitir campos.
int _toInt(dynamic v) {
  if (v == null) return 0;
  if (v is int) return v;
  if (v is double) return v.toInt();
  return int.tryParse(v.toString()) ?? 0;
}

double _toDouble(dynamic v) {
  if (v == null) return 0;
  if (v is double) return v;
  if (v is int) return v.toDouble();
  return double.tryParse(v.toString()) ?? 0;
}

String _toStr(dynamic v) {
  if (v == null) return '';
  return v.toString();
}

class TipoProjecao {
  final String tipo;
  final int totalProjecao;
  final int totalRegistros;
  TipoProjecao({required this.tipo, required this.totalProjecao, required this.totalRegistros});
  factory TipoProjecao.fromJson(Map<String, dynamic> j) => TipoProjecao(
        tipo: _toStr(j['tipo']),
        totalProjecao: _toInt(j['total_projecao']),
        totalRegistros: _toInt(j['total_registros']),
      );
}

class DashboardStats {
  final int totalMunicipios;
  final int totalProjecao;
  final List<TipoProjecao> porTipo;
  DashboardStats({
    required this.totalMunicipios,
    required this.totalProjecao,
    required this.porTipo,
  });
  factory DashboardStats.fromJson(Map<String, dynamic> j) => DashboardStats(
        totalMunicipios: _toInt(j['total_municipios']),
        totalProjecao: _toInt(j['total_projecao']),
        porTipo: ((j['por_tipo'] as List?) ?? [])
            .map((e) => TipoProjecao.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  double percentualDe(TipoProjecao t) {
    if (totalProjecao == 0) return 0;
    return t.totalProjecao / totalProjecao * 100;
  }
}

class RankingItem {
  final String id;
  final String nome;
  final String regiao;
  final String bloco;
  final int projecaoVotos;
  final int eleitores22;
  final int posicao;
  RankingItem({
    required this.id,
    required this.nome,
    required this.regiao,
    required this.bloco,
    required this.projecaoVotos,
    required this.eleitores22,
    required this.posicao,
  });
  factory RankingItem.fromJson(Map<String, dynamic> j) => RankingItem(
        id: _toStr(j['id']),
        nome: _toStr(j['nome']),
        regiao: _toStr(j['regiao']),
        bloco: _toStr(j['bloco']),
        projecaoVotos: _toInt(j['projecao_votos']),
        eleitores22: _toInt(j['eleitores_22']),
        posicao: _toInt(j['posicao']),
      );
}

/// Item de lista — usado em /busca, /stats/* e /municipios (lista).
class MunicipioResumo {
  final String id;
  final String nome;
  final String regiao;
  final String bloco;
  final String divisaoRegional;
  final int projecaoVotos;
  final String coordenacao;
  final String lideranca;
  final int eleitores22;
  MunicipioResumo({
    required this.id,
    required this.nome,
    required this.regiao,
    required this.bloco,
    required this.divisaoRegional,
    required this.projecaoVotos,
    required this.coordenacao,
    required this.lideranca,
    required this.eleitores22,
  });
  factory MunicipioResumo.fromJson(Map<String, dynamic> j) => MunicipioResumo(
        id: _toStr(j['id']),
        nome: _toStr(j['nome']),
        regiao: _toStr(j['regiao']),
        bloco: _toStr(j['bloco']),
        divisaoRegional: _toStr(j['divisao_regional']),
        projecaoVotos: _toInt(j['projecao_votos']),
        coordenacao: _toStr(j['coordenacao']),
        lideranca: _toStr(j['lideranca']),
        eleitores22: _toInt(j['eleitores_22']),
      );
}

class MunicipioFicha {
  final String id;
  final String nome;
  final String tipoCadastro;
  final String regiao;
  final String bloco;
  final String divisaoRegional;
  final String rmRa;
  final int projecaoVotos;
  final int projecao2;
  final int projecaoApoioIurd;
  final int projecaoBase;
  final String coordenacao;
  final String lideranca;
  final String funcaoCargo;
  final String coordLideranca2;
  final String funcaoCargo2;
  final int eleitores22;
  final int votos22;
  final int votosValidos22;
  final double percentualMv;
  final int rankingMv;
  final String observacoes;
  MunicipioFicha({
    required this.id,
    required this.nome,
    required this.tipoCadastro,
    required this.regiao,
    required this.bloco,
    required this.divisaoRegional,
    required this.rmRa,
    required this.projecaoVotos,
    required this.projecao2,
    required this.projecaoApoioIurd,
    required this.projecaoBase,
    required this.coordenacao,
    required this.lideranca,
    required this.funcaoCargo,
    required this.coordLideranca2,
    required this.funcaoCargo2,
    required this.eleitores22,
    required this.votos22,
    required this.votosValidos22,
    required this.percentualMv,
    required this.rankingMv,
    required this.observacoes,
  });
  factory MunicipioFicha.fromJson(Map<String, dynamic> j) => MunicipioFicha(
        id: _toStr(j['id']),
        nome: _toStr(j['nome']),
        tipoCadastro: _toStr(j['tipo_cadastro']),
        regiao: _toStr(j['regiao']),
        bloco: _toStr(j['bloco']),
        divisaoRegional: _toStr(j['divisao_regional']),
        rmRa: _toStr(j['rm_ra']),
        projecaoVotos: _toInt(j['projecao_votos']),
        projecao2: _toInt(j['projecao_2']),
        projecaoApoioIurd: _toInt(j['projecao_apoio_iurd']),
        projecaoBase: _toInt(j['projecao_base']),
        coordenacao: _toStr(j['coordenacao']),
        lideranca: _toStr(j['lideranca']),
        funcaoCargo: _toStr(j['funcao_cargo']),
        coordLideranca2: _toStr(j['coord_lideranca_2']),
        funcaoCargo2: _toStr(j['funcao_cargo_2']),
        eleitores22: _toInt(j['eleitores_22']),
        votos22: _toInt(j['votos_22']),
        votosValidos22: _toInt(j['votos_validos_22']),
        percentualMv: _toDouble(j['percentual_mv']),
        rankingMv: _toInt(j['ranking_mv']),
        observacoes: _toStr(j['observacoes']),
      );
}

class RegiaoStats {
  final String regiao;
  final int totalMunicipios;
  final int totalProjecao;
  final int totalEleitores;
  final List<MunicipioResumo> municipios;
  RegiaoStats({
    required this.regiao,
    required this.totalMunicipios,
    required this.totalProjecao,
    required this.totalEleitores,
    required this.municipios,
  });
  factory RegiaoStats.fromJson(Map<String, dynamic> j) => RegiaoStats(
        regiao: _toStr(j['regiao']),
        totalMunicipios: _toInt(j['total_municipios']),
        totalProjecao: _toInt(j['total_projecao']),
        totalEleitores: _toInt(j['total_eleitores']),
        municipios: ((j['municipios'] as List?) ?? [])
            .map((e) => MunicipioResumo.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class FiltrosOpcoes {
  final List<String> regioes;
  final List<String> blocos;
  final List<String> divisoesRegionais;
  FiltrosOpcoes({required this.regioes, required this.blocos, required this.divisoesRegionais});
  factory FiltrosOpcoes.fromJson(Map<String, dynamic> j) => FiltrosOpcoes(
        regioes: ((j['regioes'] as List?) ?? []).map((e) => e.toString()).toList(),
        blocos: ((j['blocos'] as List?) ?? []).map((e) => e.toString()).toList(),
        divisoesRegionais:
            ((j['divisoes_regionais'] as List?) ?? []).map((e) => e.toString()).toList(),
      );
}
