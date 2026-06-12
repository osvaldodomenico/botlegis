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
