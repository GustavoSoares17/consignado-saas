import { AIConfig, getAIConfig } from './ai-config';
import { Message } from './store';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const MAX_HISTORY = 12; // últimas mensagens incluídas como contexto

function buildSystemPrompt(cfg: AIConfig, clientName?: string): string {
  const rulesText = cfg.rules
    .map((r, i) => `${i + 1}. Quando o cliente perguntar sobre "${r.trigger}": ${r.response}`)
    .join('\n');

  return [
    `Você é ${cfg.botName}, assistente virtual de atendimento via WhatsApp da GranaTech, uma empresa de crédito que atua com antecipação de FGTS e empréstimo CLT consignado.`,
    `Personalidade e tom de voz: ${cfg.personality}`,
    clientName ? `Você está conversando com o cliente: ${clientName}.` : '',
    '',
    'Cenários e diretrizes de resposta (use como base de conhecimento, adapte à pergunta real do cliente, não copie literalmente):',
    rulesText,
    '',
    'Regras gerais obrigatórias:',
    '- Responda sempre em português do Brasil, de forma curta e natural para WhatsApp (poucas frases, sem markdown).',
    '- Nunca invente taxas, valores de simulação, prazos ou status de aprovação que você não tem certeza. Quando não souber um dado real, diga que um especialista humano vai confirmar.',
    '- Nunca peça senha de banco, código de aplicativo, dados completos de cartão ou qualquer credencial sensível.',
    '- Se o cliente parecer insatisfeito, com reclamação grave, ou pedir explicitamente para falar com humano, avise que vai transferir para um atendente e seja breve.',
    '- Se a mensagem não tiver relação com crédito/FGTS/CLT, redirecione educadamente ao assunto do atendimento.',
  ].filter(Boolean).join('\n');
}

export async function generateAIResponse(
  history: Message[],
  clientName: string | undefined,
  latestText: string
): Promise<string | null> {
  const cfg = await getAIConfig();

  if (!cfg.active) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Sem chave configurada: usa a saudação cadastrada como fallback simples.
    return cfg.greeting;
  }

  const recent = history.slice(-MAX_HISTORY);
  const messages = [
    { role: 'system', content: buildSystemPrompt(cfg, clientName) },
    ...recent.map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body,
    })),
    { role: 'user', content: latestText },
  ];

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 300,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[AI] Erro OpenAI:', err);
      return cfg.greeting;
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    return reply || cfg.greeting;
  } catch (err) {
    console.error('[AI] Falha ao chamar OpenAI:', err);
    return cfg.greeting;
  }
}
