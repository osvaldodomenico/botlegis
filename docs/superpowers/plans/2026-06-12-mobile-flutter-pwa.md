# LegisBot Campo (Flutter Web + PWA) — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App de campo mobile (Flutter Web + PWA) em `mobile/`, consumindo a API NestJS existente, sem tocar em nenhum arquivo de `frontend/`.

**Architecture:** Novo projeto Flutter na pasta `mobile/` do monorepo. Camadas: `theme/` (Apple Design System em Material 3), `api/` (cliente HTTP + modelos), `auth/` (login JWT + lembrar senha via shared_preferences), `screens/` (5 telas com go_router + bottom nav). Única mudança no backend: CORS aceita lista de origens. Deploy: Dockerfile multi-stage (Flutter → nginx) como novo serviço EasyPanel.

**Tech Stack:** Flutter 3.41 (web), go_router, provider, http, shared_preferences. Backend NestJS 10 (1 edit em `main.ts`).

**Spec:** `docs/superpowers/specs/2026-06-12-mobile-flutter-pwa-design.md`

**Fatos da API (verificados no código — usar exatamente estes campos):**
- `POST /auth/login` body `{email, senha}` → `{access_token, user: {id, email, nome}}`
- `GET /dashboard` → `{total_municipios, total_projecao, por_tipo: [{tipo, total_projecao, total_registros}], por_divisao_regional: [...], top10_projecao: [...], top10_por_tipo: {...}}` — **NÃO existe** `total_eleitores` nem `percentual`; o app usa `/ranking` para o top 10 e calcula percentual no cliente
- `GET /ranking?limit=10` → `{data: [{id, nome, regiao, bloco, projecao_votos, eleitores_22, posicao}], meta}`
- `GET /busca?q=&limit=` → `{query, total, municipios: [{id, nome, regiao, bloco, projecao_votos, coordenacao, lideranca, eleitores_22, ...}]}`
- `GET /filtros/opcoes` → `{regioes: [...], blocos: [...], divisoes_regionais: [...], ...}`
- `GET /stats/regiao/:regiao` → `{regiao, total_municipios, total_projecao, total_eleitores, media_projecao, maior_projecao, top5: [...], municipios: [{id, nome, projecao_votos, coordenacao, lideranca, eleitores_22, divisao_regional}]}`
- `GET /municipios/:id` → objeto completo (ver `MunicipioFicha` na Task 4)
- **IDs chegam como string** (BigInt serializado). Todas as rotas exceto `/auth/login` exigem `Authorization: Bearer <token>`.

---

## Chunk 1: Fundação

### Task 1: Verificar ambiente e scaffold do projeto

**Files:**
- Create: `mobile/` (via `flutter create`)

- [ ] **Step 1: Verificar Flutter SDK**

Run: `flutter --version`
Expected: `Flutter 3.41.x • channel stable` (já instalado em `/opt/homebrew/bin/flutter`)

- [ ] **Step 2: Criar o projeto (só plataforma web)**

```bash
cd "/Users/domenico/Documents/Documentos - MacBook Air de Osvaldo/Projetos/sistemas/Eco Sistema Legis/bot"
flutter create --project-name legisbot_campo --platforms web --org br.app.shiftworks mobile
```
Expected: `All done!` e pasta `mobile/` com `lib/`, `web/`, `pubspec.yaml`.

- [ ] **Step 3: Adicionar dependências**

```bash
cd mobile
flutter pub add go_router provider http shared_preferences
```
Expected: pubspec.yaml atualizado, `pub get` ok.

- [ ] **Step 4: Limpar o counter app e validar build**

Substituir `mobile/lib/main.dart` por placeholder mínimo (será reescrito na Task 9):

```dart
import 'package:flutter/material.dart';

void main() => runApp(const _Placeholder());

class _Placeholder extends StatelessWidget {
  const _Placeholder();
  @override
  Widget build(BuildContext context) =>
      const MaterialApp(home: Scaffold(body: Center(child: Text('LegisBot Campo'))));
}
```

Apagar `mobile/test/widget_test.dart` (testa o counter removido):
```bash
rm mobile/test/widget_test.dart
```

Run: `cd mobile && flutter analyze && flutter build web --release`
Expected: `No issues found!` e build em `mobile/build/web/`.

- [ ] **Step 5: Commit**

```bash
git add mobile/
git commit -m "feat(mobile): scaffold Flutter Web do LegisBot Campo"
```

### Task 2: Tema Apple Design System

**Files:**
- Create: `mobile/lib/theme/app_theme.dart`

- [ ] **Step 1: Criar o tema**

```dart
import 'package:flutter/material.dart';

class AppColors {
  static const primary = Color(0xFF0066CC);
  static const ink = Color(0xFF1D1D1F);
  static const parchment = Color(0xFFF5F5F7);
  static const tile = Color(0xFF272729);
}

ThemeData buildAppTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
    scaffoldBackgroundColor: AppColors.parchment,
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.parchment,
      foregroundColor: AppColors.ink,
      elevation: 0,
      centerTitle: true,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        shape: const StadiumBorder(),
        minimumSize: const Size.fromHeight(48),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
    ),
  );
}
```

- [ ] **Step 2: Validar**

