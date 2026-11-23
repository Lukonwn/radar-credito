function createStore(supabase) {
  async function upsertLead(from, startPayload) {
    const telegramId = String(from.id);
    const { data, error } = await supabase
      .from("leads")
      .upsert({
        telegram_user_id: telegramId,
        username: from.username || null,
        first_name: from.first_name || null,
        last_name: from.last_name || null,
        last_seen_at: new Date().toISOString(),
        ...(startPayload ? { acquisition_payload: startPayload } : {})
      }, { onConflict: "telegram_user_id" })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  async function saveMessage(leadId, role, content, telegramMessageId = null) {
    const { error } = await supabase.from("messages").insert({
      lead_id: leadId,
      role,
      content,
      telegram_message_id: telegramMessageId ? String(telegramMessageId) : null
    });
    if (error) throw error;
  }

  async function getRecentMessages(leadId, limit = 12) {
    const { data, error } = await supabase
      .from("messages")
      .select("role, content")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).reverse();
  }

  async function getMemory(leadId) {
    const { data, error } = await supabase
      .from("lead_memory")
      .select("summary")
      .eq("lead_id", leadId)
      .maybeSingle();

    if (error) throw error;
    return data?.summary || "";
  }

  async function saveMemory(leadId, summary) {
    const { error } = await supabase.from("lead_memory").upsert({
      lead_id: leadId,
      summary,
      updated_at: new Date().toISOString()
    }, { onConflict: "lead_id" });

    if (error) throw error;
  }

  async function logEvent(leadId, eventName, metadata = {}) {
    const { error } = await supabase.from("lead_events").insert({
      lead_id: leadId,
      event_name: eventName,
      metadata
    });
    if (error) throw error;
  }

  return { upsertLead, saveMessage, getRecentMessages, getMemory, saveMemory, logEvent };
}

module.exports = { createStore };
