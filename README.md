# Radar de Crédito — Entrega 5.1 (correção do botão)

## Correção
O botão oficial agora é um botão URL do Telegram (`inline_keyboard` com `url`), que abre o endereço HTTPS no navegador integrado do Telegram. Não é um Mini App Telegram com interface própria; é a página oficial aberta no navegador interno.

O backend também detecta quando a resposta da IA:
- inclui o endereço oficial configurado;
- fala em acessar/abrir o site oficial;
- oferece enviar o link.

Nesses casos, substitui a mensagem por uma orientação curta com o botão **Acessar site oficial**. Assim, o botão não depende da IA escrever uma frase exata.

Foi corrigida a expressão de detecção de pedidos de link.

## Atualização
1. Extraia este ZIP.
2. Substitua os arquivos no repositório GitHub mantendo a estrutura.
3. Faça Commit changes.
4. Aguarde o Railway concluir o deploy.
5. Não é necessário criar outro bot, PostgreSQL ou serviço.
6. O webhook já está registrado; como o formato de updates não mudou, não é necessário registrá-lo novamente.

## Teste
No Telegram:
1. Peça informações sobre como solicitar.
2. Quando o Radar falar sobre acessar a página ou oferecer o link, a resposta deverá conter o botão **Acessar site oficial**.
3. Toque no botão e confirme que `https://www.credconsulta.online/` abre no navegador integrado do Telegram.

## Variável
`ECRED_URL` deve conter `https://www.credconsulta.online/`. Se não estiver definida, o código usa esse endereço como padrão.

## Segurança
Não envie tokens, chaves ou DATABASE_URL ao GitHub. Não prometa aprovação nem invente condições financeiras.


## Correção Entrega 5.2 — abrir como Telegram Web App
O botão "Acessar site oficial" usa `web_app: { url }` (Telegram Web App button), e não `url: ...` (botão de link comum). Ele abre o site HTTPS na visualização Web App do Telegram em conversa privada com o bot.


## Entrega 6 — Atendimento acolhedor
Configuração desta versão:
- Personalidade acolhedora, paciente e sem pressão.
- Ritmo natural com indicador de digitação renovado enquanto a IA prepara a resposta.
- Menu apresentado apenas na entrada, depois da identificação do nome; a conversa segue livre depois disso.
- Profundidade média: normalmente 3 a 5 frases para explicações que merecem contexto, sem alongar perguntas simples.
- Evita repetir “quer que eu explique?” quando a pessoa já pediu explicação.
- Não repete avisos de análise de crédito sem necessidade e não apressa o clique no site.
- Aumentado o limite de tokens da resposta para permitir explicações um pouco mais completas.


## Entrega 7 — Jornada acolhedora até a solicitação
- A IA acolhe, entende e orienta antes de convidar para avançar.
- Quando o cliente aceitar um convite claro para iniciar a solicitação, o backend envia o botão Web App “Iniciar minha solicitação”.
- Pedidos diretos de link ou “quero solicitar” também mostram o botão sem perguntas adicionais.
- O botão não é chamado de contrato; ele apenas abre o site para iniciar o preenchimento da solicitação.
- O convite não é disparado em toda resposta nem apenas por mencionar a palavra “solicitação”.
- O encaminhamento informa que o envio não garante aprovação e recomenda conferir juros, CET e custo total.


## Entrega 8 — conversa consultiva
- Reformulada a lógica de diálogo para priorizar escuta ativa, continuidade contextual e descoberta gradual da necessidade.
- Incluídos exemplos concretos para negativação, receio, urgência, confiança, pesquisa e recusa anterior.
- O fluxo de botão Web App e a infraestrutura da Entrega 7 foram preservados.
