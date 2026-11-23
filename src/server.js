require("dotenv").config();

const express = require("express");
const { loadConfig } = require("./config");
const { createPostgres, initializeDatabase } = require("./postgres");
const { createStore } = require("./store");
const { createAI } = require("./ai");
const { sendMessage, telegramRequest, sendTyping, naturalDelay, whileTyping, MAIN_MENU, officialSiteButton } = require("./telegram");

const config = loadConfig();
const db = createPostgres(config);
const store = createStore(db);
const ai = createAI(config);
const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "radar-credito" }));

function isLikelyName(text) {
  const value = String(text || "").trim();
  if (!value || value.length > 45 || value.length < 2) return false;
  if (/[?!.,:;0-9@/]/.test(value)) return false;
  const words = value.split(/\s+/);
  if (words.length > 3) return false;
  const blocked = /^(oi|olá|ola|bom dia|boa tarde|boa noite|quero|sim|não|nao|empréstimo|emprestimo|estou|como|quanto|preciso|gostaria)$/i;
  return !blocked.test(value);
}

function isDirectSiteRequest(text) {
  const value = String(text || "").trim();
  return /\b(quero solicitar|quero iniciar|iniciar (uma )?solicita[cç][aã]o|come[cç]ar (a )?(solicita[cç][aã]o|cadastro)|me manda o link|manda o link|envia o link|quero o link|abrir o site|acessar o site|site oficial)\b/i.test(value);
}

function isAffirmative(text) {
  return /^(sim|s|pode|claro|quero|vamos|bora|isso|pode ser|tenho interesse|quero continuar|vamos continuar|por favor|pode encaminhar|pode iniciar)[.! ,]*$/i.test(String(text || "").trim());
}

function previousAssistantInvitedApplication(history) {
  const previousAssistant = [...history].reverse().find((item) => item.role === "assistant");
  if (!previousAssistant) return false;
  return /(gostaria de continuar|quer continuar|posso te encaminhar|posso encaminhar|iniciar uma solicita[cç][aã]o|iniciar sua solicita[cç][aã]o|iniciar a solicita[cç][aã]o|preencher (a )?(proposta|solicita[cç][aã]o)|se voc[eê] se sentir confort[aá]vel)/i.test(previousAssistant.content || "");
}

function previousAssistantOfferedLink(history) {
  const previousAssistant = [...history].reverse().find((item) => item.role === "assistant");
  if (!previousAssistant) return false;
  return /(quer que eu (te )?(envie|mande)|posso te enviar|posso mandar|quer o link|envio o link|mandar o link)/i.test(previousAssistant.content || "");
}

function answerShouldShowSiteButton(answer, siteUrl) {
  const value = String(answer || "").toLowerCase();
  const url = String(siteUrl || "").trim().toLowerCase();
  return (url && value.includes(url)) ||
    /(quero solicitar|iniciar minha solicita[cç][aã]o|iniciar uma solicita[cç][aã]o|acessar o site oficial|acesse o site oficial|p[aá]gina oficial da ecred)/i.test(value);
}

async function answerWithAI({ leadId, chatId, text, messageId }) {
  await store.saveMessage(leadId, "user", text, messageId);
  const profile = await store.getLeadProfile(leadId);
  const history = await store.getRecentMessages(leadId, 12);
  const priorHistory = history.slice(0, -1);
  const memory = await store.getMemory(leadId);

  const shouldOpenOfficialSite =
    isDirectSiteRequest(text) ||
    (isAffirmative(text) && (
      previousAssistantInvitedApplication(priorHistory) ||
      previousAssistantOfferedLink(priorHistory)
    ));

  if (shouldOpenOfficialSite) {
    const message = "Claro! 😊 Toque no botão abaixo para abrir a página da Ecred aqui no Telegram e iniciar o preenchimento da sua solicitação. Antes de concluir, confira com atenção as condições, os juros, o CET e o valor total a pagar. O envio da solicitação não garante aprovação.";
    await sendTyping(config.telegramToken, chatId);
    await naturalDelay(message);
    await sendMessage(config.telegramToken, chatId, message, {
      reply_markup: officialSiteButton(config.ecredUrl, "Iniciar minha solicitação")
    });
    await store.saveMessage(leadId, "assistant", message);
    await store.logEvent(leadId, "official_site_button_shown", { url: config.ecredUrl });
    return;
  }

  const answer = await whileTyping(config.telegramToken, chatId, () => ai.reply({
    history: priorHistory,
    memory,
    userText: text,
    preferredName: profile.preferred_name
  }));

  // Se a IA conduzir a conversa para a página oficial, o botão é enviado pelo backend.
  // Assim, a exibição não depende de a IA acertar uma frase específica.
  if (answerShouldShowSiteButton(answer, config.ecredUrl)) {
    const buttonMessage = "Se você quiser dar o próximo passo, toque no botão abaixo para abrir a página da Ecred aqui no Telegram. Leia as condições e os custos com calma antes de enviar sua solicitação.";
    await sendTyping(config.telegramToken, chatId);
    await naturalDelay(buttonMessage);
    await sendMessage(config.telegramToken, chatId, buttonMessage, {
      reply_markup: officialSiteButton(config.ecredUrl, "Iniciar minha solicitação")
    });
    await store.saveMessage(leadId, "assistant", buttonMessage);
    await store.logEvent(leadId, "official_site_button_shown", { url: config.ecredUrl, trigger: "ai_intent" });
    return;
  }

  await sendTyping(config.telegramToken, chatId);
  await naturalDelay(answer);
  await sendMessage(config.telegramToken, chatId, answer);
  await store.saveMessage(leadId, "assistant", answer);

  if (history.length >= 12 && history.length % 12 === 0) {
    const fullHistory = await store.getRecentMessages(leadId, 24);
    const summary = await ai.summarize(fullHistory);
    if (summary) await store.saveMemory(leadId, summary);
  }
}

