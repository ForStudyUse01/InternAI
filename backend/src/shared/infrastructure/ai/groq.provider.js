const { PLATFORM_CONFIG } = require("../../config/platform.config");

async function completeWithGroq({ systemPrompt, userPrompt, maxTokens = 512, temperature = 0.2 }) {
  if (!PLATFORM_CONFIG.ai.groqApiKey) {
    throw new Error("Groq API key not configured");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PLATFORM_CONFIG.ai.groqApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: PLATFORM_CONFIG.ai.groqModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens
    }),
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty content");
  }

  return {
    provider: "groq",
    model: PLATFORM_CONFIG.ai.groqModel,
    content: String(content).trim()
  };
}

module.exports = { completeWithGroq };
