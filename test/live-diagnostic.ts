import { getLLMClient } from "../lib/providers";
import { parseAndValidateBeats } from "../lib/parser";

console.log("============================================================");
console.log("DIAGNOSTIC: Environment & Live AI Provider Check");
console.log("============================================================");

async function checkOllama() {
  console.log("\n[1] Checking Local Ollama Instance (http://localhost:11434)...");
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    if (!res.ok) {
      console.log("  ⚠️  Ollama server responded with error code:", res.status);
      return null;
    }

    const data = (await res.json()) as { models?: Array<{ name: string; size: number }> };
    const models = data.models || [];
    console.log(`  ✓ Ollama is ONLINE with ${models.length} installed model(s):`);
    models.forEach((m) => {
      const sizeGB = (m.size / (1024 * 1024 * 1024)).toFixed(2);
      console.log(`     • ${m.name.padEnd(30)} (~${sizeGB} GB)`);
    });

    return models;
  } catch (err: any) {
    console.log("  ℹ️  Ollama is not running locally (Connection refused or unreachable).");
    return null;
  }
}

async function testLiveOllamaExtraction(models: Array<{ name: string }>) {
  // Find a suitable model, prioritizing llama3.2, qwen2.5, or first available
  const preferred = ["llama3.2:latest", "llama3.2", "qwen2.5:7b", "deepseek-r1:8b"];
  const candidate =
    models.find((m) => preferred.includes(m.name)) ||
    models.find((m) => !m.name.includes("embed")) ||
    models[0];

  if (!candidate) {
    console.log("  ⚠️ No text generation models found in Ollama to test live extraction.");
    return;
  }

  console.log(`\n[2] Running Live Beat Extraction via Local Ollama (${candidate.name})...`);
  const microStory = `
The airlock hissed open as Lieutenant Vane stepped into the forgotten botanical laboratory.
Massive bio-luminescent vines had cracked the reinforced steel walls, casting an eerie emerald glow.
In the center of the chamber, a solitary holographic terminal flickered with an unread distress beacon.
  `.trim();

  try {
    const { client, defaultModel } = getLLMClient({
      provider: "ollama",
      ollamaBaseUrl: "http://localhost:11434",
      model: candidate.name,
    });

    console.log(`  • Sending prompt to ${client.baseURL} using model "${candidate.name}"...`);
    const startTime = Date.now();

    const completion = await client.chat.completions.create({
      model: candidate.name,
      messages: [
        {
          role: "system",
          content: `You are a film director. Extract 2 visual storyboard beats from the story.
Return JSON ONLY in this format:
{
  "beats": [
    {
      "id": "beat-1",
      "title": "Scene headline",
      "storyExcerpt": "Quote from text",
      "narrativeContext": "Why pivotal",
      "imagePrompt": "Detailed visual description"
    }
  ]
}`,
        },
        {
          role: "user",
          content: microStory,
        },
      ],
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const content = completion.choices[0]?.message?.content || "";
    console.log(`  ✓ Received response in ${elapsed}s!`);

    const beats = parseAndValidateBeats(content);
    console.log(`  ✓ Successfully parsed ${beats.length} visual beats from live Ollama inference:`);
    beats.forEach((b, i) => {
      console.log(`     Beat ${i + 1}: "${b.title}"`);
      console.log(`       Excerpt: "${b.storyExcerpt}"`);
      console.log(`       Prompt:  "${b.imagePrompt.slice(0, 80)}..."`);
    });
  } catch (err: any) {
    console.log(`  ⚠️  Live Ollama inference test failed or timed out: ${err.message}`);
  }
}

function checkCloudKeys() {
  console.log("\n[3] Checking Cloud Provider API Keys (from process.env):");

  const providers = [
    { name: "OpenAI (GPT-4o / DALL-E 3)", key: process.env.OPENAI_API_KEY },
    { name: "Google Gemini (Gemini 2.0 / Imagen 3)", key: process.env.GEMINI_API_KEY },
    { name: "OpenRouter (Claude 3.5 / Image models)", key: process.env.OPENROUTER_API_KEY },
  ];

  providers.forEach((p) => {
    if (p.key && p.key !== "your_openai_api_key_here" && !p.key.startsWith("your_")) {
      const masked = `${p.key.slice(0, 4)}...${p.key.slice(-4)}`;
      console.log(`  ✓ ${p.name.padEnd(45)}: CONFIGURED (${masked})`);
    } else {
      console.log(`  ○ ${p.name.padEnd(45)}: NOT CONFIGURED (Optional, user can enter in UI)`);
    }
  });
}

(async () => {
  const models = await checkOllama();
  if (models && models.length > 0) {
    await testLiveOllamaExtraction(models);
  }
  checkCloudKeys();
  console.log("\n============================================================");
  console.log("Diagnostic Completed");
  console.log("============================================================\n");
})();
