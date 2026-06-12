import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

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
      GoRoute(
          path: '/municipio/:id',
          builder: (_, s) => MunicipioScreen(id: s.pathParameters['id']!)),
      GoRoute(
          path: '/territorios/regiao/:regiao',
          builder: (_, s) => RegiaoScreen(regiao: s.pathParameters['regiao']!)),
      GoRoute(
          path: '/territorios/regiao/:regiao/divisao/:divisao',
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
          NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard),
              label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.search), label: 'Busca'),
          NavigationDestination(
              icon: Icon(Icons.map_outlined),
              selectedIcon: Icon(Icons.map),
              label: 'Territórios'),
        ],
      ),
    );
  }
}
