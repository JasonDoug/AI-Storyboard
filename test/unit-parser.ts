import assert from "assert";
import {
  extractJsonFromText,
  safeJsonParse,
  parseAndValidateBeats,
  RawBeatSchema,
  RawBeatsPayloadSchema,
} from "../lib/parser";

console.log("------------------------------------------------------------");
console.log("SUITE 1: LLM Parser & Schema Validation");
console.log("------------------------------------------------------------");

// Test 1: Markdown code fence extraction with ```json
const jsonInMarkdown = `
Analysis complete. Here is the requested structured visual beats:

\`\`\`json
{
  "beats": [
    {
      "id": "beat-1",
      "title": "Neon Awakening",
      "storyExcerpt": "The rain hammered against the shattered neon sign.",
      "narrativeContext": "Establishes the bleak cyberpunk tone.",
      "imagePrompt": "Wide establishing cinematic shot of rain pouring down on flickering neon sign in dark alley"
    }
  ]
}
\`\`\`

Let me know if you would like any changes!
`;

const extractedJson = extractJsonFromText(jsonInMarkdown);
assert(extractedJson.startsWith("{") && extractedJson.endsWith("}"));
const beats1 = parseAndValidateBeats(jsonInMarkdown);
assert.strictEqual(beats1.length, 1);
assert.strictEqual(beats1[0].id, "beat-1");
assert.strictEqual(beats1[0].title, "Neon Awakening");
assert.strictEqual(beats1[0].status, "pending");
console.log("  ✓ Markdown code fence extraction with preamble and postamble passed");

// Test 2: Code fence without language specifier (``` ... ```)
const rawFenced = `
\`\`\`
{
  "beats": [
    {
      "title": "The Departure",
      "storyExcerpt": "She took one final look at Earth.",
      "narrativeContext": "Point of no return.",
      "imagePrompt": "Close up of astronaut gazing through spacecraft window, Earth reflection in visor"
    }
  ]
}
\`\`\`
`;
const beats2 = parseAndValidateBeats(rawFenced);
assert.strictEqual(beats2.length, 1);
assert.strictEqual(beats2[0].id, "beat-1"); // Auto-assigned ID
assert.strictEqual(beats2[0].title, "The Departure");
console.log("  ✓ Raw code fence (no language tag) passed");

// Test 3: Bare array from models with alias keys (e.g. sceneTitle, excerpt, prompt)
const bareArrayAliases = `
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
`;
const beats3 = parseAndValidateBeats(bareArrayAliases);
assert.strictEqual(beats3.length, 2);
assert.strictEqual(beats3[0].title, "Ambush in the Ruins");
assert.strictEqual(beats3[0].storyExcerpt, "Shadows darted between the cracked pillars.");
assert.strictEqual(beats3[1].title, "Escape into the Fog");
assert.strictEqual(beats3[1].id, "beat-2");
console.log("  ✓ Bare array payload and alternate key mapping (sceneTitle, quote, visualPrompt) passed");

// Test 4: Trailing commas in objects and arrays
const trailingCommas = `
{
  "beats": [
    {
      "title": "The Final Stand",
      "storyExcerpt": "He refused to step back,",
      "narrativeContext": "Climax of the battle,",
      "imagePrompt": "Hero standing alone on fortress wall at dusk,",
    },
  ],
}
`;
const beats4 = parseAndValidateBeats(trailingCommas);
assert.strictEqual(beats4.length, 1);
assert.strictEqual(beats4[0].title, "The Final Stand");
console.log("  ✓ Trailing comma sanitization passed");

// Test 5: StoryBeats and scenes wrapper keys
const storyBeatsWrapper = JSON.stringify({
  storyBeats: [
    {
      title: "Secret Unlocked",
      imagePrompt: "Glowing glyph on ancient vault door",
    },
  ],
});
const beats5 = parseAndValidateBeats(storyBeatsWrapper);
assert.strictEqual(beats5.length, 1);
assert.strictEqual(beats5[0].title, "Secret Unlocked");

const scenesWrapper = JSON.stringify({
  scenes: [
    {
      title: "Sunrise Arrival",
      imagePrompt: "Airship arriving at sky city at sunrise",
    },
  ],
});
const beats6 = parseAndValidateBeats(scenesWrapper);
assert.strictEqual(beats6.length, 1);
assert.strictEqual(beats6[0].title, "Sunrise Arrival");
console.log("  ✓ Alternate payload wrapper keys ('storyBeats', 'scenes') passed");

// Test 6: Invalid JSON throws clean error
assert.throws(() => {
  parseAndValidateBeats("I am an AI and I cannot generate beats for this story.");
}, /Failed to parse LLM output as JSON|Invalid beat schema/);

assert.throws(() => {
  parseAndValidateBeats(JSON.stringify({ beats: [] }));
}, /empty beats array/);
console.log("  ✓ Malformed text and empty array error handling passed");

console.log("✓ All Parser & Schema tests passed successfully!\n");
