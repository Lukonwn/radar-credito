const { createClient } = require("@supabase/supabase-js");

function createSupabase(config) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

module.exports = { createSupabase };
