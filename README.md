# Radar de Crédito — Entrega 9: painel diário de métricas

Esta versão acrescenta um painel administrativo protegido por usuário e senha, além do rastreamento dos acessos ao botão de solicitação.

## O que o painel acompanha

- Starts: quantidade de eventos `/start` recebidos pelo bot.
- Pessoas únicas: usuários diferentes que deram `/start` no período.
- Aberturas da página Ecred: acessos ao link intermediário do botão.
- Conversão: pessoas únicas que abriram a página divididas por pessoas únicas que iniciaram o bot.
- Pessoas que conversaram e detalhamento por dia.
- Filtros: hoje, últimos 7, 30 ou 90 dias.

O painel usa o banco PostgreSQL já conectado ao projeto. As métricas começam a ser registradas após esta versão entrar em produção; não há reconstrução de cliques antigos.

## Como publicar no Railway — passo a passo

1. Baixe e extraia este ZIP.
2. Abra o repositório privado `radar-credito` no GitHub.
3. Envie/substitua os arquivos desta versão mantendo as pastas (`src`, `sql`, `knowledge`) e o `package.json` na raiz.
4. Faça o commit das alterações.
5. No Railway, abra o serviço do bot e entre em **Variables**.
6. Crie estas três variáveis:

   - `ADMIN_DASHBOARD_USER` — escolha um usuário administrativo, por exemplo `radaradmin`.
   - `ADMIN_DASHBOARD_PASSWORD` — crie uma senha longa, exclusiva e difícil de adivinhar. Não use a senha de outros serviços.
   - `PUBLIC_BASE_URL` — domínio público HTTPS do serviço do bot no Railway, por exemplo `https://nome-do-servico.up.railway.app`. Não coloque `/` no final.

7. Não apague nem altere as variáveis que já existem (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `DATABASE_URL`, `ECRED_URL` e outras já configuradas).
8. Salve as variáveis e aguarde o deploy terminar com status **SUCCESS**.

## Como abrir e utilizar o painel

1. Copie o domínio público HTTPS do serviço Railway.
2. No navegador, abra `https://SEU-DOMINIO/admin` (substitua pelo domínio real).
3. O navegador pedirá usuário e senha. Use os valores definidos em `ADMIN_DASHBOARD_USER` e `ADMIN_DASHBOARD_PASSWORD`.
4. Escolha Hoje, Últimos 7, 30 ou 90 dias.
5. Toque em **Atualizar** para buscar os dados mais recentes.

## Como o clique é medido

Para registrar o acesso, o botão “Iniciar minha solicitação” passa a usar um endereço rastreador hospedado no Railway. Quando esse endereço é aberto, o servidor registra o evento no PostgreSQL e redireciona a pessoa para `https://www.credconsulta.online/`.

**Diferença importante:** para permitir esse rastreamento sem instalar código no site da Ecred, o botão desta versão é um botão de URL do Telegram. Ele abre a página no navegador interno do Telegram, mas deixa de usar o modo Web App em tela própria que a versão anterior utilizava. O site de destino continua sendo o mesmo.

O evento contabiliza que o endereço rastreado foi acessado; não comprova que a pessoa concluiu a solicitação, nem que recebeu crédito. Pré-carregamentos ou reaberturas do link também podem gerar acessos adicionais.

## Segurança

- O painel exige autenticação HTTP Basic e deve ser acessado somente pelo domínio HTTPS do Railway.
- Não compartilhe o usuário ou a senha do painel.
- Nunca envie tokens, chaves de API, senha administrativa ou `DATABASE_URL` para o GitHub.
- O link de rastreamento inclui uma assinatura HMAC para impedir que alguém altere o identificador do lead.
- O bot e o painel utilizam o mesmo PostgreSQL existente; não crie outro banco.

## Rotas

- `GET /health` — verificação do serviço.
- `GET /admin` — painel protegido.
- `GET /admin/api/metrics?days=7` — dados do painel, também protegido.
- `GET /go/ecred/:leadId?sig=...` — registra o acesso e redireciona para a Ecred.