Run: `cd mobile && flutter analyze`
Expected: nenhum **erro** (warnings/infos de deprecação são aceitáveis).
(Nota: se qualquer `*Theme` der erro de tipo nesta versão do Flutter, trocar pela variante `*ThemeData` — ou vice-versa; a API mudou entre versões. Vale para `CardTheme`/`CardThemeData` e `InputDecorationTheme`/`InputDecorationThemeData`.)

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/theme/
git commit -m "feat(mobile): tema Apple Design System"
```

### Task 3: Cliente API com mapeamento de erros

**Files:**
- Create: `mobile/lib/api/api_client.dart`
- Test: `mobile/test/api_client_test.dart`

- [ ] **Step 1: Escrever testes que falham**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:legisbot_campo/api/api_client.dart';

ApiClient clientReturning(int status, String body, {String? token}) {
  final mock = MockClient((req) async => http.Response(body, status));
  return ApiClient(httpClient: mock, baseUrl: 'http://test', tokenProvider: () => token);
}

void main() {
  test('401 vira UnauthorizedException', () async {
    final api = clientReturning(401, '{}');
    expect(() => api.get('/dashboard'), throwsA(isA<UnauthorizedException>()));
  });

  test('500 vira ServerException', () async {
    final api = clientReturning(500, 'oops');
    expect(() => api.get('/dashboard'), throwsA(isA<ServerException>()));
  });

  test('200 decodifica JSON e envia Bearer token', () async {
    late http.Request captured;
    final mock = MockClient((req) async {
      captured = req;
      return http.Response('{"ok": true}', 200);
    });
    final api = ApiClient(httpClient: mock, baseUrl: 'http://test', tokenProvider: () => 'tok123');
    final data = await api.get('/dashboard');
    expect(data['ok'], true);
    expect(captured.headers['Authorization'], 'Bearer tok123');
  });

  test('falha de rede vira NetworkException', () async {
    final mock = MockClient((req) async => throw http.ClientException('refused'));
    final api = ApiClient(httpClient: mock, baseUrl: 'http://test', tokenProvider: () => null);
    expect(() => api.get('/dashboard'), throwsA(isA<NetworkException>()));
  });
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd mobile && flutter test test/api_client_test.dart`
Expected: FAIL (api_client.dart não existe).

- [ ] **Step 3: Implementar o cliente**

