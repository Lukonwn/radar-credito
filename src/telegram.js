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

async function sendTyping(token, chatId) {
  await telegramRequest(token, "sendChatAction", { chat_id: chatId, action: "typing" });
}

function naturalDelay(text) {
  // Pequena pausa para dar ritmo de conversa, sem simular longas digitações artificiais.
  const ms = Math.min(4200, Math.max(1300, 900 + String(text || "").length * 15));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function whileTyping(token, chatId, task) {
  await sendTyping(token, chatId);
  const heartbeat = setInterval(() => {
    sendTyping(token, chatId).catch((error) =>
      console.error("Falha ao renovar indicador de digitação:", error.message)
    );
  }, 4000);
  try {
    return await task();
  } finally {
    clearInterval(heartbeat);
  }
}

async function sendMessage(token, chatId, text, options = {}) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 3900) chunks.push(text.slice(i, i + 3900));
  for (let index = 0; index < chunks.length; index++) {
    await telegramRequest(token, "sendMessage", {
      chat_id: chatId,
      text: chunks[index],
      disable_web_page_preview: true,
      ...(index === chunks.length - 1 && options.reply_markup ? { reply_markup: options.reply_markup } : {})
    });
  }
}

function officialSiteButton(url, label = "Iniciar minha solicitação") {
  return {
    inline_keyboard: [[
      { text: label, web_app: { url } }
    ]]
  };
}

const MAIN_MENU = {
  inline_keyboard: [
    [{ text: "Quero solicitar empréstimo", callback_data: "menu_apply" }],
    [{ text: "Estou negativado", callback_data: "menu_negative" }],
    [{ text: "Quero entender como funciona", callback_data: "menu_how" }],
    [{ text: "Tenho uma dúvida", callback_data: "menu_question" }]
  ]
};

module.exports = { telegramRequest, sendMessage, sendTyping, naturalDelay, whileTyping, MAIN_MENU, officialSiteButton };
