import assert from "assert";
import {
  generateMarkdown,
  buildZipArchive,
  buildPdfDocument,
} from "../lib/export";
import { Beat } from "../lib/providers";

console.log("------------------------------------------------------------");
console.log("SUITE 3: Storyboard Export Engine (PDF, ZIP, MD, JSON)");
console.log("------------------------------------------------------------");

// Sample test data
const sampleStory = `
Commander John Mercer stepped onto the rusted platform of Orbital Station Theta.
The solar arrays groaned under the pressure of the micro-meteor storm.
In his hand, the crystalline drive glowed with a faint cyan pulse.
"The coordinates are verified," he whispered into his comms.
From the observation deck, Dr. Alana Chen watched the docking clamps disengage.
`;

const sampleBible = `
Commander John Mercer: Weathered 40s astronaut, scarred jawline, worn tactical spacesuit with patch of United Sol.
Dr. Alana Chen: Astrobiologist, silver glasses, midnight-blue flight jumpsuit, focused demeanor.
`;

// Tiny 1x1 base64 transparent PNG for test image embedding
const dummyBase64Png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const sampleBeats: Beat[] = [
  {
    id: "beat-1",
    title: "Arrival at Theta",
    storyExcerpt: "Commander John Mercer stepped onto the rusted platform of Orbital Station Theta.",
    narrativeContext: "Establishes setting and protagonist isolation.",
    imagePrompt: "Cinematic wide shot of scarred astronaut standing on rusted space station deck",
    imageUrl: dummyBase64Png,
    status: "completed",
  },
  {
    id: "beat-2",
    title: "The Meteor Storm",
    storyExcerpt: "The solar arrays groaned under the pressure of the micro-meteor storm.",
    narrativeContext: "Escalating environmental threat.",
    imagePrompt: "Dramatic exterior view of glowing space station solar panels hit by micro-meteors",
    imageUrl: dummyBase64Png,
    status: "completed",
  },
  {
    id: "beat-3",
    title: "Observation Deck",
    storyExcerpt: "From the observation deck, Dr. Alana Chen watched the docking clamps disengage.",
    narrativeContext: "Introduction of secondary lead and narrative pivot.",
    imagePrompt: "Over the shoulder shot of scientist with silver glasses watching spacecraft detach",
    status: "pending", // beat without image to test placeholder handling
  },
];

const metadata = {
  artStyle: "Cinematic 35mm Film",
  aspectRatio: "16:9",
};

// 1. Test Markdown Generation
const markdown = generateMarkdown(sampleStory, sampleBible, sampleBeats, metadata);
assert(markdown.includes("# Visual Storyboard"));
assert(markdown.includes("**Global Art Style:** Cinematic 35mm Film"));
assert(markdown.includes("**Aspect Ratio:** 16:9"));
assert(markdown.includes("Commander John Mercer: Weathered 40s astronaut"));
assert(markdown.includes("### Beat 1: Arrival at Theta"));
assert(markdown.includes("### Beat 2: The Meteor Storm"));
assert(markdown.includes("### Beat 3: Observation Deck"));
assert(markdown.includes(dummyBase64Png));
console.log("  ✓ Storyboard Markdown formatting and section assembly passed");

// 2. Test ZIP Generation via buildZipArchive
async function testZip() {
  const zip = await buildZipArchive(sampleStory, sampleBible, sampleBeats, metadata);

  // Check files inside zip
  const storyFile = zip.file("story.txt");
  assert(storyFile, "Missing story.txt in ZIP");
  const storyText = await storyFile.async("string");
  assert(storyText.includes("Orbital Station Theta"));

  const bibleFile = zip.file("character-bible.txt");
  assert(bibleFile, "Missing character-bible.txt in ZIP");
  const bibleText = await bibleFile.async("string");
  assert(bibleText.includes("Commander John Mercer"));

  const mdFile = zip.file("storyboard.md");
  assert(mdFile, "Missing storyboard.md in ZIP");

  const jsonFile = zip.file("storyboard.json");
  assert(jsonFile, "Missing storyboard.json in ZIP");
  const jsonContent = JSON.parse(await jsonFile.async("string"));
  assert.strictEqual(jsonContent.beats.length, 3);
  assert.strictEqual(jsonContent.metadata.artStyle, "Cinematic 35mm Film");

  // Check images folder
  const imgFolder = zip.folder("images");
  assert(imgFolder, "Missing images/ folder in ZIP");
  const img1 = imgFolder.file("beat-1-arrival_at_theta.png");
  assert(img1, "Missing beat-1-arrival_at_theta.png in ZIP archive");
  const img1Data = await img1.async("uint8array");
  assert(img1Data.length > 0, "Image data in ZIP is empty");

  console.log("  ✓ JSZip archive generation passed (story, character-bible, markdown, json, images)");
}

// 3. Test PDF Generation via buildPdfDocument
async function testPdf() {
  const doc = await buildPdfDocument(sampleStory, sampleBible, sampleBeats, metadata);

  // Check number of pages: 1 title page + 3 beat pages = 4 pages
  const totalPages = doc.getNumberOfPages();
  assert.strictEqual(totalPages, 4, `Expected 4 PDF pages, got ${totalPages}`);

  // Check landscape format: width should be ~297mm (A4 landscape)
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  assert(width > height, "PDF document should be in landscape orientation");
  assert(Math.round(width) === 297, `Expected width ~297mm, got ${width}`);

  // Test outputting to Uint8Array buffer
  const pdfBytes = doc.output("arraybuffer");
  assert(pdfBytes.byteLength > 1000, "PDF output byte length too small");

  console.log(`  ✓ jsPDF landscape production sheet passed (${totalPages} pages generated)`);
}

(async () => {
  await testZip();
  await testPdf();
  console.log("✓ All Storyboard Export tests passed successfully!\n");
})();
