require("dotenv").config();

const express = require("express");
const crypto = require("node:crypto");
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

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function adminAuth(req, res, next) {
  if (!config.adminUser || !config.adminPassword) {
    return res.status(503).send("Painel não configurado. Defina ADMIN_DASHBOARD_USER e ADMIN_DASHBOARD_PASSWORD no Railway.");
  }
  const header = req.get("authorization") || "";
  const match = header.match(/^Basic\s+(.+)$/i);
  if (!match) {
    res.set("WWW-Authenticate", 'Basic realm="Radar de Crédito - Administração", charset="UTF-8"');
    return res.status(401).send("Autenticação necessária.");
  }
  let decoded = "";
  try { decoded = Buffer.from(match[1], "base64").toString("utf8"); } catch {}
  const split = decoded.indexOf(":");
  const user = split >= 0 ? decoded.slice(0, split) : "";
  const password = split >= 0 ? decoded.slice(split + 1) : "";
  if (!safeEqual(user, config.adminUser) || !safeEqual(password, config.adminPassword)) {
    res.set("WWW-Authenticate", 'Basic realm="Radar de Crédito - Administração", charset="UTF-8"');
    return res.status(401).send("Usuário ou senha incorretos.");
  }
  next();
}

function signTrackingId(leadId) {
  return crypto.createHmac("sha256", config.telegramSecret).update(String(leadId)).digest("hex");
}

function trackedSiteButton(leadId) {
  const signature = signTrackingId(leadId);
  const target = `${config.publicBaseUrl}/go/ecred/${encodeURIComponent(leadId)}?sig=${signature}`;
  return {
    inline_keyboard: [[
      { text: "Iniciar minha solicitação", url: target }
    ]]
  };
}

