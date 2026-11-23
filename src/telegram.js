const TELEGRAM_API = "https://api.telegram.org";

async function telegramRequest(token, method, payload) {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} falhou: ${data.description || response.status}`);
  }
  return data.result;
}

async function sendMessage(token, chatId, text) {
  // Telegram limita text messages a 4096 caracteres.
  const chunks = [];
  for (let i = 0; i < text.length; i += 3900) chunks.push(text.slice(i, i + 3900));
  for (const chunk of chunks) {
    await telegramRequest(token, "sendMessage", {
      chat_id: chatId,
      text: chunk,
      disable_web_page_preview: true
    });
  }
}

module.exports = { telegramRequest, sendMessage };
