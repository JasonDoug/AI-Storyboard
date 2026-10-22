import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { Beat } from "./providers";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]/gi, "_").toLowerCase().slice(0, 30);
}

function triggerDownload(blob: Blob, filename: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a text string as a file.
 */
export function downloadText(content: string, filename: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  triggerDownload(blob, filename);
}

/**
 * Generates formatted Markdown representation of the storyboard.
 */
export function generateMarkdown(
  story: string,
  characterBible: string,
  beats: Beat[],
  metadata: { artStyle: string; aspectRatio: string }
): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let md = `# Visual Storyboard\n\n`;
  md += `**Date:** ${dateStr}  \n`;
  md += `**Global Art Style:** ${metadata.artStyle || "Default"}  \n`;
  md += `**Aspect Ratio:** ${metadata.aspectRatio}  \n\n`;
  md += `---\n\n`;

  if (characterBible.trim()) {
    md += `## Character Bible & Cast\n\n${characterBible.trim()}\n\n---\n\n`;
  }

  md += `## Story Source\n\n${story.trim()}\n\n---\n\n`;

  md += `## Storyboard Visual Beats\n\n`;

  beats.forEach((beat, idx) => {
    md += `### Beat ${idx + 1}: ${beat.title}\n\n`;
    if (beat.imageUrl) {
      md += `![${beat.title}](${beat.imageUrl})\n\n`;
    }
    if (beat.storyExcerpt) {
      md += `> "${beat.storyExcerpt}"\n\n`;
    }
    if (beat.narrativeContext) {
      md += `**Context:** ${beat.narrativeContext}\n\n`;
    }
    md += `**Image Prompt:**\n\`\`\`\n${beat.imagePrompt}\n\`\`\`\n\n`;
    md += `---\n\n`;
  });

  return md;
}

/**
 * Exports storyboard data to JSON file.
 */
export function exportToJson(
  story: string,
  characterBible: string,
  beats: Beat[],
  metadata: any
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    metadata,
    characterBible,
    story,
    beats,
  };
  const content = JSON.stringify(payload, null, 2);
  downloadText(content, `storyboard-${Date.now()}.json`, "application/json");
}

/**
 * Exports storyboard to Markdown file.
 */
export function exportToMarkdown(
  story: string,
  characterBible: string,
  beats: Beat[],
  metadata: { artStyle: string; aspectRatio: string }
) {
  const md = generateMarkdown(story, characterBible, beats, metadata);
  downloadText(md, `storyboard-${Date.now()}.md`, "text/markdown");
}

/**
 * Helper to fetch image data as ArrayBuffer or Uint8Array for ZIP/PDF packaging.
 */
async function getImageBytes(url: string): Promise<{ data: Uint8Array; format: string } | null> {
  try {
    if (url.startsWith("data:")) {
      const parts = url.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/png";
      const format = mime.includes("jpeg") || mime.includes("jpg") ? "JPEG" : "PNG";
      const binaryStr = typeof atob !== "undefined"
        ? atob(parts[1])
        : Buffer.from(parts[1], "base64").toString("binary");
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return { data: bytes, format };
    }

    // If local relative generated file in server/test environment
    if (typeof window === "undefined" && url.startsWith("/")) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const localPath = path.join(process.cwd(), "public", url);
        if (fs.existsSync(localPath)) {
          const fileBuf = await fs.promises.readFile(localPath);
          const format = url.endsWith(".jpg") || url.endsWith(".jpeg") ? "JPEG" : "PNG";
          return { data: new Uint8Array(fileBuf), format };
        }
      } catch (fsErr) {
        // fallback to fetch
      }
    }

    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "";
    const format = contentType.includes("jpeg") || contentType.includes("jpg") ? "JPEG" : "PNG";
    return { data: new Uint8Array(arrayBuf), format };
  } catch (err) {
    console.error("Failed to load image bytes for export:", url, err);
    return null;
  }
}

/**
 * Builds the JSZip archive object without triggering browser download.
 */
export async function buildZipArchive(
  story: string,
  characterBible: string,
  beats: Beat[],
  metadata: { artStyle: string; aspectRatio: string }
): Promise<JSZip> {
  const zip = new JSZip();

  zip.file("story.txt", story);
  if (characterBible.trim()) {
    zip.file("character-bible.txt", characterBible);
  }

  const markdown = generateMarkdown(story, characterBible, beats, metadata);
  zip.file("storyboard.md", markdown);

  zip.file(
    "storyboard.json",
    JSON.stringify({ exportedAt: new Date().toISOString(), metadata, characterBible, story, beats }, null, 2)
  );

  const imgFolder = zip.folder("images");

  for (let idx = 0; idx < beats.length; idx++) {
    const beat = beats[idx];
    if (beat.imageUrl && imgFolder) {
      const imgData = await getImageBytes(beat.imageUrl);
      if (imgData) {
        const ext = imgData.format.toLowerCase() === "jpeg" ? "jpg" : "png";
        const fname = `beat-${idx + 1}-${sanitizeFilename(beat.title)}.${ext}`;
        imgFolder.file(fname, imgData.data);
      }
    }
  }

  return zip;
}

