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
