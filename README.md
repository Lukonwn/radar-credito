# Radar de Crédito — Entrega 1

Bot próprio de Telegram com respostas geradas por IA, memória contextual básica e persistência no Supabase.

## Requisitos
- Node.js 20+
- Bot criado no @BotFather
- Projeto Supabase
- Projeto OpenAI API com faturamento/créditos configurados
- Serviço HTTPS (Railway recomendado)

## Instalação local
1. Extraia o ZIP.
2. Execute `npm install`.
3. Copie `.env.example` para `.env`.
4. Preencha as variáveis.
5. Execute o SQL de `sql/schema.sql` no SQL Editor do Supabase.
6. Execute `npm run dev`.

## Variáveis
- `TELEGRAM_BOT_TOKEN`: token do BotFather.
- `TELEGRAM_WEBHOOK_SECRET`: segredo aleatório de 32+ caracteres, usando letras/números/`_`/`-`.
- `OPENAI_API_KEY`: chave de API da OpenAI.
- `OPENAI_MODEL`: modelo disponível na sua conta; padrão `gpt-4.1-mini`.
- `ECRED_URL`: endereço oficial da Ecred; deixar vazio até confirmar a URL correta.
- `SUPABASE_URL`: URL do projeto.
- `SUPABASE_SERVICE_ROLE_KEY`: chave secreta de servidor, nunca no navegador.
- `ADMIN_SETUP_SECRET`: segredo para proteger a configuração do webhook.
- `PORT`: fornecida pelo Railway.

## Configurar webhook
Depois de publicar o serviço no Railway, configure:
- `ADMIN_SETUP_SECRET` no ambiente.
- Faça POST para `/admin/set-webhook` com header `x-admin-secret` e JSON:
  `{ "publicBaseUrl": "https://SEU-SERVICO.up.railway.app" }`

O endpoint `/health` permite verificar se o serviço está ativo.

## Teste
1. Abra o bot no Telegram.
2. Envie `/start`.
3. Faça uma pergunta aberta.
4. Envie outra mensagem retomando o assunto para testar contexto recente.

## Treinamento comercial

A personalidade está em `src/prompts.js`. A base de conhecimento está em `knowledge/ecred.md`, `knowledge/objections.md` e `knowledge/sales-playbook.md`. Atualize esses arquivos somente com informações oficiais e confirmadas da Ecred. O conteúdo da Simplic não deve ser tratado como condição comercial da Ecred.

Para ativar o encaminhamento, configure `ECRED_URL` no Railway somente quando a página oficial da Ecred estiver disponível e validada. Depois faça um novo deploy.

## Limitações desta entrega
- Trata apenas mensagens de texto.
- Não inclui painel administrativo.
- Não envia automaticamente o link da Ecred: a URL ainda não foi fornecida e deve ser validada antes de ativar a ferramenta comercial.
- A memória resumida é básica e será refinada na próxima entrega.
- Ainda faltam fila de processamento, idempotência persistente de updates, rate limiting, observabilidade e testes de carga para produção.
- Não configure tráfego pago até concluir os testes de segurança, privacidade e carga.

## Segurança
Nunca compartilhe tokens/chaves no chat ou no repositório. Configure segredos diretamente no Railway. Se um token vazar, revogue-o no provedor e gere outro.
