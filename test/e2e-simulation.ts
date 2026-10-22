import assert from "assert";
import fs from "fs";
import path from "path";
import { parseAndValidateBeats } from "../lib/parser";
import { ART_STYLES, AspectRatio, Beat } from "../lib/providers";
import { buildZipArchive, buildPdfDocument, generateMarkdown } from "../lib/export";

console.log("============================================================");
console.log("E2E PIPELINE SIMULATION: Full Storyboard Workflow");
console.log("============================================================");

async function runE2ESimulation() {
  const outputDir = path.join(process.cwd(), "test-output");
  await fs.promises.mkdir(outputDir, { recursive: true });

  console.log("\n[Step 1] Ingesting Story and Character Bible...");
  const story = `
The heavy iron vault groaned as Nora entered the abandoned observatory atop Mount Rainier.
Outside, lightning fractured the midnight sky, casting sharp silhouettes across rusted brass dials.
On the central pedestal sat the chronometer, its gears spinning in reverse with a high-pitched hum.
"It didn't stop," Nora said into her tape recorder.
Through the cracked telescope lens, a star was visibly collapsing inward.
  `.trim();

  const characterBible = `
Nora Vance: 30s astrophysicist, trench coat, round wire glasses, carrying a vintage cassette recorder.
Setting: Abandoned 1950s mountain observatory during a violent thunderstorm.
  `.trim();

  const artStyle = ART_STYLES.find((s) => s.id === "cinematic-35mm")!;
  const aspectRatio: AspectRatio = "16:9";

  console.log(`  • Story length: ${story.length} chars`);
  console.log(`  • Global Art Style: "${artStyle.name}"`);
  console.log(`  • Aspect Ratio: ${aspectRatio}`);

  console.log("\n[Step 2] Simulating LLM Beat Extraction...");
  // Simulated high-fidelity structured completion matching the prompt contract
  const simulatedLlmOutput = `
\`\`\`json
{
  "beats": [
    {
      "id": "beat-1",
      "title": "Breaching the Observatory",
      "storyExcerpt": "The heavy iron vault groaned as Nora entered the abandoned observatory atop Mount Rainier.",
      "narrativeContext": "Inciting entrance; establishes stormy atmospheric setting and isolation.",
      "imagePrompt": "Wide shot of Nora in trench coat pushing open heavy rusted vault doors into dark observatory, lightning illuminating Mount Rainier behind her, cinematic 35mm film photograph, film grain"
    },
    {
      "id": "beat-2",
      "title": "The Reverse Chronometer",
      "storyExcerpt": "On the central pedestal sat the chronometer, its gears spinning in reverse with a high-pitched hum.",
      "narrativeContext": "Discovery of the anomalous device violating known physics.",
      "imagePrompt": "Close up shot of ornate brass chronometer on pedestal, interlocking gears blurring in reverse motion, cyan particle sparks, dramatic chiaroscuro lighting"
    },
    {
      "id": "beat-3",
      "title": "Collapsing Star",
      "storyExcerpt": "Through the cracked telescope lens, a star was visibly collapsing inward.",
      "narrativeContext": "Cosmic revelation linking the device to the celestial catastrophe.",
      "imagePrompt": "POV shot looking through cracked vintage telescope lens at deep cosmos, distant violet star imploding into gravitational singularity, lens flare"
    }
  ]
}
\`\`\`
  `;

  const beats = parseAndValidateBeats(simulatedLlmOutput);
  assert.strictEqual(beats.length, 3, "Expected 3 extracted beats");
  console.log(`  ✓ Extracted and validated ${beats.length} visual beats`);

  console.log("\n[Step 3] Rendering & Persisting Visual Beat Frames...");
  const publicGenDir = path.join(process.cwd(), "public", "generated");
  await fs.promises.mkdir(publicGenDir, { recursive: true });

  // Generate 3 sample test frames (valid 1x1 PNGs with distinct colors)
  const sampleColors = [
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwGA6H6NAAAAAElFTkSuQmCC",
  ];

  for (let i = 0; i < beats.length; i++) {
    const filename = `e2e-beat-${i + 1}-${Date.now()}.png`;
    const filePath = path.join(publicGenDir, filename);
    const buf = Buffer.from(sampleColors[i], "base64");
    await fs.promises.writeFile(filePath, buf);

    beats[i].imageUrl = `/generated/${filename}`;
    beats[i].status = "completed";
    console.log(`  ✓ Generated Frame for Beat ${i + 1}: ${beats[i].title} -> ${beats[i].imageUrl}`);
  }

  console.log("\n[Step 4] Compiling Production Storyboard Exports...");
  const metadata = {
    artStyle: artStyle.name,
    aspectRatio,
  };

  // 1. Export Markdown
  const mdContent = generateMarkdown(story, characterBible, beats, metadata);
  const mdPath = path.join(outputDir, "storyboard.md");
  await fs.promises.writeFile(mdPath, mdContent, "utf-8");
  console.log(`  ✓ Exported Markdown -> ${mdPath} (${mdContent.length} bytes)`);

  // 2. Export JSON
  const jsonContent = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      metadata,
      characterBible,
      story,
      beats,
    },
    null,
    2
  );
  const jsonPath = path.join(outputDir, "storyboard.json");
  await fs.promises.writeFile(jsonPath, jsonContent, "utf-8");
  console.log(`  ✓ Exported JSON -> ${jsonPath} (${jsonContent.length} bytes)`);

  // 3. Export ZIP package
  const zip = await buildZipArchive(story, characterBible, beats, metadata);
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipPath = path.join(outputDir, "storyboard-package.zip");
  await fs.promises.writeFile(zipPath, zipBuffer);
  console.log(`  ✓ Exported ZIP package -> ${zipPath} (${zipBuffer.length} bytes)`);

  // 4. Export PDF production sheet
  const pdfDoc = await buildPdfDocument(story, characterBible, beats, metadata);
  const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
  const pdfPath = path.join(outputDir, "storyboard-sheet.pdf");
  await fs.promises.writeFile(pdfPath, pdfBuffer);
  console.log(`  ✓ Exported PDF production sheet -> ${pdfPath} (${pdfBuffer.length} bytes)`);

  console.log("\n[Step 5] Verifying Exported File Integrity...");
  assert(fs.existsSync(mdPath) && fs.statSync(mdPath).size > 100);
  assert(fs.existsSync(jsonPath) && fs.statSync(jsonPath).size > 100);
  assert(fs.existsSync(zipPath) && fs.statSync(zipPath).size > 500);
  assert(fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 1000);

  // Check PDF header
  const pdfHeader = pdfBuffer.slice(0, 5).toString();
  assert.strictEqual(pdfHeader, "%PDF-", "Generated PDF must start with %PDF- header");
  console.log("  ✓ PDF header magic bytes verified (%PDF-)");

  // Clean up temporary generated images
  for (const beat of beats) {
    if (beat.imageUrl?.startsWith("/generated/")) {
      const p = path.join(process.cwd(), "public", beat.imageUrl);
      if (fs.existsSync(p)) await fs.promises.unlink(p);
    }
  }

  console.log("\n============================================================");
  console.log("✓ E2E PIPELINE SIMULATION COMPLETED SUCCESSFULLY!");
  console.log(`Artifacts available in: ${outputDir}`);
  console.log("============================================================\n");
}

(async () => {
  await runE2ESimulation();
})();
