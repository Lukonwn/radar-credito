# Radar de Crédito — Entrega 4

Bot conversacional para Telegram com OpenAI e PostgreSQL no Railway.

## Novidades
- Abertura automática ao receber /start.
- Pergunta o nome e mantém nome preferido no PostgreSQL.
- Menu inicial com quatro opções.
- Botões tratados via callback_query.
- Indicador de digitação e pequena pausa natural antes das respostas.
- Link Ecred configurado por padrão em https://www.credconsulta.online/ e sobrescrito por ECRED_URL se definido no Railway.
- Instruções revisadas para evitar dizer que o link está em atualização quando já está configurado.

## Instalação e atualização
Mantenha os serviços atuais do Railway (Node.js e PostgreSQL). Substitua os arquivos do repositório pelos arquivos desta entrega, faça commit e aguarde o redeploy.

## Variáveis no serviço do bot
- TELEGRAM_BOT_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- OPENAI_API_KEY
- OPENAI_MODEL (opcional; padrão gpt-4.1-mini)
- DATABASE_URL (referência ao PostgreSQL Railway)
- ADMIN_SETUP_SECRET
- ECRED_URL (opcional; padrão https://www.credconsulta.online/)

## Importante sobre webhook
Depois do deploy, registre novamente o webhook para habilitar callback_query:
POST https://SEU-DOMINIO/admin/set-webhook
Header: x-admin-secret: SEU_ADMIN_SETUP_SECRET
Body JSON: {"publicBaseUrl":"https://SEU-DOMINIO"}

## Teste
1. Envie /start ao bot.
2. O bot deverá cumprimentar e perguntar seu nome, exibindo quatro botões.
3. Informe um nome. O bot deverá cumprimentar pelo nome e exibir o menu.
4. Escolha um botão e confira a resposta.
5. Peça o link; o bot deverá fornecer https://www.credconsulta.online/.

## Segurança e conformidade
- Não publicar tokens, chaves ou DATABASE_URL no GitHub.
- Não pedir CPF, documentos, senhas, códigos ou dados bancários no Telegram.
- Não prometer aprovação nem inventar taxas, valores ou condições.
- A página e as condições devem ser validadas pela Ecred antes de campanhas em escala.


## Botão para abrir o site dentro do Telegram
Quando o usuário pedir o link do site, ou responder afirmativamente depois de o Radar oferecer o link, o bot envia um botão `Acessar site oficial` usando `web_app` do Telegram. O destino é `ECRED_URL` (padrão: https://www.credconsulta.online/). Esse botão abre a página no WebView integrado do Telegram. O site continua sendo hospedado externamente; não é uma Mini App com interface própria desenvolvida pelo Radar.
