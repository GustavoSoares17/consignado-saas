# Setup: Integração Meta WhatsApp Cloud API

## O que foi criado

| Arquivo | Função |
|---|---|
| `lib/meta.ts` | Helpers: `sendText`, `sendTemplate`, `markAsRead`, `formatPhone` |
| `app/api/webhook/meta/route.ts` | GET (verificação) + POST (receber mensagens + responder com IA) |
| `app/api/send/route.ts` | Endpoint interno para o dashboard disparar mensagens |
| `.env.example` | Todas as variáveis de ambiente necessárias |

---

## Passo a passo para colocar no ar

### 1. Criar conta no Meta for Developers

1. Acesse https://developers.facebook.com
2. Crie um app → tipo **Business**
3. Adicione o produto **WhatsApp**

### 2. Configurar o número de telefone

Para **testes gratuitos** a Meta fornece um número de teste (sem custo).
Para **produção** você precisa de um número real que ainda não tenha WhatsApp.

No painel: **WhatsApp → Configuração de API**
- Copie o **Phone Number ID** → `META_PHONE_NUMBER_ID`
- Copie o **WABA ID** → `META_WABA_ID`
- Gere o **Access Token** → `META_ACCESS_TOKEN`

### 3. Deploy no Vercel (necessário para o webhook funcionar)

```bash
# Na raiz do projeto
npm install
npx vercel

# Configure as variáveis de ambiente no painel do Vercel:
# Settings → Environment Variables → adicione todas do .env.example
```

Após o deploy você terá uma URL tipo:
`https://seu-projeto.vercel.app`

### 4. Registrar o webhook na Meta

No painel: **WhatsApp → Configuração → Webhooks**

- **URL do callback**: `https://seu-projeto.vercel.app/api/webhook/meta`
- **Token de verificação**: o mesmo valor que você colocou em `META_VERIFY_TOKEN`
- Clique em **Verificar e salvar**

Campos para assinar (Webhook Fields):
- ✅ `messages`
- ✅ `message_status_updates` (opcional, para tracking de entrega)

### 5. Testar envio de mensagem

Com tudo configurado, teste via curl:

```bash
# Enviar texto (janela 24h aberta)
curl -X POST https://seu-projeto.vercel.app/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: SEU_INTERNAL_API_KEY" \
  -d '{"to":"5511987654321","type":"text","text":"Olá! Teste de integração."}'

# Enviar template (qualquer hora)
curl -X POST https://seu-projeto.vercel.app/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: SEU_INTERNAL_API_KEY" \
  -d '{
    "to": "5511987654321",
    "type": "template",
    "template": "recuperacao_biometria_v1",
    "params": ["João", "https://plataforma.com/bio?id=123"]
  }'
```

### 6. Ver logs em tempo real

```bash
npx vercel logs --follow
```

Você verá as mensagens chegando:
```
[Webhook] Mensagem de 5511987654321 (João): "Sim, quero continuar"
[Webhook] Resposta enviada para 5511987654321: "Ótimo! Aqui está o link..."
```

---

## Fluxo completo após configuração

```
Cliente no WhatsApp
       ↓ responde mensagem
Meta Cloud API
       ↓ POST /api/webhook/meta
Seu servidor (Vercel)
       ↓ 1. marca como lida
       ↓ 2. salva no banco
       ↓ 3. chama OpenAI gpt-4o-mini
       ↓ 4. envia resposta via Meta API
Cliente recebe resposta em ~2s
```

---

## Criação de templates

Templates precisam de aprovação da Meta (1h–24h).

Para criar via API (ou use o painel Meta Business Manager):
```bash
curl -X POST "https://graph.facebook.com/v19.0/SEU_WABA_ID/message_templates" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "recuperacao_biometria_v1",
    "language": "pt_BR",
    "category": "MARKETING",
    "components": [
      {
        "type": "BODY",
        "text": "Olá, {{1}}! Notamos que você parou na etapa de biometria. Clique para retomar: {{2}}"
      }
    ]
  }'
```

---

## Custos (referência junho/2025)

| Tipo | Custo aprox. |
|---|---|
| Mensagem iniciada pela empresa (Marketing) | ~R$ 0,30/msg |
| Mensagem iniciada pela empresa (Utility) | ~R$ 0,08/msg |
| Resposta do cliente (dentro da janela 24h) | **Gratuito** |

Para 1.000 leads: custo inicial de ~R$ 300 (templates Marketing) + respostas gratuitas.
