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
