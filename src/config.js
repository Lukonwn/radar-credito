const required = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
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
    ecredUrl: process.env.ECRED_URL || "",
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    port: Number(process.env.PORT || 3000),
    adminSetupSecret: process.env.ADMIN_SETUP_SECRET || ""
  };
}

module.exports = { loadConfig };