const dashboardHtml = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Radar de Crédito | Painel diário</title>
<style>
:root{color-scheme:dark;--bg:#07130e;--panel:#10251b;--muted:#a9c2b2;--line:#234b36;--green:#37d879;--white:#f4fff8}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(145deg,#06120c,#0c2117 60%,#07130e);color:var(--white);font:15px system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1100px;margin:auto;padding:28px 18px 50px}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:24px}
h1{font-size:25px;margin:0 0 5px}.sub{color:var(--muted);font-size:13px}.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
select,button{background:#173525;color:var(--white);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font:inherit}
button{background:var(--green);color:#062011;border:0;font-weight:700;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.card{background:rgba(16,37,27,.94);border:1px solid var(--line);border-radius:16px;padding:17px;min-width:0}
.kicker{color:var(--muted);font-size:12px}.value{font-size:30px;font-weight:750;margin:8px 0 3px;letter-spacing:-1px}.hint{font-size:12px;color:var(--muted)}
.section{margin-top:18px}.section h2{font-size:17px;margin:0 0 12px}
.chart{display:grid;gap:10px}.barrow{display:grid;grid-template-columns:92px 1fr 54px;gap:10px;align-items:center;font-size:12px;color:var(--muted)}
.track{height:12px;background:#1b3828;border-radius:99px;overflow:hidden}.bar{height:100%;background:linear-gradient(90deg,#19a85b,#56e994);border-radius:99px;min-width:2px}
.tablewrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:520px}th,td{text-align:left;padding:11px 8px;border-bottom:1px solid var(--line);font-size:13px}th{color:var(--muted);font-weight:600}
.note{margin-top:16px;color:var(--muted);font-size:12px;line-height:1.5}.error{color:#ffb4a8}
@media(max-width:760px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.value{font-size:26px}}
@media(max-width:390px){.grid{grid-template-columns:1fr 1fr}.card{padding:13px}.value{font-size:23px}}
</style></head><body><main>
<div class="top"><div><h1>Radar de Crédito</h1><div class="sub">Painel de acompanhamento diário</div></div>
<div class="controls"><select id="days"><option value="1">Hoje</option><option value="7" selected>Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select><button id="refresh">Atualizar</button></div></div>
<div class="grid">
<div class="card"><div class="kicker">Starts no período</div><div class="value" id="starts">—</div><div class="hint" id="startsHint">Comandos /start recebidos</div></div>
<div class="card"><div class="kicker">Pessoas únicas</div><div class="value" id="unique">—</div><div class="hint">Pessoas diferentes que iniciaram</div></div>
<div class="card"><div class="kicker">Aberturas da página Ecred</div><div class="value" id="clicks">—</div><div class="hint" id="clicksHint">Acessos pelo botão rastreado</div></div>
<div class="card"><div class="kicker">Conversão start → abertura</div><div class="value" id="conversion">—</div><div class="hint">Pessoas únicas com abertura ÷ pessoas únicas com start</div></div>
</div>
<div class="section card"><h2>Movimento por dia</h2><div class="chart" id="chart"><div class="sub">Carregando…</div></div></div>
<div class="section card"><h2>Detalhamento diário</h2><div class="tablewrap"><table><thead><tr><th>Dia</th><th>Starts</th><th>Pessoas</th><th>Aberturas</th><th>Conversão</th></tr></thead><tbody id="rows"></tbody></table></div></div>
<div class="note">Os dados começam a ser contabilizados a partir da implantação desta versão. “Aberturas” significa que o link rastreado foi acessado; não confirma que a pessoa concluiu uma solicitação ou recebeu crédito. O painel usa o fuso horário de Brasília.</div>
<div class="note error" id="error"></div>
</main><script>
const fmt=n=>new Intl.NumberFormat('pt-BR').format(n||0);
async function load(){const days=document.getElementById('days').value;document.getElementById('error').textContent='';
try{const r=await fetch('/admin/api/metrics?days='+days);if(!r.ok)throw new Error('Não foi possível carregar os dados ('+r.status+').');const d=await r.json();
document.getElementById('starts').textContent=fmt(d.totals.starts);
document.getElementById('unique').textContent=fmt(d.totals.uniqueStarts);
document.getElementById('clicks').textContent=fmt(d.totals.clicks);
document.getElementById('conversion').textContent=d.totals.conversion.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
document.getElementById('startsHint').textContent=fmt(d.totals.conversations)+' pessoas conversaram no período';
document.getElementById('clicksHint').textContent=fmt(d.totals.uniqueClicks)+' pessoas diferentes abriram a página';
const max=Math.max(1,...d.days.map(x=>Math.max(x.starts,x.clicks)));
document.getElementById('chart').innerHTML=d.days.map(x=>'<div class="barrow"><span>'+x.label+'</span><div><div class="track"><div class="bar" style="width:'+(x.starts/max*100)+'%"></div></div><div class="track" style="margin-top:4px"><div class="bar" style="width:'+(x.clicks/max*100)+'%;opacity:.58"></div></div></div><b>'+fmt(x.starts)+' / '+fmt(x.clicks)+'</b></div>').join('');
document.getElementById('rows').innerHTML=d.days.slice().reverse().map(x=>'<tr><td>'+x.date+'</td><td>'+fmt(x.starts)+'</td><td>'+fmt(x.uniqueStarts)+'</td><td>'+fmt(x.clicks)+'</td><td>'+x.conversion.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%</td></tr>').join('');
}catch(e){document.getElementById('error').textContent=e.message}}
document.getElementById('refresh').addEventListener('click',load);document.getElementById('days').addEventListener('change',load);load();
</script></body></html>`;



app.get("/health", (_req, res) => res.json({ ok: true, service: "radar-credito" }));

// Link intermediário: registra o acesso ao botão e redireciona para o site Ecred.
app.get("/go/ecred/:leadId", async (req, res) => {
  const { leadId } = req.params;
  const signature = String(req.query.sig || "");
  if (!/^[0-9a-f-]{36}$/i.test(leadId) || !safeEqual(signature, signTrackingId(leadId))) {
    return res.status(400).send("Link inválido ou expirado.");
  }
  try {
    await store.logEvent(leadId, "official_site_opened", { destination: "ecred" });
    return res.redirect(302, config.ecredUrl);
  } catch (error) {
    console.error("Falha ao registrar abertura da Ecred:", error.message);
    return res.redirect(302, config.ecredUrl);
  }
});

app.get("/admin", adminAuth, (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.type("html").send(dashboardHtml);
});

app.get("/admin/api/metrics", adminAuth, async (req, res) => {
  const days = Math.min(90, Math.max(1, Number.parseInt(req.query.days, 10) || 7));
  try {
    const result = await db.query(`
      WITH calendar AS (
        SELECT generate_series(
          (now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1),
          (now() AT TIME ZONE 'America/Sao_Paulo')::date,
          interval '1 day'
        )::date AS day
      ),
      starts AS (
        SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
               count(*)::int AS starts, count(DISTINCT lead_id)::int AS unique_starts
        FROM lead_events
        WHERE event_name='bot_started'
          AND created_at >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1))::timestamp AT TIME ZONE 'America/Sao_Paulo'
        GROUP BY 1
      ),
      clicks AS (
        SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
               count(*)::int AS clicks, count(DISTINCT lead_id)::int AS unique_clicks
        FROM lead_events
        WHERE event_name='official_site_opened'
          AND created_at >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1))::timestamp AT TIME ZONE 'America/Sao_Paulo'
        GROUP BY 1
      ),
      conversations AS (
        SELECT (m.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
               count(DISTINCT m.lead_id)::int AS conversations
        FROM messages m
        WHERE m.role='user'
          AND m.created_at >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1))::timestamp AT TIME ZONE 'America/Sao_Paulo'
        GROUP BY 1
      )
      SELECT c.day,
             COALESCE(s.starts,0)::int AS starts,
             COALESCE(s.unique_starts,0)::int AS unique_starts,
             COALESCE(k.clicks,0)::int AS clicks,
             COALESCE(k.unique_clicks,0)::int AS unique_clicks,
             COALESCE(v.conversations,0)::int AS conversations
      FROM calendar c
      LEFT JOIN starts s ON s.day=c.day
      LEFT JOIN clicks k ON k.day=c.day
      LEFT JOIN conversations v ON v.day=c.day
      ORDER BY c.day
    `, [days]);
    const rows = result.rows.map(row => {
      const starts = Number(row.starts);
      const uniqueStarts = Number(row.unique_starts);
      const clicks = Number(row.clicks);
      const uniqueClicks = Number(row.unique_clicks);
      return {
        date: String(row.day).slice(0,10),
        label: (() => { const [y,m,d] = String(row.day).slice(0,10).split("-"); return `${d}/${m}`; })(),
        starts, uniqueStarts, clicks, uniqueClicks,
        conversations: Number(row.conversations),
        conversion: uniqueStarts ? (uniqueClicks / uniqueStarts) * 100 : 0
      };
    });
    const periodStart = await db.query(`
      SELECT
        (SELECT count(*)::int FROM lead_events
         WHERE event_name='bot_started'
           AND created_at >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1))::timestamp AT TIME ZONE 'America/Sao_Paulo') AS starts,
        (SELECT count(DISTINCT lead_id)::int FROM lead_events
         WHERE event_name='bot_started'
           AND created_at >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1))::timestamp AT TIME ZONE 'America/Sao_Paulo') AS unique_starts,
        (SELECT count(*)::int FROM lead_events
         WHERE event_name='official_site_opened'
           AND created_at >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1))::timestamp AT TIME ZONE 'America/Sao_Paulo') AS clicks,
        (SELECT count(DISTINCT lead_id)::int FROM lead_events
         WHERE event_name='official_site_opened'
           AND created_at >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1))::timestamp AT TIME ZONE 'America/Sao_Paulo') AS unique_clicks,
        (SELECT count(DISTINCT lead_id)::int FROM messages
         WHERE role='user'
           AND created_at >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1))::timestamp AT TIME ZONE 'America/Sao_Paulo') AS conversations
    `, [days]);
    const t = periodStart.rows[0];
    const totals = {
      starts: Number(t.starts),
      uniqueStarts: Number(t.unique_starts),
      clicks: Number(t.clicks),
      uniqueClicks: Number(t.unique_clicks),
      conversations: Number(t.conversations)
    };
    totals.conversion = totals.uniqueStarts ? (totals.uniqueClicks / totals.uniqueStarts) * 100 : 0;
    res.set("Cache-Control", "no-store").json({ totals, days: rows });
  } catch (error) {
    console.error("Erro ao consultar métricas:", error.message);
    res.status(500).json({ error: "Não foi possível consultar as métricas." });
  }
});


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
      reply_markup: trackedSiteButton(leadId)
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
      reply_markup: trackedSiteButton(leadId)
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
