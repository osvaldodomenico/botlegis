import 'package:flutter/material.dart';

class TerritoriosScreen extends StatelessWidget {
  const TerritoriosScreen({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Placeholder());
}

class RegiaoScreen extends StatelessWidget {
  final String regiao;
  const RegiaoScreen({super.key, required this.regiao});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Placeholder());
}

class DivisaoScreen extends StatelessWidget {
  final String regiao;
  final String divisao;
  const DivisaoScreen({super.key, required this.regiao, required this.divisao});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Placeholder());
}
