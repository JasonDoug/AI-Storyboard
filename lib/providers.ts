import OpenAI from "openai";

export type LLMProvider = "openai" | "openrouter" | "ollama" | "gemini";
export type ImageProvider = "openai" | "gemini" | "openrouter" | "aistudio";

export type AspectRatio = "16:9" | "2.39:1" | "1:1" | "9:16" | "4:3";

export const OPENROUTER_DEFAULT_MODEL = "openrouter/free";

export interface OpenRouterModelOption {
  id: string;
  name: string;
  badge?: string;
  description: string;
}

export const OPENROUTER_MODELS: OpenRouterModelOption[] = [
  {
    id: "openrouter/free",
    name: "Free Models Router (Auto)",
    badge: "⚡ 100% Free",
    description: "Smart auto-router across free models on OpenRouter with zero token cost",
  },
  {
    id: "openrouter/auto",
    name: "OpenRouter Auto Router",
    badge: "🚀 Auto",
    description: "Automatically analyzes prompt and routes to the best model",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    badge: "🔥 High Precision",
    description: "Fast, high-precision structured output & narrative extraction",
  },
  {
    id: "anthropic/claude-sonnet-5.5",
    name: "Claude Sonnet 5.5",
    badge: "👑 Quality",
    description: "State-of-the-art cinematic direction and nuance",
  },
  {
    id: "anthropic/claude-haiku-5.5",
    name: "Claude Haiku 5.5",
    badge: "⚡ Fast",
    description: "Ultra-fast extraction with lower latency",
  },
  {
    id: "deepseek/deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash",
    badge: "💡 Efficient",
    description: "Efficient reasoning and structured JSON output",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B (Free)",
    badge: "⚡ Free",
    description: "Free tier standalone model on OpenRouter",
  },
];

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
        defaultModel: model || OPENROUTER_DEFAULT_MODEL,
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

export interface AIStudioModel {
  id: string;
  name: string;
  badge: string;
  cost: string;
  description: string;
  isDefault?: boolean;
}

export const AI_STUDIO_DEFAULT_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";
export const AI_STUDIO_DEFAULT_URL = "http://localhost:8000";
export const AI_STUDIO_DEFAULT_KEY = "5b7f74f8ddb448f920eef0ae4263d81525d74";
export const AI_STUDIO_WORKER_FALLBACK = "https://free-image-generation-api.potter-jason7839.workers.dev";

/**
 * Curated generous, high-quality models (protects free tier daily quota;
 * intentionally omits expensive 2,000-3,000+ neuron models like Flux 2 Dev / Klein 9B).
 */
export const AI_STUDIO_IMAGE_MODELS: AIStudioModel[] = [
  {
    id: "@cf/bytedance/stable-diffusion-xl-lightning",
    name: "SDXL Lightning (Fast & Generous)",
    badge: "⚡ Low Cost (Recommended)",
    cost: "~100 Neurons",
    description: "Fast generation with minimal neuron usage. Best for daily free tier.",
    isDefault: true,
  },
  {
    id: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    name: "SDXL Base 1.0",
    badge: "⚡ Low Cost",
    cost: "~150 Neurons",
    description: "Standard high-resolution 1024x1024 model for detailed images.",
  },
  {
    id: "@cf/lykon/dreamshaper-8-lcm",
    name: "DreamShaper 8 LCM",
    badge: "⚡ Low Cost",
    cost: "~150 Neurons",
    description: "Vibrant, artistic digital painting and stylized art.",
  },
  {
    id: "@cf/black-forest-labs/flux-1-schnell",
    name: "FLUX.1 Schnell",
    badge: "🚀 Medium Cost",
    cost: "~500 Neurons",
    description: "State-of-the-art 12B parameter rapid text-to-image generator.",
  },
  {
    id: "@cf/black-forest-labs/flux-2-klein-4b",
    name: "FLUX.2 Klein 4B",
    badge: "🚀 Medium Cost",
    cost: "~500 Neurons",
    description: "Distilled 4-step real-time generation model.",
  },
  {
    id: "@cf/leonardo/phoenix-1.0",
    name: "Leonardo Phoenix 1.0",
    badge: "🚀 Medium Cost",
    cost: "~500 Neurons",
    description: "Superior prompt adherence and coherent text rendering.",
  },
];

/**
 * Maps an internal art style ID to an AI Studio style preset
 * (pixel-art, anime, cyberpunk, cinematic, photorealistic, 3d-render, fantasy, origami, comic-book)
 */
export function mapToAIStudioStyle(styleId?: string): string | undefined {
  if (!styleId) return undefined;
  switch (styleId) {
    case "cinematic-35mm":
      return "cinematic";
    case "anime-ghibli":
      return "anime";
    case "cyberpunk-concept":
      return "cyberpunk";
    case "pixar-3d":
      return "3d-render";
    case "graphic-novel":
      return "comic-book";
    default:
      return undefined;
  }
}
