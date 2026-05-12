import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MV 2026 — BI Político',
  description: 'Sistema de gestão territorial e projeções políticas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
