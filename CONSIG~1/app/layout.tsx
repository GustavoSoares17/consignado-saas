export const metadata = {
  title: 'Consignado SaaS',
  description: 'Plataforma de recuperação de leads consignado CLT',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
