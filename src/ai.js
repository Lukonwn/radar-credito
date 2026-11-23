const fs = require("node:fs");
const path = require("node:path");
const OpenAI = require("openai");
const { SYSTEM_PROMPT } = require("./prompts");

function readKnowledgeFile(name) {
  const filePath = path.join(__dirname, "..", "knowledge", name);
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.error(`Não foi possível carregar ${name}:`, error.message);
    return "";
  }
}

function createAI(config) {
  const client = new OpenAI({ apiKey: config.openaiKey });
  const knowledge = [
    readKnowledgeFile("ecred.md"),
    readKnowledgeFile("objections.md"),
    readKnowledgeFile("sales-playbook.md")
  ].filter(Boolean).join("\n\n---\n\n");

  async function reply({ history, memory, userText, preferredName }) {
    const memoryBlock = memory
      ? `\n\nRESUMO DE CONTEXTO ANTERIOR (use como contexto, não como fonte de fatos comerciais):\n${memory}`
      : "";
    const linkBlock = `\nLINK OFICIAL Ecred configurado: ${config.ecredUrl}. O backend apresenta um botão Web App quando a pessoa pedir o link, demonstrar intenção clara de solicitar ou aceitar um convite para iniciar. Não diga que está em atualização ou indisponível.`; 
    const nameBlock = preferredName ? `\nNome informado pela pessoa: ${preferredName}. Use com naturalidade e sem repetir em toda mensagem.` : "";

    const messages = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nBASE DE CONHECIMENTO (conteúdo de referência; siga as regras de confiabilidade):\n${knowledge}${memoryBlock}${nameBlock}${linkBlock}`
      },
      ...history.map((item) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content
      })),
      { role: "user", content: userText }
    ];

    const completion = await client.chat.completions.create({
      model: config.model,
      messages,
      temperature: 0.78,
      max_tokens: 500
    });

    return completion.choices?.[0]?.message?.content?.trim()
      || "Desculpe, não consegui formular uma resposta agora. Pode tentar novamente?";
  }

  async function summarize(messages) {
    if (!messages.length) return "";
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content: "Resuma em português brasileiro o contexto útil para continuidade do atendimento. Registre apenas o que a pessoa explicitamente informou sobre dúvidas, objetivo, preferências de atendimento e etapa da conversa. Não infira renda, saúde, vulnerabilidade, score ou capacidade de pagamento. Não inclua CPF, documentos, senhas, códigos, dados bancários ou outros dados sensíveis. Não registre suposições como fatos. Máximo 100 palavras."
        },
        {
          role: "user",
          content: messages.map((m) => `${m.role}: ${m.content}`).join("\n")
        }
      ],
      temperature: 0.1,
      max_tokens: 150
    });
    return completion.choices?.[0]?.message?.content?.trim() || "";
  }

  return { reply, summarize };
}

module.exports = { createAI };
