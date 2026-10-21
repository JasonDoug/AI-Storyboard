import { NextResponse } from "next/server";
import OpenAI from "openai";
import { AspectRatio, ImageProvider } from "@/lib/providers";
import path from "path";
import fs from "fs";

/**
 * Saves an image buffer to public/generated and returns the local public URL.
 * Falls back to data URL if writing to disk fails.
 */
async function persistImage(
  buffer: Buffer,
  mimeType: string = "image/png"
): Promise<{ imageUrl: string; dataUrl: string }> {
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  try {
    const publicDir = path.join(process.cwd(), "public", "generated");
    await fs.promises.mkdir(publicDir, { recursive: true });

    const filename = `beat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
    const filePath = path.join(publicDir, filename);

    await fs.promises.writeFile(filePath, buffer);
    return {
      imageUrl: `/generated/${filename}`,
      dataUrl,
    };
  } catch (err) {
    console.warn("Could not save image to public/generated disk, falling back to data URL:", err);
    return {
      imageUrl: dataUrl,
      dataUrl,
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      provider = "openai",
      apiKey,
      model,
      aspectRatio = "16:9",
      artStyleModifier,
    } = body as {
      prompt: string;
      provider?: ImageProvider;
      apiKey?: string;
      model?: string;
      aspectRatio?: AspectRatio;
      artStyleModifier?: string;
    };

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Image prompt is required" }, { status: 400 });
    }

    // Assemble final prompt incorporating art style and aspect ratio cues if needed
    let finalPrompt = prompt.trim();
    if (artStyleModifier && artStyleModifier.trim()) {
      finalPrompt = `${finalPrompt}, ${artStyleModifier.trim()}`;
    }

    if (aspectRatio === "2.39:1") {
      finalPrompt = `${finalPrompt}, cinematic 2.39:1 anamorphic widescreen composition`;
    }

    // ==========================================
    // Provider 1: Google Gemini (Imagen 3)
    // ==========================================
    if (provider === "gemini") {
      const geminiKey = apiKey || process.env.GEMINI_API_KEY;
      if (!geminiKey) throw new Error("Gemini API Key missing");

      const imagenModel = model || "imagen-3.0-generate-002";

      // Map aspect ratio for Imagen 3
      let geminiAspect = "16:9";
      if (aspectRatio === "1:1") geminiAspect = "1:1";
      else if (aspectRatio === "9:16") geminiAspect = "9:16";
      else if (aspectRatio === "4:3") geminiAspect = "4:3";
      else if (aspectRatio === "2.39:1") geminiAspect = "16:9";

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${imagenModel}:predict?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: finalPrompt }],
            parameters: { sampleCount: 1, aspectRatio: geminiAspect },
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gemini Imagen failed");

      const base64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!base64) throw new Error("No image data returned from Gemini Imagen");

      const buffer = Buffer.from(base64, "base64");
      const saved = await persistImage(buffer, "image/jpeg");

      return NextResponse.json({
        imageUrl: saved.imageUrl,
        dataUrl: saved.dataUrl,
      });
    }

    // ==========================================
    // Provider 2: OpenRouter Image API
    // ==========================================
    if (provider === "openrouter") {
      const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) throw new Error("OpenRouter API Key missing");

      const res = await fetch("https://openrouter.ai/api/v1/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: model || "bytedance-seed/seedream-4.5",
          prompt: finalPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "OpenRouter generation failed");

      const remoteUrl = data.data?.[0]?.url || data.choices?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;

      if (b64) {
        const buffer = Buffer.from(b64, "base64");
        const saved = await persistImage(buffer, "image/png");
        return NextResponse.json({
          imageUrl: saved.imageUrl,
          dataUrl: saved.dataUrl,
        });
      }

      if (remoteUrl) {
        // Download remote image to persist locally
        const imgRes = await fetch(remoteUrl);
        const arrayBuf = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const mimeType = imgRes.headers.get("content-type") || "image/png";
        const saved = await persistImage(buffer, mimeType);
        return NextResponse.json({
          imageUrl: saved.imageUrl,
          dataUrl: saved.dataUrl,
        });
      }

      throw new Error("OpenRouter did not return an image URL or base64 payload");
    }

    // ==========================================
    // Provider 3: OpenAI (DALL-E 3)
    // ==========================================
    const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });

    // Map aspect ratio to DALL-E 3 dimensions:
    // "1024x1024", "1792x1024" (widescreen), "1024x1792" (portrait)
    let openAiSize: "1024x1024" | "1792x1024" | "1024x1792" = "1792x1024";
    if (aspectRatio === "1:1") {
      openAiSize = "1024x1024";
    } else if (aspectRatio === "9:16") {
      openAiSize = "1024x1792";
    } else if (aspectRatio === "4:3") {
      openAiSize = "1024x1024";
    } else {
      openAiSize = "1792x1024"; // 16:9 and 2.39:1 widescreen
    }

    const response = await openai.images.generate({
      model: model || "dall-e-3",
      prompt: finalPrompt,
      n: 1,
      size: openAiSize,
      response_format: "b64_json",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (b64) {
      const buffer = Buffer.from(b64, "base64");
      const saved = await persistImage(buffer, "image/png");
      return NextResponse.json({
        imageUrl: saved.imageUrl,
        dataUrl: saved.dataUrl,
      });
    }

    // Fallback if URL was returned instead
    const fallbackUrl = response.data?.[0]?.url;
    if (fallbackUrl) {
      const imgRes = await fetch(fallbackUrl);
      const arrayBuf = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const saved = await persistImage(buffer, "image/png");
      return NextResponse.json({
        imageUrl: saved.imageUrl,
        dataUrl: saved.dataUrl,
      });
    }

    throw new Error("No image data returned from OpenAI");
  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
