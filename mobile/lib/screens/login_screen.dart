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