```dart
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

const apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://automacoes-legisbot.sqcx8c.easypanel.host',
);

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class UnauthorizedException extends ApiException {
  UnauthorizedException() : super('Sessão expirada');
}

class ServerException extends ApiException {
  ServerException() : super('Erro no servidor, tente novamente');
}

class NetworkException extends ApiException {
  NetworkException() : super('Sem conexão');
}

class ApiClient {
  final http.Client _http;
  final String baseUrl;
  final String? Function() tokenProvider;
  static const _timeout = Duration(seconds: 15);

  ApiClient({http.Client? httpClient, this.baseUrl = apiBaseUrl, required this.tokenProvider})
      : _http = httpClient ?? http.Client();

  Future<dynamic> get(String path, [Map<String, String>? query]) async {
    final uri = Uri.parse('$baseUrl$path')
        .replace(queryParameters: (query?.isEmpty ?? true) ? null : query);
    try {
      final res = await _http.get(uri, headers: _headers()).timeout(_timeout);
      return _decode(res);
    } on TimeoutException {
      throw NetworkException();
    } on http.ClientException {
      throw NetworkException();
    }
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('$baseUrl$path');
    try {
      final res = await _http
          .post(uri, headers: _headers(), body: jsonEncode(body))
          .timeout(_timeout);
      return _decode(res);
    } on TimeoutException {
      throw NetworkException();
    } on http.ClientException {
      throw NetworkException();
    }
  }

  Map<String, String> _headers() {
    final token = tokenProvider();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  dynamic _decode(http.Response res) {
    if (res.statusCode == 401) throw UnauthorizedException();
    if (res.statusCode >= 500) throw ServerException();
    if (res.statusCode >= 400) {
      throw ApiException('Erro ${res.statusCode}');
    }
    return jsonDecode(utf8.decode(res.bodyBytes));
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd mobile && flutter test test/api_client_test.dart`
Expected: `All tests passed!`

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/api/api_client.dart mobile/test/api_client_test.dart
git commit -m "feat(mobile): cliente API com timeout e mapeamento 401/5xx/rede"
```

## Chunk 2: Modelos e Auth

### Task 4: Modelos da API

**Files:**
- Create: `mobile/lib/api/models.dart`
- Test: `mobile/test/models_test.dart`

- [ ] **Step 1: Escrever testes de parsing que falham**

Usar JSON com a forma REAL da API (ids string, números int):

```dart
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

  test('MunicipioResumo tolera campos nulos', () {
    final m = MunicipioResumo.fromJson({'id': '1', 'nome': 'ADAMANTINA'});
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd mobile && flutter test test/models_test.dart`
Expected: FAIL (models.dart não existe).

- [ ] **Step 3: Implementar os modelos**

```dart
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

String _toStr(dynamic v) => v?.toString() ?? '';

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

  /// A API não devolve percentual — calculado no cliente.
  double percentualDe(TipoProjecao t) =>
      totalProjecao == 0 ? 0 : t.totalProjecao * 100 / totalProjecao;
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

  /// Agrupa por divisão regional (vazia vira "SEM DIVISÃO").
  Map<String, List<MunicipioResumo>> porDivisao() {
    final out = <String, List<MunicipioResumo>>{};
    for (final m in municipios) {
      final key = m.divisaoRegional.isEmpty ? 'SEM DIVISÃO' : m.divisaoRegional;
      out.putIfAbsent(key, () => []).add(m);
    }
    return out;
  }
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd mobile && flutter test test/models_test.dart`
Expected: `All tests passed!`

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/api/models.dart mobile/test/models_test.dart
git commit -m "feat(mobile): modelos da API com parsing tolerante"
```

### Task 5: AuthService — login JWT + lembrar senha

**Files:**
- Create: `mobile/lib/auth/auth_service.dart`
- Test: `mobile/test/auth_service_test.dart`

- [ ] **Step 1: Escrever testes que falham**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:legisbot_campo/api/api_client.dart';
import 'package:legisbot_campo/auth/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _loginOk = '{"access_token":"tok123","user":{"id":"1","email":"a@b.com","nome":"Admin"}}';

Future<AuthService> buildAuth({Map<String, Object> initial = const {}}) async {
  SharedPreferences.setMockInitialValues(initial);
  final prefs = await SharedPreferences.getInstance();
  final mock = MockClient((req) async => http.Response(_loginOk, 201));
  final svc = AuthService(prefs);
  return AuthService(prefs,
      apiClient: ApiClient(httpClient: mock, baseUrl: 'http://test', tokenProvider: () => svc.token));
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('login com lembrar=true salva token e credenciais', () async {
    final auth = await buildAuth();
    await auth.login(email: 'a@b.com', senha: '123456', lembrar: true);
    expect(auth.isLoggedIn, true);
    expect(auth.savedEmail, 'a@b.com');
    expect(auth.savedSenha, '123456');
    expect(auth.userNome, 'Admin');
  });

  test('login com lembrar=false remove credenciais salvas antes', () async {
    final auth = await buildAuth(initial: {'savedEmail': 'x@y.com', 'savedSenha': 'old'});
    await auth.login(email: 'a@b.com', senha: '123456', lembrar: false);
    expect(auth.savedEmail, null);
    expect(auth.savedSenha, null);
  });

  test('logout limpa token mas preserva credenciais salvas', () async {
    final auth = await buildAuth();
    await auth.login(email: 'a@b.com', senha: '123456', lembrar: true);
    await auth.logout();
    expect(auth.isLoggedIn, false);
    expect(auth.savedEmail, 'a@b.com');
  });

  test('credenciais salvas ficam disponíveis para pré-preenchimento', () async {
    final auth = await buildAuth(initial: {'savedEmail': 'a@b.com', 'savedSenha': '123456'});
    expect(auth.savedEmail, 'a@b.com');
    expect(auth.savedSenha, '123456');
  });
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd mobile && flutter test test/auth_service_test.dart`
Expected: FAIL (auth_service.dart não existe).

- [ ] **Step 3: Implementar**

```dart
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';

/// Chaves no shared_preferences (localStorage no web).
const _kToken = 'token';
const _kUserNome = 'userNome';
const _kSavedEmail = 'savedEmail';
const _kSavedSenha = 'savedSenha';

class AuthService extends ChangeNotifier {
  final SharedPreferences _prefs;
  late final ApiClient api;

  AuthService(this._prefs, {ApiClient? apiClient}) {
    api = apiClient ?? ApiClient(tokenProvider: () => token);
  }

  String? get token => _prefs.getString(_kToken);
  bool get isLoggedIn => token != null;
  String get userNome => _prefs.getString(_kUserNome) ?? '';
  String? get savedEmail => _prefs.getString(_kSavedEmail);
  String? get savedSenha => _prefs.getString(_kSavedSenha);

  Future<void> login({required String email, required String senha, required bool lembrar}) async {
    final data = await api.post('/auth/login', {'email': email, 'senha': senha});
    await _prefs.setString(_kToken, data['access_token'] as String);
    await _prefs.setString(_kUserNome, (data['user']?['nome'] ?? '').toString());
    if (lembrar) {
      await _prefs.setString(_kSavedEmail, email);
      await _prefs.setString(_kSavedSenha, senha);
    } else {
      await _prefs.remove(_kSavedEmail);
      await _prefs.remove(_kSavedSenha);
    }
    notifyListeners();
  }

  /// Limpa só a sessão; credenciais salvas (lembrar senha) permanecem.
  Future<void> logout() async {
    await _prefs.remove(_kToken);
    await _prefs.remove(_kUserNome);
    notifyListeners();
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd mobile && flutter test test/auth_service_test.dart`
Expected: `All tests passed!`

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/auth/ mobile/test/auth_service_test.dart
git commit -m "feat(mobile): AuthService com JWT e lembrar senha"
```

## Chunk 3: UI — Telas e Navegação

### Task 6: Splash screen e PWA

**Files:**
- Modify: `mobile/web/index.html`
- Modify: `mobile/web/manifest.json`

- [ ] **Step 1: Splash no index.html**

No `<head>` de `mobile/web/index.html`, adicionar o CSS; no `<body>`, o div ANTES do script do Flutter. O Flutter dispara `flutter-first-frame` quando renderiza — usamos isso para remover o splash.

```html
<style>
  #splash {
    position: fixed; inset: 0; z-index: 9999;
    background: #0066cc;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    transition: opacity .3s ease-out;
  }
  #splash img { width: 96px; height: 96px; border-radius: 22px; }
  #splash p { color: #fff; font-family: -apple-system, system-ui, sans-serif;
              font-size: 17px; margin-top: 16px; font-weight: 600; }
  #splash .bar { width: 120px; height: 3px; margin-top: 24px; border-radius: 3px;
                 background: rgba(255,255,255,.25); overflow: hidden; }
  #splash .bar::after { content: ''; display: block; width: 40%; height: 100%;
                        background: #fff; border-radius: 3px;
                        animation: slide 1.2s ease-in-out infinite; }
  @keyframes slide { 0% {transform: translateX(-100%);} 100% {transform: translateX(350%);} }
</style>
```

```html
<div id="splash">
  <img src="icons/Icon-512.png" alt="LegisBot Campo">
  <p>LegisBot Campo</p>
  <div class="bar"></div>
</div>
<script>
  window.addEventListener('flutter-first-frame', function () {
    var s = document.getElementById('splash');
    if (s) { s.style.opacity = '0'; setTimeout(function () { s.remove(); }, 300); }
  });
</script>
```

Também atualizar `<title>LegisBot Campo</title>` e meta `theme-color` para `#0066cc`.

**Nota (desvio intencional do spec):** o `flutter_native_splash` citado no spec fica ADIADO para o milestone do APK nativo — v1 é web-only e o pacote não agrega nada no browser. Registrar no commit message.

- [ ] **Step 2: manifest.json**

```json
{
  "name": "LegisBot Campo",
  "short_name": "LegisBot",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#0066cc",
  "theme_color": "#0066cc",
  "description": "App de campo do LegisBot — consultas de municípios e territórios",
  "orientation": "portrait-primary",
  "prefer_related_applications": false,
  "icons": [
    { "src": "icons/Icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/Icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/Icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/Icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

(Os ícones padrão do Flutter já existem em `web/icons/`; a troca pela identidade visual final pode vir depois — o usuário fornecerá a arte. NÃO bloquear o plano nisso.)

- [ ] **Step 3: Validar build**

Run: `cd mobile && flutter build web --release && grep -c splash build/web/index.html`
Expected: build ok, grep retorna ≥1.

- [ ] **Step 4: Commit**

```bash
git add mobile/web/
git commit -m "feat(mobile): splash screen HTML e manifest PWA"
```

### Task 7: Tela de Login (com lembrar senha)

**Files:**
- Create: `mobile/lib/screens/login_screen.dart`
- Test: `mobile/test/login_screen_test.dart`

- [ ] **Step 1: Widget test que falha**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:legisbot_campo/auth/auth_service.dart';
import 'package:legisbot_campo/screens/login_screen.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('pré-preenche email e senha salvos', (tester) async {
    SharedPreferences.setMockInitialValues({'savedEmail': 'a@b.com', 'savedSenha': '123456'});
    final prefs = await SharedPreferences.getInstance();
    final auth = AuthService(prefs);
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: auth,
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    expect(find.widgetWithText(TextField, 'a@b.com'), findsOneWidget);
    final checkbox = tester.widget<CheckboxListTile>(find.byType(CheckboxListTile));
    expect(checkbox.value, true);
  });

  testWidgets('sem credenciais salvas, campos vazios e checkbox desmarcado', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final auth = AuthService(prefs);
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: auth,
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    final checkbox = tester.widget<CheckboxListTile>(find.byType(CheckboxListTile));
    expect(checkbox.value, false);
  });
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd mobile && flutter test test/login_screen_test.dart`
Expected: FAIL.

- [ ] **Step 3: Implementar a tela**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../auth/auth_service.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late final TextEditingController _email;
  late final TextEditingController _senha;
  late bool _lembrar;
  bool _loading = false;
  String? _erro;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthService>();
    _email = TextEditingController(text: auth.savedEmail ?? '');
    _senha = TextEditingController(text: auth.savedSenha ?? '');
    _lembrar = auth.savedEmail != null;
  }

  @override
  void dispose() {
    _email.dispose();
    _senha.dispose();
    super.dispose();
  }

  Future<void> _entrar() async {
    setState(() { _loading = true; _erro = null; });
    try {
      await context.read<AuthService>().login(
            email: _email.text.trim(),
            senha: _senha.text,
            lembrar: _lembrar,
          );
      // Redirecionamento é feito pelo go_router (refreshListenable).
    } on UnauthorizedException {
      // 401 no login = credenciais erradas (não sessão expirada)
      setState(() => _erro = 'Email ou senha inválidos');
    } on ApiException catch (e) {
      setState(() => _erro = e.message);
    } catch (_) {
      setState(() => _erro = 'Email ou senha inválidos');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.location_city, size: 64, color: AppColors.primary),
                const SizedBox(height: 8),
                Text('LegisBot Campo',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: AppColors.ink, fontWeight: FontWeight.w700)),
                const SizedBox(height: 32),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _senha,
                  obscureText: true,
                  onSubmitted: (_) => _entrar(),
                  decoration: const InputDecoration(labelText: 'Senha'),
                ),
                CheckboxListTile(
                  value: _lembrar,
                  onChanged: (v) => setState(() => _lembrar = v ?? false),
                  title: const Text('Lembrar senha'),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
                if (_erro != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(_erro!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red)),
                  ),
                FilledButton(
                  onPressed: _loading ? null : _entrar,
                  child: _loading
                      ? const SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Entrar'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd mobile && flutter test test/login_screen_test.dart`
Expected: `All tests passed!`

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/screens/login_screen.dart mobile/test/login_screen_test.dart
git commit -m "feat(mobile): tela de login com lembrar senha"
```

### Task 8: Widgets compartilhados (cards, erro, formatação)

**Files:**
- Create: `mobile/lib/widgets/common.dart`

- [ ] **Step 1: Implementar**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../auth/auth_service.dart';
import '../theme/app_theme.dart';

/// Votos MV 2022 — número OFICIAL (o DB soma 98.995 com ruído; nunca usar a soma).
const votosMv2022Oficial = 98557;

/// Executa o fetch; em 401 desloga (o router redireciona para /login
/// com os campos pré-preenchidos se "lembrar senha" estiver ativo).
Future<T> guardedFetch<T>(BuildContext context, Future<T> Function(ApiClient api) fn) async {
  final auth = context.read<AuthService>();
  try {
    return await fn(auth.api);
  } on UnauthorizedException {
    await auth.logout();
    rethrow;
  }
}

/// 12345 → "12.345" (padrão pt-BR sem depender do pacote intl).
String formatNum(num v) {
  final s = v.round().toString();
  final out = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) out.write('.');
    out.write(s[i]);
  }
  return out.toString();
}

class StatCard extends StatelessWidget {
  final String label;
  final String value;
  const StatCard({super.key, required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.primary, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.black54)),
          ],
        ),
      ),
    );
  }
}

class MunicipioCard extends StatelessWidget {
  final MunicipioResumo municipio;
  final VoidCallback onTap;
  const MunicipioCard({super.key, required this.municipio, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final m = municipio;
    final subtitle = [m.regiao, m.divisaoRegional.isNotEmpty ? m.divisaoRegional : m.bloco]
        .where((s) => s.isNotEmpty)
        .join(' • ');
    return Card(
      child: ListTile(
        onTap: onTap,
        title: Text(m.nome, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle.isEmpty ? '—' : subtitle),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(formatNum(m.projecaoVotos),
                style: const TextStyle(
                    color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 16)),
            const Text('projeção', style: TextStyle(fontSize: 11, color: Colors.black45)),
          ],
        ),
      ),
    );
  }
}

/// Erro padronizado: mensagem do ApiException + botão tentar de novo.
class ErrorView extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;
  const ErrorView({super.key, required this.error, required this.onRetry});
  @override
  Widget build(BuildContext context) {
    final msg = error is ApiException ? (error as ApiException).message : 'Algo deu errado';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off, size: 48, color: Colors.black26),
            const SizedBox(height: 12),
            Text(msg, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Tentar de novo')),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Validar**

Run: `cd mobile && flutter analyze`
Expected: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/widgets/
git commit -m "feat(mobile): widgets compartilhados (stat card, municipio card, erro)"
```

### Task 9: Router, shell de navegação e tratamento global de 401

**Files:**
- Create: `mobile/lib/app_router.dart`
- Modify: `mobile/lib/main.dart`

- [ ] **Step 1: Implementar o router**

`mobile/lib/app_router.dart` (telas das Tasks 10-12 são referenciadas aqui; se executando em ordem, criar os arquivos de tela como stubs com estas assinaturas exatas e corpo `=> const Scaffold(body: Placeholder())`, substituindo-os nas tasks seguintes):

```dart
// Stubs temporários até as Tasks 10-12:
class DashboardScreen extends StatelessWidget { const DashboardScreen({super.key}); ... }
class BuscaScreen extends StatelessWidget { const BuscaScreen({super.key}); ... }
class TerritoriosScreen extends StatelessWidget { const TerritoriosScreen({super.key}); ... }
class MunicipioScreen extends StatelessWidget { final String id; const MunicipioScreen({super.key, required this.id}); ... }
class RegiaoScreen extends StatelessWidget { final String regiao; const RegiaoScreen({super.key, required this.regiao}); ... }
class DivisaoScreen extends StatelessWidget { final String regiao; final String divisao; const DivisaoScreen({super.key, required this.regiao, required this.divisao}); ... }
```

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'auth/auth_service.dart';
import 'screens/busca_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'screens/municipio_screen.dart';
import 'screens/territorios_screen.dart';

GoRouter buildRouter(AuthService auth) {
  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: auth,
    redirect: (context, state) {
      final logged = auth.isLoggedIn;
      final indoParaLogin = state.matchedLocation == '/login';
      if (!logged && !indoParaLogin) return '/login';
      if (logged && indoParaLogin) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/municipio/:id',
          builder: (_, s) => MunicipioScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/territorios/regiao/:regiao',
          builder: (_, s) => RegiaoScreen(regiao: s.pathParameters['regiao']!)),
      GoRoute(path: '/territorios/regiao/:regiao/divisao/:divisao',
          builder: (_, s) => DivisaoScreen(
              regiao: s.pathParameters['regiao']!,
              divisao: s.pathParameters['divisao']!)),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => _NavShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/busca', builder: (_, __) => const BuscaScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/territorios', builder: (_, __) => const TerritoriosScreen()),
          ]),
        ],
      ),
    ],
  );
}

