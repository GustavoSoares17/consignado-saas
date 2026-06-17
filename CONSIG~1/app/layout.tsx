import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GranaTech — Inbox',
  description: 'Plataforma de mensagens CLT Consignado',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
