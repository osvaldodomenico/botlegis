import 'package:flutter/foundation.dart';
import 'package:legisbot_campo/api/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
    final token = data is Map ? data['access_token'] as String? : null;
    if (token == null) throw ApiException('Resposta de login inválida');
    await _prefs.setString(_kToken, token);
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