app.post("/telegram/webhook", async (req, res) => {
  if (req.get("X-Telegram-Bot-Api-Secret-Token") !== config.telegramSecret) {
    return res.sendStatus(401);
  }
  res.sendStatus(200);

  try {
    const update = req.body;

    // Botões do menu inicial
    if (update?.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message?.chat?.id;
      const from = callback.from;
      if (!chatId || !from) return;
      await telegramRequest(config.telegramToken, "answerCallbackQuery", { callback_query_id: callback.id });
      const leadId = await store.upsertLead(from, null);
      const profile = await store.getLeadProfile(leadId);
      const choices = {
        menu_apply: "Quero solicitar empréstimo",
        menu_negative: "Estou negativado",
        menu_how: "Quero entender como funciona",
        menu_question: "Tenho uma dúvida"
      };
      const selected = choices[callback.data];
      if (selected) {
        await store.logEvent(leadId, "menu_selected", { option: callback.data });
        await answerWithAI({ leadId, chatId, text: selected, messageId: null });
      }
      return;
    }

    const message = update?.message;
    if (!message?.text || !message.from || !message.chat) return;
    const text = message.text.trim();
    if (!text) return;

    const startPayload = text.startsWith("/start") ? (text.split(/\s+/)[1] || null) : null;
    const leadId = await store.upsertLead(message.from, startPayload);

    if (text === "/start" || text.startsWith("/start ")) {
      await store.logEvent(leadId, "bot_started", { start_payload: startPayload });
      await store.setAwaitingName(leadId, true);
      const greeting = `Olá! Que bom ter você por aqui 😊

Eu sou o Radar, assistente virtual da Ecred. Vou te ajudar a entender as opções e tirar suas dúvidas sobre crédito.

Antes de começarmos, como posso te chamar?`;
      await sendTyping(config.telegramToken, message.chat.id);
      await naturalDelay(greeting);
      await sendMessage(config.telegramToken, message.chat.id, greeting);
      await store.saveMessage(leadId, "assistant", greeting);
      return;
    }

    const profile = await store.getLeadProfile(leadId);
    if (profile.awaiting_name && isLikelyName(text)) {
      await store.saveMessage(leadId, "user", text, message.message_id);
      await store.savePreferredName(leadId, text);
      const greeting = `Prazer, ${text}! 😊

Me conta: você está procurando um empréstimo agora, quer saber se pode solicitar estando negativado ou prefere entender primeiro como funciona?`;
      await sendTyping(config.telegramToken, message.chat.id);
      await naturalDelay(greeting);
      await sendMessage(config.telegramToken, message.chat.id, greeting, { reply_markup: MAIN_MENU });
      await store.saveMessage(leadId, "assistant", greeting);
      return;
    }

    if (profile.awaiting_name) await store.setAwaitingName(leadId, false);
    await answerWithAI({ leadId, chatId: message.chat.id, text, messageId: message.message_id });
  } catch (error) {
    console.error("Erro ao processar update:", error.message);
    try {
      const chatId = req.body?.message?.chat?.id || req.body?.callback_query?.message?.chat?.id;
      if (chatId) {
        await sendMessage(config.telegramToken, chatId,
          "Tive um probleminha para responder agora. Pode tentar mais uma vez?");
      }
    } catch (sendError) {
      console.error("Erro ao enviar mensagem de contingência:", sendError.message);
    }
  }
});

app.post("/admin/set-webhook", async (req, res) => {
  if (!config.adminSetupSecret || req.get("x-admin-secret") !== config.adminSetupSecret) {
    return res.sendStatus(401);
  }
  const { publicBaseUrl } = req.body || {};
  if (!publicBaseUrl || !/^https:\/\/.+/.test(publicBaseUrl)) {
    return res.status(400).json({ error: "Informe publicBaseUrl HTTPS do serviço." });
  }
  try {
    const result = await telegramRequest(config.telegramToken, "setWebhook", {
      url: `${publicBaseUrl.replace(/\/$/, "")}/telegram/webhook`,
      secret_token: config.telegramSecret,
      allowed_updates: ["message", "callback_query"]
    });
    res.json({ ok: true, result });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

initializeDatabase(db).then(() => {
  app.listen(config.port, () => console.log(`Radar iniciado na porta ${config.port}`));
}).catch((error) => {
  console.error("Falha ao inicializar banco de dados:", error);
  process.exit(1);
});
