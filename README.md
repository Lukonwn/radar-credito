# Radar de Crédito — Entrega 2 (PostgreSQL no Railway)

Bot conversacional para Telegram com OpenAI e PostgreSQL. O banco é criado automaticamente na primeira inicialização.

## Requisitos
- Node.js 20+ (para execução local)
- Bot criado no @BotFather
- Chave de API da OpenAI com faturamento habilitado
- Projeto Railway com um serviço PostgreSQL e o serviço Node.js

## Variáveis no Railway
Configure no serviço do bot:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` (segredo aleatório, 32+ caracteres)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (opcional; padrão `gpt-4.1-mini`)
- `DATABASE_URL` (referência à variável `DATABASE_URL` do serviço PostgreSQL do Railway)
- `ADMIN_SETUP_SECRET` (segredo aleatório diferente do webhook)
- `ECRED_URL=https://www.credconsulta.online/`

No Railway, adicione PostgreSQL ao projeto. No serviço do bot, crie uma variável `DATABASE_URL` com referência ao serviço do banco, normalmente `${{Postgres.DATABASE_URL}}` (o nome `Postgres` deve corresponder ao nome do seu serviço PostgreSQL).

## Deploy e webhook
1. Envie os arquivos para um repositório privado no GitHub.
2. No Railway, crie um projeto a partir desse repositório.
3. Adicione um serviço PostgreSQL ao mesmo projeto.
4. Configure as variáveis acima e faça deploy.
5. Gere um domínio HTTPS para o serviço Node.js.
6. Chame `POST https://SEU-DOMINIO/admin/set-webhook` com header `x-admin-secret: SEU_ADMIN_SETUP_SECRET` e JSON `{ "publicBaseUrl": "https://SEU-DOMINIO" }`.
7. Teste `GET https://SEU-DOMINIO/health` e envie uma mensagem ao bot.

As tabelas `leads`, `messages`, `lead_memory` e `lead_events` são criadas automaticamente.

## Segurança
- Nunca publique tokens ou chaves no GitHub.
- Não solicite CPF, documentos, senhas ou dados bancários no Telegram.
- Não prometa aprovação nem invente taxas, valores ou condições.
- A página oficial configurada é `https://www.credconsulta.online/`; valide as condições comerciais com a Ecred antes de alimentar a base de conhecimento.
