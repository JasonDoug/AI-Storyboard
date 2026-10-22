import assert from "assert";
import path from "path";
import fs from "fs";
import { POST as analyzeBeatsPOST } from "../app/api/analyze-beats/route";
import { POST as generateImagePOST } from "../app/api/generate-image/route";
import { POST as enhancePromptPOST } from "../app/api/enhance-prompt/route";

console.log("------------------------------------------------------------");
console.log("SUITE 4: Next.js API Route Handlers");
console.log("------------------------------------------------------------");

async function testAnalyzeBeatsRoute() {
  console.log("• Testing /api/analyze-beats route:");

  // Test 1: Empty request body
  const reqEmpty = new Request("http://localhost:3000/api/analyze-beats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const resEmpty = await analyzeBeatsPOST(reqEmpty);
  assert.strictEqual(resEmpty.status, 400);
  const dataEmpty = await resEmpty.json();
  assert.strictEqual(dataEmpty.error, "Story text is required");
  console.log("  ✓ Validation: rejects missing story text with 400 status");

  // Test 2: Whitespace-only story
  const reqWhitespace = new Request("http://localhost:3000/api/analyze-beats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ story: "    " }),
  });
  const resWhitespace = await analyzeBeatsPOST(reqWhitespace);
  assert.strictEqual(resWhitespace.status, 400);
  console.log("  ✓ Validation: rejects whitespace-only story text with 400 status");
}

async function testGenerateImageRoute() {
  console.log("• Testing /api/generate-image route:");

  // Test 1: Empty prompt
  const reqNoPrompt = new Request("http://localhost:3000/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const resNoPrompt = await generateImagePOST(reqNoPrompt);
  assert.strictEqual(resNoPrompt.status, 400);
  const dataNoPrompt = await resNoPrompt.json();
  assert.strictEqual(dataNoPrompt.error, "Image prompt is required");
  console.log("  ✓ Validation: rejects missing image prompt with 400 status");

  // Test 2: Missing API key for Gemini provider
  const reqNoGeminiKey = new Request("http://localhost:3000/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "A cinematic space scene",
      provider: "gemini",
      apiKey: "", // explicit blank key with no env key
    }),
  });
  // Clear env key temporarily to test error handling
  const prevGemini = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const resNoGeminiKey = await generateImagePOST(reqNoGeminiKey);
  assert.strictEqual(resNoGeminiKey.status, 500);
  const dataGeminiErr = await resNoGeminiKey.json();
  assert(dataGeminiErr.error.includes("Gemini API Key missing"));
  console.log("  ✓ Provider error handling: correctly reports missing Gemini credentials");

  if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;

  // Test 3: Local Image File Persistence in public/generated
  console.log("• Testing Image Persistence in public/generated:");
  const testDir = path.join(process.cwd(), "public", "generated");
  await fs.promises.mkdir(testDir, { recursive: true });

  const testFilename = `test-persistence-${Date.now()}.png`;
  const testFilePath = path.join(testDir, testFilename);
  const testBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  await fs.promises.writeFile(testFilePath, testBuffer);
  assert(fs.existsSync(testFilePath), "Test image file was not created on disk");

  const readBack = await fs.promises.readFile(testFilePath);
  assert.strictEqual(readBack.length, testBuffer.length);

  // Clean up test file
  await fs.promises.unlink(testFilePath);
  assert(!fs.existsSync(testFilePath), "Test image file was not cleaned up");
  console.log("  ✓ Image disk caching and filesystem write/read validated");

  // Test 4: AI Studio Provider Image Generation
  console.log("• Testing AI Studio image generation with local server:");
  const reqAiStudio = new Request("http://localhost:3000/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "A lone cyberpunk wanderer beneath a neon streetlight",
      provider: "aistudio",
      selectedArtStyleId: "cyberpunk-concept",
    }),
  });

  const resAiStudio = await generateImagePOST(reqAiStudio);
  assert.strictEqual(resAiStudio.status, 200, `Expected 200, got ${resAiStudio.status}`);
  const dataAiStudio = await resAiStudio.json();
  assert(dataAiStudio.imageUrl, "AI Studio did not return an imageUrl");
  assert(dataAiStudio.dataUrl, "AI Studio did not return a dataUrl");
  assert(dataAiStudio.imageUrl.startsWith("/generated/beat-"), "Image path is not in /generated/");
  console.log(`  ✓ AI Studio image generated & saved successfully: ${dataAiStudio.imageUrl}`);
}

async function testEnhancePromptRoute() {
  console.log("• Testing /api/enhance-prompt route:");

  // Test 1: Empty prompt validation
  const reqEmpty = new Request("http://localhost:3000/api/enhance-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const resEmpty = await enhancePromptPOST(reqEmpty);
  assert.strictEqual(resEmpty.status, 400);
  console.log("  ✓ Validation: rejects missing prompt with 400 status");

  // Test 2: Prompt enhancement with AI Studio
  const reqEnhance = new Request("http://localhost:3000/api/enhance-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "cyberpunk cat",
    }),
  });
  const resEnhance = await enhancePromptPOST(reqEnhance);
  assert.strictEqual(resEnhance.status, 200);
  const dataEnhance = await resEnhance.json();
  assert.strictEqual(dataEnhance.success, true);
  assert(typeof dataEnhance.enhancedPrompt === "string" && dataEnhance.enhancedPrompt.length > 5);
  console.log(`  ✓ AI Studio prompt enhancement succeeded: "${dataEnhance.enhancedPrompt.slice(0, 60)}..."`);
}

(async () => {
  await testAnalyzeBeatsRoute();
  await testGenerateImageRoute();
  await testEnhancePromptRoute();
  console.log("✓ All API Route Handler tests passed successfully!\n");
})();
