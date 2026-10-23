const { PLATFORM_CONFIG } = require("../../config/platform.config");

async function completeWithHuggingFace({ systemPrompt, userPrompt, maxTokens = 512 }) {
  if (!PLATFORM_CONFIG.ai.huggingFaceApiKey) {
    throw new Error("HuggingFace API key not configured");
  }

  const prompt = `${systemPrompt}\n\nUser:\n${userPrompt}\n\nAssistant:`;
  const endpoint = `https://api-inference.huggingface.co/models/${encodeURIComponent(PLATFORM_CONFIG.ai.huggingFaceModel)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PLATFORM_CONFIG.ai.huggingFaceApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: maxTokens,
        return_full_text: false,
        temperature: 0.2
      }
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace request failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const payload = await response.json();
  const generated =
    Array.isArray(payload) && payload[0]?.generated_text
      ? payload[0].generated_text
      : payload?.generated_text || payload?.[0]?.summary_text;

  if (!generated) {
    throw new Error("HuggingFace returned empty content");
  }

  return {
    provider: "huggingface",
    model: PLATFORM_CONFIG.ai.huggingFaceModel,
    content: String(generated).trim()
  };
}

module.exports = { completeWithHuggingFace };