class _NavShell extends StatelessWidget {
  final StatefulNavigationShell shell;
  const _NavShell({required this.shell});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: shell.goBranch,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.search), label: 'Busca'),
          NavigationDestination(icon: Icon(Icons.map_outlined),
              selectedIcon: Icon(Icons.map), label: 'Territórios'),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: main.dart definitivo**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app_router.dart';
import 'auth/auth_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(LegisBotCampoApp(auth: AuthService(prefs)));
}

class LegisBotCampoApp extends StatelessWidget {
  final AuthService auth;
  const LegisBotCampoApp({super.key, required this.auth});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: auth,
      child: MaterialApp.router(
        title: 'LegisBot Campo',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        routerConfig: buildRouter(auth),
      ),
    );
  }
}
```

**Tratamento global de 401:** as telas capturam `UnauthorizedException` no FutureBuilder e chamam `auth.logout()` (ver helper `guardedFetch` na Task 8, em `widgets/common.dart`); como o router usa `refreshListenable: auth`, o redirect para `/login` é automático e os campos vêm pré-preenchidos se "lembrar senha" estiver ativo.

- [ ] **Step 3: Validar**

Run: `cd mobile && flutter analyze`
Expected: `No issues found!` (com stubs para as telas ainda não criadas, se necessário).

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/main.dart mobile/lib/app_router.dart
git commit -m "feat(mobile): go_router com guard de auth e bottom nav"
```

