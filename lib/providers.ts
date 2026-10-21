import OpenAI from "openai";

export type LLMProvider = "openai" | "openrouter" | "ollama" | "gemini";
export type ImageProvider = "openai" | "gemini" | "openrouter";

export type AspectRatio = "16:9" | "2.39:1" | "1:1" | "9:16" | "4:3";

export interface Beat {
  id: string;
  title: string;
  storyExcerpt: string;
  narrativeContext: string;
  imagePrompt: string;
  imageUrl?: string;
  status?: "pending" | "generating" | "completed" | "error";
  error?: string;
}

export interface ArtStylePreset {
  id: string;
  name: string;
  description: string;
  promptModifier: string;
}

export const ART_STYLES: ArtStylePreset[] = [
  {
    id: "cinematic-35mm",
    name: "Cinematic 35mm Film",
    description: "Photorealistic film look, shallow depth of field, natural lighting",
    promptModifier: "cinematic 35mm film photograph, shot on Arri Alexa, master film lighting, 8k resolution, photorealistic, cinematic composition, film grain, color graded",
  },
  {
    id: "charcoal-sketch",
    name: "Charcoal & Pencil Storyboard",
    description: "Traditional expressive charcoal storyboard sketch",
    promptModifier: "expressive charcoal and graphite pencil storyboard sketch, dynamic line art, cross-hatching, film production concept sketch, monochrome with sepia tones, textured paper",
  },
  {
    id: "anime-ghibli",
    name: "Anime / Studio Ghibli",
    description: "Lush hand-painted backgrounds with classic cel animation aesthetic",
    promptModifier: "vibrant anime style illustration, Studio Ghibli aesthetic, hand-painted cel animation art, detailed lush background, expressive lighting, Makoto Shinkai atmosphere",
  },
  {
    id: "graphic-novel",
    name: "Graphic Novel / Noir",
    description: "High contrast ink, dramatic shadows, stylized comic panel",
    promptModifier: "stylized graphic novel illustration, high-contrast ink drawing, dramatic chiaroscuro lighting, Frank Miller comic style, atmospheric shadows, bold outlines",
  },
  {
    id: "pixar-3d",
    name: "Pixar 3D Animation",
    description: "Polished stylized 3D character animation render",
    promptModifier: "stylized 3D animated feature film render, Pixar and Disney aesthetic, subsurface scattering, expressive character lighting, rich volumetric depth, octane render 8k",
  },
  {
    id: "cyberpunk-concept",
    name: "Cyberpunk Concept Art",
    description: "Moody neon lighting, futuristic atmosphere, digital painting",
    promptModifier: "cyberpunk digital concept art, neon rim lighting, atmospheric haze and volumetric smoke, futuristic film still, Syd Mead aesthetic, intricate details",
  },
  {
    id: "watercolor-concept",
    name: "Watercolor Concept",
    description: "Fluid watercolor washes with delicate ink accents",
    promptModifier: "delicate watercolor and ink illustration, loose atmospheric paint washes, production concept art, elegant storytelling illustration, textured cold-press paper",
  },
  {
    id: "none",
    name: "No Global Style (Raw)",
    description: "Use prompt as specified without additional style modifiers",
    promptModifier: "",
  },
];

export interface LLMClientOptions {
  provider: LLMProvider;
  apiKey?: string;
  model?: string;
  ollamaBaseUrl?: string;
}

export interface LLMClientResult {
  client: OpenAI;
  defaultModel: string;
  provider: LLMProvider;
}

/**
 * Returns an OpenAI-compatible client configured for the selected provider:
 * - OpenAI: Standard api.openai.com
 * - OpenRouter: openrouter.ai/api/v1
 * - Ollama: Local Ollama endpoint /v1
 * - Gemini: Google Gemini OpenAI-compatible v1beta/openai endpoint
 */
export function getLLMClient(options: LLMClientOptions): LLMClientResult {
  const { provider, apiKey, model, ollamaBaseUrl } = options;

  switch (provider) {
    case "gemini": {
      const geminiKey = apiKey || process.env.GEMINI_API_KEY || "";
      const client = new OpenAI({
        apiKey: geminiKey || "gemini-dummy-key",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      });
      return {
        client,
        defaultModel: model || "gemini-2.0-flash",
        provider,
      };
    }

    case "openrouter": {
      const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY || "";
      const client = new OpenAI({
        apiKey: openRouterKey || "openrouter-dummy-key",
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Story Beat Visualizer",
        },
      });
      return {
        client,
        defaultModel: model || "anthropic/claude-3.5-sonnet",
        provider,
      };
    }

    case "ollama": {
      const rawBase = ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
      const cleanBase = rawBase.replace(/\/+$/, "");
      const baseURL = cleanBase.endsWith("/v1") ? cleanBase : `${cleanBase}/v1`;

      const client = new OpenAI({
        apiKey: "ollama", // Required by OpenAI SDK constructor
        baseURL,
      });
      return {
        client,
        defaultModel: model || "llama3.2",
        provider,
      };
    }

    case "openai":
    default: {
      const openAiKey = apiKey || process.env.OPENAI_API_KEY || "";
      const client = new OpenAI({
        apiKey: openAiKey || "openai-dummy-key",
      });
      return {
        client,
        defaultModel: model || "gpt-4o",
        provider: "openai",
      };
    }
  }
}
