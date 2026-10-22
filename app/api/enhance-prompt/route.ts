import { NextResponse } from "next/server";
import {
  AI_STUDIO_DEFAULT_KEY,
  AI_STUDIO_DEFAULT_URL,
  AI_STUDIO_WORKER_FALLBACK,
} from "@/lib/providers";

function cleanEnhancedPrompt(text: string): string {
  // Strip reasoning blocks from QwQ-32B or other reasoning models
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip surrounding quotes if wrapped
  cleaned = cleaned.replace(/^["'`]|["'`]$/g, "").trim();
  return cleaned || text.trim();
}

export async function POST(req: Request) {
  try {
    const {
      prompt,
      model = "@cf/qwen/qwq-32b",
      baseUrl,
      apiKey,
    } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const studioKey = apiKey || process.env.AI_STUDIO_API_KEY || AI_STUDIO_DEFAULT_KEY;
    const rawBaseUrl = baseUrl || process.env.AI_STUDIO_BASE_URL || AI_STUDIO_DEFAULT_URL;
    const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, "");
    const workerFallbackUrl = process.env.AI_STUDIO_WORKER_URL || AI_STUDIO_WORKER_FALLBACK;

    let enhancedText = "";

    // Case A: Direct Cloudflare Worker URL
    if (cleanBaseUrl.includes("workers.dev")) {
      const res = await fetch(cleanBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studioKey}`,
        },
        body: JSON.stringify({
          task: "text-transform",
          prompt: prompt.trim(),
          model,
          system_prompt:
            "You are an expert AI image prompt engineer. Expand the user's short description into a rich, detailed, vivid text-to-image prompt for Stable Diffusion XL / Flux. Return ONLY the enhanced prompt string without commentary.",
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Worker error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const rawText = data.result?.response || data.result?.description || String(data.result || "");
      enhancedText = cleanEnhancedPrompt(rawText);
    } else {
      // Case B: Local FastAPI server
      try {
        const endpoint = cleanBaseUrl.endsWith("/api/text-transform") || cleanBaseUrl.endsWith("/api/text")
          ? cleanBaseUrl
          : `${cleanBaseUrl}/api/text-transform`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${studioKey}`,
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
            mode: "enhance_prompt",
            model,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.error || `FastAPI error ${res.status}`);
        }

        const data = await res.json();
        enhancedText = cleanEnhancedPrompt(data.transformed_text || "");
      } catch (localErr: any) {
        console.warn("[AI Studio] Local text transform failed, trying Cloudflare Worker fallback:", localErr.message);
        const fallbackRes = await fetch(workerFallbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${studioKey}`,
          },
          body: JSON.stringify({
            task: "text-transform",
            prompt: prompt.trim(),
            model,
            system_prompt:
              "You are an expert AI image prompt engineer. Expand the user's short description into a rich, detailed, vivid text-to-image prompt for Stable Diffusion XL / Flux. Return ONLY the enhanced prompt string without commentary.",
          }),
        });

        if (!fallbackRes.ok) {
          const errText = await fallbackRes.text();
          throw new Error(`Text transform failed: ${localErr.message}. Fallback worker also failed (${fallbackRes.status}): ${errText}`);
        }

        const data = await fallbackRes.json();
        const rawText = data.result?.response || data.result?.description || String(data.result || "");
        enhancedText = cleanEnhancedPrompt(rawText);
      }
    }

    return NextResponse.json({
      success: true,
      enhancedPrompt: enhancedText || prompt.trim(),
    });
  } catch (err: any) {
    console.error("Enhance prompt error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to enhance prompt" },
      { status: 500 }
    );
  }
}
