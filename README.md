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