### Task 10: Dashboard

**Files:**
- Create: `mobile/lib/screens/dashboard_screen.dart`

- [ ] **Step 1: Implementar**

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../auth/auth_service.dart';
import '../widgets/common.dart';

class DashboardData {
  final DashboardStats stats;
  final List<RankingItem> top10;
  DashboardData(this.stats, this.top10);
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<DashboardData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<DashboardData> _load() => guardedFetch(context, (api) async {
        final stats = DashboardStats.fromJson(await api.get('/dashboard'));
        final ranking = await api.get('/ranking', {'limit': '10'});
        final top10 = ((ranking['data'] as List?) ?? [])
            .map((e) => RankingItem.fromJson(e as Map<String, dynamic>))
            .toList();
        return DashboardData(stats, top10);
      });

  Future<void> _refresh() async {
    setState(() => _future = _load());
    // erro é exibido pelo FutureBuilder; evita unhandled error no RefreshIndicator
    await _future.catchError((_) => DashboardData(
        DashboardStats(totalMunicipios: 0, totalProjecao: 0, porTipo: []), []));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Sair',
            icon: const Icon(Icons.logout),
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: FutureBuilder<DashboardData>(
        future: _future,
        builder: (context, snap) {
          if (snap.hasError) {
            return ErrorView(error: snap.error!, onRetry: _refresh);
          }
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final d = snap.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.6,
                  children: [
                    StatCard(label: 'Projeção total', value: formatNum(d.stats.totalProjecao)),
                    StatCard(label: 'Municípios', value: formatNum(d.stats.totalMunicipios)),
                    // número oficial — referência, não vem da API (regra do projeto)
                    StatCard(label: 'Votos MV 2022', value: formatNum(votosMv2022Oficial)),
                    StatCard(
                        label: 'Tipos de cadastro', value: d.stats.porTipo.length.toString()),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Projeção por tipo', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                ...d.stats.porTipo.map((t) => Card(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      child: ListTile(
                        dense: true,
                        title: Text(t.tipo),
                        subtitle: Text('${t.totalRegistros} registros'),
                        trailing: Text(
                            '${formatNum(t.totalProjecao)}  '
                            '(${d.stats.percentualDe(t).toStringAsFixed(1)}%)',
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    )),
                const SizedBox(height: 24),
                Text('Top 10 municípios', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                ...d.top10.map((r) => Card(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      child: ListTile(
                        dense: true,
                        leading: CircleAvatar(
                            radius: 14, child: Text('${r.posicao}',
                                style: const TextStyle(fontSize: 12))),
                        title: Text(r.nome),
                        subtitle: Text(r.regiao),
                        trailing: Text(formatNum(r.projecaoVotos),
                            style: const TextStyle(fontWeight: FontWeight.w700)),
                        onTap: () => context.push('/municipio/${r.id}'),
                      ),
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}
```

- [ ] **Step 2: Validar**

Run: `cd mobile && flutter analyze && flutter test`
Expected: sem erros; testes existentes seguem passando.

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/screens/dashboard_screen.dart
git commit -m "feat(mobile): dashboard com stats, tipos e top 10"
```

### Task 11: Busca + Ficha do município

**Files:**
- Create: `mobile/lib/screens/busca_screen.dart`
- Create: `mobile/lib/screens/municipio_screen.dart`
- Test: `mobile/test/busca_screen_test.dart`

- [ ] **Step 1: Widget test da busca que falha**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:legisbot_campo/api/api_client.dart';
import 'package:legisbot_campo/auth/auth_service.dart';
import 'package:legisbot_campo/screens/busca_screen.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _buscaJson = '''
{"query":"camp","total":1,"municipios":[
  {"id":"7","nome":"CAMPINAS","regiao":"METROPOLITANA","bloco":"BLOCO 2",
   "projecao_votos":4500,"coordenacao":"COORD X","lideranca":"LIDER Y","eleitores_22":800000}
]}''';

void main() {
  testWidgets('digitar consulta exibe resultados após debounce', (tester) async {
    SharedPreferences.setMockInitialValues({'token': 'tok'});
    final prefs = await SharedPreferences.getInstance();
    final mock = MockClient((req) async => http.Response(_buscaJson, 200));
    final auth = AuthService(prefs,
        apiClient: ApiClient(httpClient: mock, baseUrl: 'http://test', tokenProvider: () => 'tok'));
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: auth,
        child: const MaterialApp(home: BuscaScreen()),
      ),
    );
    await tester.enterText(find.byType(TextField), 'camp');
    await tester.pump(const Duration(milliseconds: 500)); // debounce
    await tester.pumpAndSettle();
    expect(find.text('CAMPINAS'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd mobile && flutter test test/busca_screen_test.dart`
Expected: FAIL.

- [ ] **Step 3: Implementar BuscaScreen**

```dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/models.dart';
import '../widgets/common.dart';

class BuscaScreen extends StatefulWidget {
  const BuscaScreen({super.key});
  @override
  State<BuscaScreen> createState() => _BuscaScreenState();
}

class _BuscaScreenState extends State<BuscaScreen> {
  Timer? _debounce;
  String _query = '';
  Future<List<MunicipioResumo>>? _future;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      final q = value.trim();
      setState(() {
        _query = q;
        _future = q.length < 2 ? null : _buscar(q);
      });
    });
  }

  Future<List<MunicipioResumo>> _buscar(String q) =>
      guardedFetch(context, (api) async {
        final data = await api.get('/busca', {'q': q, 'limit': '25'});
        return ((data['municipios'] as List?) ?? [])
            .map((e) => MunicipioResumo.fromJson(e as Map<String, dynamic>))
            .toList();
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Busca')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: _onChanged,
              autofocus: false,
              decoration: const InputDecoration(
                hintText: 'Buscar município...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: _future == null
                ? const Center(
                    child: Text('Digite ao menos 2 letras',
                        style: TextStyle(color: Colors.black45)))
                : FutureBuilder<List<MunicipioResumo>>(
                    future: _future,
                    builder: (context, snap) {
                      if (snap.hasError) {
                        return ErrorView(
                            error: snap.error!,
                            onRetry: () => setState(() => _future = _buscar(_query)));
                      }
                      if (!snap.hasData) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      final results = snap.data!;
                      if (results.isEmpty) {
                        return const Center(child: Text('Nenhum município encontrado'));
                      }
                      return ListView.builder(
                        itemCount: results.length,
                        itemBuilder: (_, i) => MunicipioCard(
                          municipio: results[i],
                          onTap: () => context.push('/municipio/${results[i].id}'),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 4: Implementar MunicipioScreen (ficha)**

```dart
import 'package:flutter/material.dart';

import '../api/models.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

class MunicipioScreen extends StatefulWidget {
  final String id;
  const MunicipioScreen({super.key, required this.id});
  @override
  State<MunicipioScreen> createState() => _MunicipioScreenState();
}

class _MunicipioScreenState extends State<MunicipioScreen> {
  late Future<MunicipioFicha> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<MunicipioFicha> _load() => guardedFetch(context,
      (api) async => MunicipioFicha.fromJson(await api.get('/municipios/${widget.id}')));

  Widget _linha(String label, String valor) {
    if (valor.isEmpty || valor == '0') return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: Colors.black54))),
          Expanded(
              child: Text(valor,
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }

  Widget _secao(String titulo, List<Widget> linhas) {
    final visiveis = linhas.where((w) => w is! SizedBox).toList();
    if (visiveis.isEmpty) return const SizedBox.shrink();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(titulo,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, color: AppColors.primary)),
            const SizedBox(height: 8),
            ...linhas,
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Município')),
      body: FutureBuilder<MunicipioFicha>(
        future: _future,
        builder: (context, snap) {
          if (snap.hasError) {
            return ErrorView(error: snap.error!, onRetry: () => setState(() => _future = _load()));
          }
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final f = snap.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(f.nome,
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w700, color: AppColors.ink)),
              const SizedBox(height: 4),
              Text([f.regiao, f.divisaoRegional].where((s) => s.isNotEmpty).join(' • '),
                  style: const TextStyle(color: Colors.black54)),
              const SizedBox(height: 16),
              _secao('Projeções', [
                _linha('Projeção de votos', formatNum(f.projecaoVotos)),
                _linha('Projeção 2', formatNum(f.projecao2)),
                _linha('Apoio IURD', formatNum(f.projecaoApoioIurd)),
                _linha('Base', formatNum(f.projecaoBase)),
                _linha('Tipo de cadastro', f.tipoCadastro),
              ]),
              _secao('Equipe', [
                _linha('Coordenação', f.coordenacao),
                _linha('Liderança', f.lideranca),
                _linha('Função/Cargo', f.funcaoCargo),
                _linha('Coord./Liderança 2', f.coordLideranca2),
                _linha('Função/Cargo 2', f.funcaoCargo2),
              ]),
              _secao('Eleitoral 2022', [
                _linha('Eleitores', formatNum(f.eleitores22)),
                _linha('Votos MV', formatNum(f.votos22)),
                _linha('Votos válidos', formatNum(f.votosValidos22)),
                _linha('% MV', f.percentualMv > 0
                    ? '${f.percentualMv.toStringAsFixed(2)}%' : ''),
                _linha('Ranking MV', f.rankingMv > 0 ? '${f.rankingMv}º' : ''),
              ]),
              _secao('Território', [
                _linha('Bloco', f.bloco),
                _linha('RM/RA', f.rmRa),
              ]),
              if (f.observacoes.isNotEmpty)
                _secao('Observações', [
                  Text(f.observacoes),
                ]),
            ],
          );
        },
      ),
    );
  }
}
```

- [ ] **Step 5: Rodar testes**

Run: `cd mobile && flutter test && flutter analyze`
Expected: `All tests passed!`, `No issues found!`

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/screens/busca_screen.dart mobile/lib/screens/municipio_screen.dart mobile/test/busca_screen_test.dart
git commit -m "feat(mobile): busca com debounce e ficha completa do município"
```

### Task 12: Territórios (região → divisão → municípios)

**Files:**
- Create: `mobile/lib/screens/territorios_screen.dart`

- [ ] **Step 1: Implementar as 3 telas do drill-down num arquivo**

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/models.dart';
import '../widgets/common.dart';

/// Nível 1: lista de regiões (de /filtros/opcoes).
/// Nota: o drill-down de divisão refaz GET /stats/regiao/:regiao e filtra no
/// cliente (em vez de GET /municipios?divisao_regional= da tabela do spec) —
/// desvio intencional: mantém a tela stateless em F5 sem endpoint adicional.
class TerritoriosScreen extends StatefulWidget {
  const TerritoriosScreen({super.key});
  @override
  State<TerritoriosScreen> createState() => _TerritoriosScreenState();
}

class _TerritoriosScreenState extends State<TerritoriosScreen> {
  late Future<FiltrosOpcoes> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<FiltrosOpcoes> _load() => guardedFetch(
      context, (api) async => FiltrosOpcoes.fromJson(await api.get('/filtros/opcoes')));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Territórios')),
      body: FutureBuilder<FiltrosOpcoes>(
        future: _future,
        builder: (context, snap) {
          if (snap.hasError) {
            return ErrorView(error: snap.error!, onRetry: () => setState(() => _future = _load()));
          }
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final regioes = snap.data!.regioes;
          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: regioes.length,
            itemBuilder: (_, i) => Card(
              child: ListTile(
                title: Text(regioes[i], style: const TextStyle(fontWeight: FontWeight.w600)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () =>
                    context.push('/territorios/regiao/${Uri.encodeComponent(regioes[i])}'),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Nível 2: stats da região + divisões agrupadas.
class RegiaoScreen extends StatefulWidget {
  final String regiao;
  const RegiaoScreen({super.key, required this.regiao});
  @override
  State<RegiaoScreen> createState() => _RegiaoScreenState();
}

class _RegiaoScreenState extends State<RegiaoScreen> {
  late Future<RegiaoStats> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<RegiaoStats> _load() => guardedFetch(context, (api) async =>
      RegiaoStats.fromJson(
          await api.get('/stats/regiao/${Uri.encodeComponent(widget.regiao)}')));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.regiao)),
      body: FutureBuilder<RegiaoStats>(
        future: _future,
        builder: (context, snap) {
          if (snap.hasError) {
            return ErrorView(error: snap.error!, onRetry: () => setState(() => _future = _load()));
          }
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final s = snap.data!;
          final divisoes = s.porDivisao().entries.toList()
            ..sort((a, b) => a.key.compareTo(b.key));
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(children: [
                Expanded(
                    child: StatCard(label: 'Municípios', value: formatNum(s.totalMunicipios))),
                const SizedBox(width: 12),
                Expanded(
                    child: StatCard(label: 'Projeção', value: formatNum(s.totalProjecao))),
              ]),
              const SizedBox(height: 16),
              Text('Divisões', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...divisoes.map((d) => Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      title: Text(d.key),
                      subtitle: Text('${d.value.length} municípios'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push(
                          '/territorios/regiao/${Uri.encodeComponent(widget.regiao)}'
                          '/divisao/${Uri.encodeComponent(d.key)}'),
                    ),
                  )),
            ],
          );
        },
      ),
    );
  }
}

/// Nível 3: municípios da divisão (refaz o fetch da região e filtra — stateless em F5).
class DivisaoScreen extends StatefulWidget {
  final String regiao;
  final String divisao;
  const DivisaoScreen({super.key, required this.regiao, required this.divisao});
  @override
  State<DivisaoScreen> createState() => _DivisaoScreenState();
}

class _DivisaoScreenState extends State<DivisaoScreen> {
  late Future<List<MunicipioResumo>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<MunicipioResumo>> _load() => guardedFetch(context, (api) async {
        final stats = RegiaoStats.fromJson(
            await api.get('/stats/regiao/${Uri.encodeComponent(widget.regiao)}'));
        return stats.porDivisao()[widget.divisao] ?? [];
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.divisao)),
      body: FutureBuilder<List<MunicipioResumo>>(
        future: _future,
        builder: (context, snap) {
          if (snap.hasError) {
            return ErrorView(error: snap.error!, onRetry: () => setState(() => _future = _load()));
          }
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final municipios = snap.data!
            ..sort((a, b) => b.projecaoVotos.compareTo(a.projecaoVotos));
          if (municipios.isEmpty) {
            return const Center(child: Text('Nenhum município nesta divisão'));
          }
          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: municipios.length,
            itemBuilder: (_, i) => MunicipioCard(
              municipio: municipios[i],
              onTap: () => context.push('/municipio/${municipios[i].id}'),
            ),
          );
        },
      ),
    );
  }
}
```

- [ ] **Step 2: Rodar tudo**

Run: `cd mobile && flutter analyze && flutter test && flutter build web --release`
Expected: tudo verde, build ok.

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/screens/territorios_screen.dart
git commit -m "feat(mobile): territórios com drill-down região > divisão > municípios"
```

## Chunk 4: Backend, Deploy e Verificação

### Task 13: CORS — lista de origens no backend

**Files:**
- Modify: `backend/src/main.ts:8-11`

- [ ] **Step 1: Editar main.ts**

Trocar:
```typescript
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
```
por:
```typescript
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
```
Retrocompatível: um valor único continua funcionando (vira lista de 1).

- [ ] **Step 2: Validar compilação**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main.ts
git commit -m "feat(backend): CORS aceita lista de origens (web + mobile)"
```

**⚠️ Ação do usuário (produção):** atualizar a env `FRONTEND_URL` no EasyPanel do serviço `automacoes_legisbot` para
`https://legisbot.shiftworks.app.br,https://app.legisbot.shiftworks.app.br` (regra do projeto: nunca editar .env diretamente — pedir ao usuário).

### Task 14: Dockerfile + nginx do mobile

**Files:**
- Create: `mobile/Dockerfile`
- Create: `mobile/nginx.conf`
- Create: `mobile/.dockerignore`

- [ ] **Step 1: Dockerfile**

```dockerfile
FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app
COPY pubspec.* ./
RUN flutter pub get
COPY . .
RUN flutter build web --release \
    --dart-define=API_URL=https://automacoes-legisbot.sqcx8c.easypanel.host

FROM nginx:alpine
COPY --from=build /app/build/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 2: nginx.conf**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # O service worker e o index nunca podem ser cacheados pelo proxy/navegador
    location ~* ^/(index\.html|flutter_service_worker\.js|version\.json|manifest\.json)$ {
        add_header Cache-Control "no-cache";
    }

    # Assets fingerprintados podem cachear por muito tempo
    location ~* \.(js|wasm|png|jpg|woff2?|otf|ttf)$ {
        add_header Cache-Control "public, max-age=604800";
    }

    gzip on;
    gzip_types text/css application/javascript application/wasm application/json;
}
```

- [ ] **Step 3: .dockerignore**

```
build/
.dart_tool/
.idea/
*.iml
```

- [ ] **Step 4: Validar build Docker local (opcional, demorado) ou só conferir sintaxe**

Run: `docker build -t legisbot-mobile:test mobile/` (se o Docker local estiver disponível; senão validar na VPS no deploy)
Expected: imagem construída; `docker run --rm -p 8089:80 legisbot-mobile:test` serve o app em `http://localhost:8089`.

- [ ] **Step 5: Commit**

```bash
git add mobile/Dockerfile mobile/nginx.conf mobile/.dockerignore
git commit -m "feat(mobile): Dockerfile multi-stage Flutter > nginx"
```

### Task 15: Estender a skill /deploy com o alvo mobile

**Files:**
- Modify: `.claude/skills/deploy/SKILL.md`

- [ ] **Step 1: Adicionar seção ao SKILL.md**

Inserir após o "## Fluxo — Backend" (mesmo padrão sshpass + excludes + verificação dos fluxos existentes), e adicionar `- `/deploy mobile` — deploy apenas do app de campo` na seção "## Uso" + `- **Mobile service**: `automacoes_legisbot_mobile`` na seção "## Configuração":

````markdown
## Fluxo — Mobile (LegisBot Campo)

1. Rsync dos arquivos (excluindo build e .dart_tool):
```bash
sshpass -p 'kBYKfo9tltn4H' rsync -azP --exclude='build' --exclude='.dart_tool' --exclude='.idea' -e 'ssh -o StrictHostKeyChecking=no' "<PROJECT_ROOT>/mobile/" root@66.179.191.53:/tmp/legisbot-mobile/
```

2. Buildar imagem Docker (o Dockerfile já embarca a API_URL via --dart-define — não usar build-arg):
```bash
sshpass -p 'kBYKfo9tltn4H' ssh -o StrictHostKeyChecking=no root@66.179.191.53 '
  cd /tmp/legisbot-mobile &&
  docker build -t legisbot-mobile:latest .
'
```

3. Atualizar o serviço Docker Swarm (primeira vez: o usuário cria o serviço `automacoes_legisbot_mobile` no EasyPanel com a imagem `legisbot-mobile:latest`, porta 80, e configura o domínio no Traefik):
```bash
sshpass -p 'kBYKfo9tltn4H' ssh -o StrictHostKeyChecking=no root@66.179.191.53 'docker service update --force --image legisbot-mobile:latest automacoes_legisbot_mobile'
```

4. Verificar convergencia e checar logs se falhar:
```bash
sshpass -p 'kBYKfo9tltn4H' ssh -o StrictHostKeyChecking=no root@66.179.191.53 'docker service logs --tail 30 automacoes_legisbot_mobile'
```
````

Também adicionar ao "## Checklist pos-deploy": `4. Se mobile, abrir a URL do app e confirmar splash + login`.

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/deploy/SKILL.md
git commit -m "docs(deploy): alvo mobile na skill de deploy"
```

### Task 16: Verificação manual local contra produção

- [ ] **Step 1: Rodar o app local apontando para produção**

```bash
cd mobile && flutter run -d chrome \
  --dart-define=API_URL=https://automacoes-legisbot.sqcx8c.easypanel.host
```
**Nota CORS:** `flutter run -d chrome` roda em porta aleatória de `localhost`, que não está na lista de origens do backend de produção. Para o teste local funcionar, OU rodar o backend local (`cd backend && npm run start:dev`, app com `--dart-define=API_URL=http://localhost:8000`), OU testar direto no ambiente deployado. Não adicionar localhost ao CORS de produção.

- [ ] **Step 2: Checklist manual (executar no app)**

1. Splash aparece e some quando o app carrega.
2. Login com credenciais válidas (usuário fornece) e "Lembrar senha" marcado → entra no Dashboard.
3. Recarregar a página (F5) → continua logado.
4. Dashboard mostra projeção total, 645 municípios (NUNCA mais que 645 — regra do projeto), top 10.
5. Busca: "campinas" → CAMPINAS aparece; tap → ficha completa.
6. Busca: "são josé do rio preto" → retorna o município certo (não São José dos Campos).
7. Territórios: região → divisão → municípios → ficha.
8. Logout → volta ao login com email/senha pré-preenchidos.
9. Desmarcar "Lembrar senha" + login → logout → campos vazios.
10. PWA: menu do Chrome mostra "Instalar app" (após deploy com HTTPS; em localhost o prompt pode não aparecer).

- [ ] **Step 3: Deploy (somente com autorização explícita do usuário)**

⛔ Regra do projeto: NUNCA acessar a VPS sem permissão. Quando o usuário autorizar, usar a skill `/deploy` (alvo mobile) e pedir a ele:
- Criar o serviço `automacoes_legisbot_mobile` no EasyPanel (primeira vez).
- Atualizar `FRONTEND_URL` do backend (Task 13).
- Criar DNS `app.legisbot.shiftworks.app.br` na Cloudflare (ou usar o host padrão `automacoes-legisbot-mobile.sqcx8c.easypanel.host`).

- [ ] **Step 4: Pós-deploy — smoke test em produção**

No celular real: abrir o link, instalar como PWA, repetir checklist itens 1-8.

- [ ] **Step 5: Atualizar Obsidian**

Atualizar `01 - Projetos Ativos/LegisBot/05 - Historico de Mudancas.md` com a entrega do app mobile.
