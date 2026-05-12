import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Legis BOT — Módulo Robô',
  description: 'Legis BOT — Acesso ao Sistema',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
