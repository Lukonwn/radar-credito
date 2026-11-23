const required = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "DATABASE_URL"
];

function loadConfig() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
  }

  return {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
    openaiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    ecredUrl: (process.env.ECRED_URL || "https://www.credconsulta.online/").trim(),
    databaseUrl: process.env.DATABASE_URL,
    port: Number(process.env.PORT || 3000),
    adminSetupSecret: process.env.ADMIN_SETUP_SECRET || "",
    adminUser: process.env.ADMIN_DASHBOARD_USER || "",
    adminPassword: process.env.ADMIN_DASHBOARD_PASSWORD || "",
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
  };
}

module.exports = { loadConfig };
