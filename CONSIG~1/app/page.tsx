export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Consignado SaaS — API Online</h1>
      <p>Endpoints disponíveis:</p>
      <ul>
        <li><code>GET /api/webhook/meta</code> — verificação do webhook Meta</li>
        <li><code>POST /api/webhook/meta</code> — recebimento de mensagens WhatsApp</li>
        <li><code>POST /api/send</code> — envio de mensagens (requer x-api-key)</li>
      </ul>
    </main>
  );
}
