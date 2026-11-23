function createStore(pool) {
  async function upsertLead(from, startPayload) {
    const result = await pool.query(
      `INSERT INTO leads (telegram_user_id, username, first_name, last_name, last_seen_at, acquisition_payload)
       VALUES ($1,$2,$3,$4,now(),$5)
       ON CONFLICT (telegram_user_id) DO UPDATE SET
         username=EXCLUDED.username, first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name,
         last_seen_at=now(), acquisition_payload=COALESCE(EXCLUDED.acquisition_payload, leads.acquisition_payload)
       RETURNING id`,
      [String(from.id), from.username || null, from.first_name || null, from.last_name || null, startPayload || null]
    );
    return result.rows[0].id;
  }

  async function setAwaitingName(leadId, value) {
    await pool.query(`UPDATE leads SET awaiting_name=$2 WHERE id=$1`, [leadId, value]);
  }

  async function getLeadProfile(leadId) {
    const result = await pool.query(
      `SELECT preferred_name, awaiting_name FROM leads WHERE id=$1`,
      [leadId]
    );
    return result.rows[0] || { preferred_name: null, awaiting_name: false };
  }

  async function savePreferredName(leadId, name) {
    await pool.query(
      `UPDATE leads SET preferred_name=$2, awaiting_name=false WHERE id=$1`,
      [leadId, name]
    );
  }

  async function saveMessage(leadId, role, content, telegramMessageId = null) {
    await pool.query(
      `INSERT INTO messages (lead_id, role, content, telegram_message_id) VALUES ($1,$2,$3,$4)`,
      [leadId, role, content, telegramMessageId ? String(telegramMessageId) : null]
    );
  }

  async function getRecentMessages(leadId, limit = 12) {
    const result = await pool.query(
      `SELECT role, content FROM (SELECT role, content, created_at, id FROM messages WHERE lead_id=$1 ORDER BY created_at DESC, id DESC LIMIT $2) recent ORDER BY created_at ASC, id ASC`,
      [leadId, limit]
    );
    return result.rows;
  }

  async function getMemory(leadId) {
    const result = await pool.query(`SELECT summary FROM lead_memory WHERE lead_id=$1`, [leadId]);
    return result.rows[0]?.summary || "";
  }

  async function saveMemory(leadId, summary) {
    await pool.query(
      `INSERT INTO lead_memory (lead_id, summary, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (lead_id) DO UPDATE SET summary=EXCLUDED.summary, updated_at=now()`,
      [leadId, summary]
    );
  }

  async function logEvent(leadId, eventName, metadata = {}) {
    await pool.query(
      `INSERT INTO lead_events (lead_id, event_name, metadata) VALUES ($1,$2,$3::jsonb)`,
      [leadId, eventName, JSON.stringify(metadata)]
    );
  }

  return { upsertLead, saveMessage, getRecentMessages, getMemory, saveMemory, logEvent,
    setAwaitingName, getLeadProfile, savePreferredName };
}

module.exports = { createStore };
