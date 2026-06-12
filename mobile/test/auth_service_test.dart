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

  test('login com lembrar=false não salva credenciais', () async {
    final auth = await buildAuth(
        initial: {'savedEmail': 'old@x.com', 'savedSenha': 'oldpw'});
    await auth.login(email: 'a@b.com', senha: '123456', lembrar: false);
    expect(auth.isLoggedIn, true);
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
