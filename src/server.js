require("dotenv").config();

const express = require("express");
const { loadConfig } = require("./config");
const { createSupabase } = require("./supabase");
const { createStore } = require("./store");
const { createAI } = require("./ai");
const { sendMessage, telegramRequest } = require("./telegram");

const config = loadConfig();
const supabase = createSupabase(config);
const store = createStore(supabase);
const ai = createAI(config);
const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "radar-credito" }));

app.post("/telegram/webhook", async (req, res) => {
  if (req.get("X-Telegram-Bot-Api-Secret-Token") !== config.telegramSecret) {
    return res.sendStatus(401);
  }

  // Responde rapidamente ao Telegram; processamento ocorre depois.
  res.sendStatus(200);

  try {
    const update = req.body;
    if (!update?.message?.text || !update.message.from || !update.message.chat) return;

    const message = update.message;
    const text = message.text.trim();
    if (!text) return;

    const startPayload = text.startsWith("/start")
      ? (text.split(/\s+/)[1] || null)
      : null;

    const leadId = await store.upsertLead(message.from, startPayload);
    await store.saveMessage(leadId, "user", text, message.message_id);

    if (text === "/start" || text.startsWith("/start ")) {
      await store.logEvent(leadId, "bot_started", { start_payload: startPayload });
    }

    const history = await store.getRecentMessages(leadId, 12);
    // O texto atual já foi salvo; removemos a última ocorrência para não duplicar.
    const priorHistory = history.slice(0, -1);
    const memory = await store.getMemory(leadId);

    const answer = await ai.reply({
      history: priorHistory,
      memory,
      userText: text
    });

    await store.saveMessage(leadId, "assistant", answer);
    await sendMessage(config.telegramToken, message.chat.id, answer);

    // Atualiza resumo a cada 12 mensagens armazenadas.
    if (history.length >= 12 && history.length % 12 === 0) {
      const fullHistory = await store.getRecentMessages(leadId, 24);
      const summary = await ai.summarize(fullHistory);
      if (summary) await store.saveMemory(leadId, summary);
    }
  } catch (error) {
    console.error("Erro ao processar update:", error.message);
    try {
      const chatId = req.body?.message?.chat?.id;
      if (chatId) {
        await sendMessage(config.telegramToken, chatId,
          "Tive uma instabilidade momentânea para responder. Pode enviar sua mensagem novamente em alguns instantes?");
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
      allowed_updates: ["message"]
    });
    res.json({ ok: true, result });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.listen(config.port, () => {
  console.log(`Radar iniciado na porta ${config.port}`);
});
