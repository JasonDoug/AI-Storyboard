import assert from "assert";
import {
  extractJsonFromText,
  safeJsonParse,
  parseAndValidateBeats,
} from "../lib/parser";
import {
  getLLMClient,
  ART_STYLES,
} from "../lib/providers";
import { generateMarkdown } from "../lib/export";

console.log("=== RUNNING SUITE: Robust LLM Response Parser ===");

// 1. Test markdown code fence extraction
const fencedJson = `
Here are the visual beats for your story:

\`\`\`json
{
  "beats": [
    {
      "id": "beat-1",
      "title": "The Signal Awakens",
      "storyExcerpt": "The antenna dish rotated with a groan.",
      "narrativeContext": "Establishes the alien contact.",
      "imagePrompt": "Cinematic wide angle shot of a massive radio telescope against a starfield, blue volumetric lighting"
    }
  ]
}
\`\`\`

Hope this helps!
`;

const extractedFenced = extractJsonFromText(fencedJson);
const beatsFromFenced = parseAndValidateBeats(fencedJson);
assert.strictEqual(beatsFromFenced.length, 1);
assert.strictEqual(beatsFromFenced[0].title, "The Signal Awakens");
assert.strictEqual(beatsFromFenced[0].id, "beat-1");
console.log("✓ Markdown code fence extraction passed");

// 2. Test bare array payload from open-source models
const bareArray = `
\`\`\`
[
  {
    "sceneTitle": "Ambush in the Ruins",
    "quote": "Shadows darted between the cracked pillars.",
    "context": "The tension breaks into action.",
    "prompt": "Low angle dramatic shot of shadowy figures lurking in ancient crumbling stone ruins"
  },
  {
    "headline": "Escape into the Fog",
    "excerpt": "She vanished into the mist.",
    "reason": "Resolves the chase sequence.",
    "visualPrompt": "Atmospheric silhouette running into dense white fog, headlights cutting through haze"
  }
]
\`\`\`
`;

const beatsFromBareArray = parseAndValidateBeats(bareArray);
assert.strictEqual(beatsFromBareArray.length, 2);
assert.strictEqual(beatsFromBareArray[0].title, "Ambush in the Ruins");
assert.strictEqual(beatsFromBareArray[0].storyExcerpt, "Shadows darted between the cracked pillars.");
assert.strictEqual(beatsFromBareArray[1].title, "Escape into the Fog");
assert.strictEqual(beatsFromBareArray[1].id, "beat-2");
console.log("✓ Bare array and alternate key mapping passed");

// 3. Test trailing commas handling
const trailingCommaJson = `{
  "beats": [
    {
      "title": "Final Stand",
      "imagePrompt": "Hero facing insurmountable odds at dawn,",
    },
  ],
}`;

const beatsFromTrailingComma = parseAndValidateBeats(trailingCommaJson);
assert.strictEqual(beatsFromTrailingComma.length, 1);
assert.strictEqual(beatsFromTrailingComma[0].title, "Final Stand");
console.log("✓ Trailing commas sanitization passed");

// 4. Test error handling on unparseable garbage
assert.throws(() => {
  parseAndValidateBeats("This is completely invalid text with no JSON at all.");
}, /Failed to parse|empty/);
console.log("✓ Invalid JSON error handling passed");

console.log("\n=== RUNNING SUITE: Providers & Clients ===");

// 5. Test getLLMClient for OpenAI
const openaiClient = getLLMClient({ provider: "openai", apiKey: "test-key" });
assert.strictEqual(openaiClient.provider, "openai");
assert.strictEqual(openaiClient.defaultModel, "gpt-4o");
assert.strictEqual(openaiClient.client.apiKey, "test-key");

// 6. Test getLLMClient for OpenRouter
const openrouterClient = getLLMClient({ provider: "openrouter", apiKey: "test-or-key" });
assert.strictEqual(openrouterClient.provider, "openrouter");
assert.strictEqual(openrouterClient.defaultModel, "anthropic/claude-3.5-sonnet");
assert.strictEqual(openrouterClient.client.baseURL, "https://openrouter.ai/api/v1");

// 7. Test getLLMClient for Ollama
const ollamaClient = getLLMClient({
  provider: "ollama",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  model: "mistral:latest",
});
assert.strictEqual(ollamaClient.provider, "ollama");
assert.strictEqual(ollamaClient.defaultModel, "mistral:latest");
assert.strictEqual(ollamaClient.client.baseURL, "http://127.0.0.1:11434/v1");

// 8. Test getLLMClient for Gemini
const geminiClient = getLLMClient({ provider: "gemini", apiKey: "test-gemini-key" });
assert.strictEqual(geminiClient.provider, "gemini");
assert.strictEqual(geminiClient.defaultModel, "gemini-2.0-flash");
assert.strictEqual(geminiClient.client.baseURL, "https://generativelanguage.googleapis.com/v1beta/openai/");
console.log("✓ All 4 LLM providers instantiated properly with OpenAI-compatible clients");

// 9. Test Art Styles presets
assert(ART_STYLES.length >= 6);
const cinematic = ART_STYLES.find((s) => s.id === "cinematic-35mm");
assert(cinematic && cinematic.promptModifier.includes("35mm film"));
const charcoal = ART_STYLES.find((s) => s.id === "charcoal-sketch");
assert(charcoal && charcoal.promptModifier.includes("charcoal"));
console.log("✓ Art style presets validated");

console.log("\n=== RUNNING SUITE: Export Utilities ===");

// 10. Test Markdown generation
const markdownOutput = generateMarkdown(
  "Once upon a time in Neo-Tokyo...",
  "Kira: Cybernetic bounty hunter with silver hair.",
  beatsFromBareArray,
  { artStyle: "Cinematic 35mm", aspectRatio: "16:9" }
);

assert(markdownOutput.includes("# Visual Storyboard"));
assert(markdownOutput.includes("Kira: Cybernetic bounty hunter"));
assert(markdownOutput.includes("Ambush in the Ruins"));
assert(markdownOutput.includes("Escape into the Fog"));
console.log("✓ Storyboard Markdown export formatting verified");

console.log("\n>>> ALL UNIT TESTS PASSED SUCCESSFULLY! <<<");
