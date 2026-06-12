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