/**
 * Exports complete package (images + markdown + script + json) into a ZIP archive and triggers browser download.
 */
export async function exportToZip(
  story: string,
  characterBible: string,
  beats: Beat[],
  metadata: { artStyle: string; aspectRatio: string }
) {
  const zip = await buildZipArchive(story, characterBible, beats, metadata);
  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `storyboard-package-${Date.now()}.zip`);
}

/**
 * Generates the clean, printable storyboard PDF document object.
 */
export async function buildPdfDocument(
  story: string,
  characterBible: string,
  beats: Beat[],
  metadata: { artStyle: string; aspectRatio: string }
): Promise<jsPDF> {
  // Use landscape orientation for traditional cinematic storyboard look
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Title Page / Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setTextColor(248, 250, 252); // slate-50
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("STORYBOARD PRODUCTION SHEET", margin, 24);

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont("helvetica", "normal");
  doc.text(
    `Date: ${new Date().toLocaleDateString()}   |   Aspect Ratio: ${metadata.aspectRatio}   |   Style: ${metadata.artStyle || "Default"}`,
    margin,
    32
  );

  if (characterBible.trim()) {
    doc.setFontSize(11);
    doc.setTextColor(129, 140, 248); // indigo-400
    doc.setFont("helvetica", "bold");
    doc.text("Cast & Character Bible:", margin, 42);

    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.setFont("helvetica", "italic");
    const bibleLines = doc.splitTextToSize(characterBible.trim(), pageWidth - margin * 2);
    doc.text(bibleLines.slice(0, 4), margin, 48);
  }

  // Render individual beats (1 beat per page for maximum visual impact, or 2 per page)
  for (let idx = 0; idx < beats.length; idx++) {
    const beat = beats[idx];
    doc.addPage("a4", "landscape");

    // Dark backdrop for cinematic look
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Header bar
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, margin, pageWidth - margin * 2, 12, "F");

    doc.setFontSize(11);
    doc.setTextColor(129, 140, 248);
    doc.setFont("helvetica", "bold");
    doc.text(`BEAT ${idx + 1} OF ${beats.length}`, margin + 4, margin + 8);

    doc.setTextColor(255, 255, 255);
    doc.text(beat.title.toUpperCase(), margin + 45, margin + 8);

    // Left column: Image
    const imgX = margin;
    const imgY = margin + 16;
    const imgWidth = 145;
    const imgHeight = 85;

    // Draw image frame placeholder
    doc.setFillColor(2, 6, 23);
    doc.rect(imgX, imgY, imgWidth, imgHeight, "F");
    doc.setDrawColor(51, 65, 85);
    doc.rect(imgX, imgY, imgWidth, imgHeight, "S");

    if (beat.imageUrl) {
      const imgBytes = await getImageBytes(beat.imageUrl);
      if (imgBytes) {
        try {
          doc.addImage(imgBytes.data, imgBytes.format, imgX, imgY, imgWidth, imgHeight);
        } catch (imgErr) {
          console.warn("Failed to embed image into PDF:", imgErr);
        }
      }
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Visual Pending / Not Generated", imgX + 40, imgY + 45);
    }

    // Right column: Narrative and Prompt Details
    const textX = imgX + imgWidth + 10;
    const textWidth = pageWidth - textX - margin;
    let currentY = imgY + 6;

    // Excerpt
    if (beat.storyExcerpt) {
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "bold");
      doc.text("STORY EXCERPT:", textX, currentY);
      currentY += 5;

      doc.setFont("helvetica", "italic");
      doc.setTextColor(226, 232, 240);
      const excerptLines = doc.splitTextToSize(`"${beat.storyExcerpt}"`, textWidth);
      doc.text(excerptLines, textX, currentY);
      currentY += excerptLines.length * 4.5 + 4;
    }

    // Narrative Context
    if (beat.narrativeContext) {
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "bold");
      doc.text("DRAMATIC CONTEXT:", textX, currentY);
      currentY += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(203, 213, 225);
      const contextLines = doc.splitTextToSize(beat.narrativeContext, textWidth);
      doc.text(contextLines, textX, currentY);
      currentY += contextLines.length * 4.5 + 4;
    }

    // Visual Prompt
    doc.setFontSize(10);
    doc.setTextColor(129, 140, 248);
    doc.setFont("helvetica", "bold");
    doc.text("CAMERA & LIGHTING PROMPT:", textX, currentY);
    currentY += 5;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    const promptLines = doc.splitTextToSize(beat.imagePrompt, textWidth);
    doc.text(promptLines, textX, currentY);
  }

  return doc;
}

/**
 * Generates and downloads a clean, printable storyboard PDF sheet.
 */
export async function exportToPdf(
  story: string,
  characterBible: string,
  beats: Beat[],
  metadata: { artStyle: string; aspectRatio: string }
) {
  const doc = await buildPdfDocument(story, characterBible, beats, metadata);
  if (typeof window !== "undefined") {
    doc.save(`storyboard-sheet-${Date.now()}.pdf`);
  }
}
