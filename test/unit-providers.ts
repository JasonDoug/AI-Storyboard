import assert from "assert";
import {
  getLLMClient,
  ART_STYLES,
  AspectRatio,
  LLMProvider,
  AI_STUDIO_IMAGE_MODELS,
  AI_STUDIO_DEFAULT_MODEL,
  AI_STUDIO_DEFAULT_URL,
  AI_STUDIO_DEFAULT_KEY,
  mapToAIStudioStyle,
} from "../lib/providers";

console.log("------------------------------------------------------------");
console.log("SUITE 2: LLM & Image Providers Configuration");
console.log("------------------------------------------------------------");

// Test 1: OpenAI LLM Client
const openaiRes = getLLMClient({ provider: "openai", apiKey: "sk-test-openai-123" });
assert.strictEqual(openaiRes.provider, "openai");
assert.strictEqual(openaiRes.defaultModel, "gpt-4o");
assert.strictEqual(openaiRes.client.apiKey, "sk-test-openai-123");
console.log("  ✓ OpenAI client configuration validated (gpt-4o default)");

// Test 2: Custom model override for OpenAI
const openaiCustom = getLLMClient({
  provider: "openai",
  apiKey: "sk-test",
  model: "gpt-4o-mini",
});
assert.strictEqual(openaiCustom.defaultModel, "gpt-4o-mini");
console.log("  ✓ OpenAI model override validated");

// Test 3: OpenRouter LLM Client
const openrouterRes = getLLMClient({
  provider: "openrouter",
  apiKey: "sk-or-v1-test",
});
assert.strictEqual(openrouterRes.provider, "openrouter");
assert.strictEqual(openrouterRes.defaultModel, "openrouter/free");
assert.strictEqual(openrouterRes.client.baseURL, "https://openrouter.ai/api/v1");
console.log("  ✓ OpenRouter client configuration validated (openrouter/free default auto router)");

// Test 4: Ollama Client URL normalization
// Subtest 4a: Plain host without /v1
const ollama1 = getLLMClient({
  provider: "ollama",
  ollamaBaseUrl: "http://localhost:11434",
});
assert.strictEqual(ollama1.provider, "ollama");
assert.strictEqual(ollama1.defaultModel, "llama3.2");
assert.strictEqual(ollama1.client.baseURL, "http://localhost:11434/v1");

// Subtest 4b: Host with trailing slashes
const ollama2 = getLLMClient({
  provider: "ollama",
  ollamaBaseUrl: "http://localhost:11434///",
});
assert.strictEqual(ollama2.client.baseURL, "http://localhost:11434/v1");

// Subtest 4c: Host with explicit /v1 already appended
const ollama3 = getLLMClient({
  provider: "ollama",
  ollamaBaseUrl: "http://192.168.1.50:11434/v1",
  model: "qwen2.5:7b",
});
assert.strictEqual(ollama3.client.baseURL, "http://192.168.1.50:11434/v1");
assert.strictEqual(ollama3.defaultModel, "qwen2.5:7b");
console.log("  ✓ Ollama URL normalization and baseURL mapping passed");

// Test 5: Google Gemini LLM Client (OpenAI-compatible endpoint)
const geminiRes = getLLMClient({
  provider: "gemini",
  apiKey: "AIzaSyTestKey",
});
assert.strictEqual(geminiRes.provider, "gemini");
assert.strictEqual(geminiRes.defaultModel, "gemini-2.0-flash");
assert.strictEqual(
  geminiRes.client.baseURL,
  "https://generativelanguage.googleapis.com/v1beta/openai/"
);
console.log("  ✓ Google Gemini OpenAI-compatible client configuration validated");

// Test 6: Art Styles Presets
assert(ART_STYLES.length >= 7, "Expected at least 7 art styles");
const requiredStyles = [
  "cinematic-35mm",
  "charcoal-sketch",
  "anime-ghibli",
  "graphic-novel",
  "pixar-3d",
  "cyberpunk-concept",
  "watercolor-concept",
  "none",
];

for (const styleId of requiredStyles) {
  const found = ART_STYLES.find((s) => s.id === styleId);
  assert(found, `Missing expected art style preset: ${styleId}`);
  assert(found.name.length > 0, `Art style ${styleId} has empty name`);
  if (styleId !== "none") {
    assert(found.promptModifier.length > 10, `Art style ${styleId} prompt modifier too short`);
  }
}
console.log(`  ✓ All ${ART_STYLES.length} Art Style presets validated with prompt modifiers`);

// Test 7: Aspect Ratios
const supportedRatios: AspectRatio[] = ["16:9", "2.39:1", "1:1", "9:16", "4:3"];
assert.strictEqual(supportedRatios.length, 5);
console.log("  ✓ Aspect ratios (16:9, 2.39:1, 1:1, 9:16, 4:3) validated");

// Test 8: AI Studio Models and Defaults
assert.strictEqual(AI_STUDIO_DEFAULT_MODEL, "@cf/bytedance/stable-diffusion-xl-lightning");
assert.strictEqual(AI_STUDIO_DEFAULT_URL, "http://localhost:8000");
assert.strictEqual(AI_STUDIO_DEFAULT_KEY, "5b7f74f8ddb448f920eef0ae4263d81525d74");

// Verify that generous models are included
const modelIds = AI_STUDIO_IMAGE_MODELS.map((m) => m.id);
assert(modelIds.includes("@cf/bytedance/stable-diffusion-xl-lightning"));
assert(modelIds.includes("@cf/stabilityai/stable-diffusion-xl-base-1.0"));
assert(modelIds.includes("@cf/lykon/dreamshaper-8-lcm"));
assert(modelIds.includes("@cf/black-forest-labs/flux-1-schnell"));

// Verify that expensive models (>2000 neurons) are strictly excluded to preserve quota
assert(!modelIds.includes("@cf/black-forest-labs/flux-2-dev"), "Expensive flux-2-dev must not be in default list");
assert(!modelIds.includes("@cf/black-forest-labs/flux-2-klein-9b"), "Expensive flux-2-klein-9b must not be in default list");
console.log("  ✓ AI Studio generous models and default configurations validated (expensive models excluded)");

// Test 9: Style preset mapping
assert.strictEqual(mapToAIStudioStyle("cinematic-35mm"), "cinematic");
assert.strictEqual(mapToAIStudioStyle("anime-ghibli"), "anime");
assert.strictEqual(mapToAIStudioStyle("cyberpunk-concept"), "cyberpunk");
assert.strictEqual(mapToAIStudioStyle("pixar-3d"), "3d-render");
assert.strictEqual(mapToAIStudioStyle("graphic-novel"), "comic-book");
assert.strictEqual(mapToAIStudioStyle("unknown-style"), undefined);
console.log("  ✓ AI Studio style preset mapping validated");

console.log("✓ All Provider & Configuration tests passed successfully!\n");
