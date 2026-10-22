# Story Beat Visualizer & AI Storyboard Studio

An AI-powered storyboard studio that transforms narrative text (screenplays, fiction, game scripts) into cinematic visual beats. It supports multiple LLMs for narrative extraction and multiple image generation models with strict aspect ratio control, character consistency, and export packaging.

```text
User uploads story (.txt / .md / pasted text) + Optional Character Bible & Art Style
       │
       ▼
[ /api/analyze-beats ] ───► LLM (OpenAI GPT-4o, Gemini 2.0 Flash, OpenRouter, Ollama)
       │                    • Extracts 3-6 key visual beats with camera & lighting prompts
       │                    • Robust JSON extraction & Zod schema validation
       │                    • Preserves character appearances from Character Bible
       ▼
Frontend displays beats (Interactive timeline cards)
       │
       ▼ (Sequential or individual calls)
[ /api/generate-image ] ──► Image Models (DALL-E 3, Gemini Imagen 3, OpenRouter)
       │                    • Widescreen & aspect ratio support (16:9, 2.39:1, 1:1, 9:16, 4:3)
       │                    • Persistent local caching to prevent URL expiry
       ▼
Interactive Storyboard View
       • Edit titles, excerpts, dramatic context, and image prompts
       • Reorder, add, or delete beats
       • Export to PDF Storyboard Sheet, full ZIP package, Markdown, or JSON
```

---

## Features

### 1. Multi-Provider AI Architecture
- **Narrative Extraction (LLM)**:
  - **OpenAI**: GPT-4o, GPT-4o-mini
  - **Google Gemini**: Gemini 2.0 Flash, Gemini 1.5 Pro (via OpenAI-compatible endpoint)
  - **OpenRouter**: Default smart auto-router to zero-cost models (`openrouter/free`), plus `openrouter/auto`, Llama 3.3 70B, Claude 5.5, DeepSeek, etc.
  - **Ollama**: Local models (Llama 3.2, Mistral, Qwen) via local endpoint (`http://localhost:11434`)
- **Image Generation**:
  - **AI Studio / Cloudflare Workers AI**: Local FastAPI server (`http://localhost:8000`) with Cloudflare Worker edge fallback (`https://free-image-generation-api.potter-jason7839.workers.dev`). Curated for generous free tier models (`@cf/bytedance/stable-diffusion-xl-lightning`, SDXL Base 1.0, DreamShaper 8 LCM, FLUX.1 Schnell, etc.).
  - **OpenAI**: DALL-E 3 (`1792x1024`, `1024x1024`, `1024x1792`)
  - **Google Gemini**: Imagen 3 (`imagen-3.0-generate-002`) with native aspect ratios
  - **OpenRouter**: Image models (e.g. `bytedance-seed/seedream-4.5`)

### 2. Aspect Ratio & Framing Control
- **16:9 Cinematic Widescreen** (Standard film & TV storyboard)
- **2.39:1 Anamorphic Scope** (Ultra-widescreen feature film composition)
- **1:1 Square** (Album art / social post)
- **9:16 Vertical** (Short-form video & reels)
- **4:3 Academy** (Classic vintage cinema)

### 3. Visual & Character Consistency
- **Global Art Style Presets**:
  - Cinematic 35mm Film
  - Charcoal & Pencil Storyboard Sketch
  - Anime / Studio Ghibli
  - Graphic Novel / Noir
  - Pixar 3D Animation
  - Cyberpunk Concept Art
  - Watercolor Concept
  - Custom Style Modifier
- **Character Bible / Cast Field**: Define character traits (clothing, hair, distinctive markers) to enforce consistency across all beats.

### 4. Beat Timeline Management
- **Add Beat**: Manually insert custom beats into the storyboard.
- **Delete Beat**: Remove beats with one click.
- **Reorder**: Move beats up or down in the sequence.
- **In-Place Editing**: Edit titles, quotes/excerpts, dramatic context, and prompts directly on cards.
- **Regenerate**: Regenerate individual beats or all beats simultaneously.

### 5. Production Export Options
- **PDF Storyboard Sheet**: Formatted landscape presentation ready for print or client review.
- **ZIP Production Package**: Contains all full-resolution images, `storyboard.md`, `storyboard.json`, and original script text.
- **Markdown (`.md`)**: Complete formatted script with embedded image links.
- **JSON (`.json`)**: Raw structured data for pipeline integrations.

### 6. Reliability & Persistence
- **Image Persistence**: Generated images are saved locally to `public/generated/` with automatic fallback to data URIs, avoiding DALL-E 3 URL expirations.
- **Settings Persistence**: API keys, preferred models, and current storyboard content are persisted in browser `localStorage`.
- **Robust LLM Parsing**: Strips markdown code fences (````json ... ````), conversational preambles, trailing commas, and validates with Zod.

---

## Quickstart

### Prerequisites
- Node.js 18+ (tested on Node 24)
- npm

### Installation
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

Configure your API keys in `.env.local` or directly within the in-app **AI Providers** settings modal:
```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
OPENROUTER_API_KEY=sk-or-...
OLLAMA_BASE_URL=http://localhost:11434

# AI Studio / Cloudflare Workers AI Local Server & Worker Credentials
AI_STUDIO_BASE_URL=http://localhost:8000
AI_STUDIO_API_KEY=5b7f74f8ddb448f920eef0ae4263d81525d74
AI_STUDIO_WORKER_URL=https://free-image-generation-api.potter-jason7839.workers.dev
```

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing & Verification
```bash
# Run the complete test suite (Unit, API, and E2E simulation)
npm test

# Run specific test suites
npm run test:unit      # Tests parser, provider configs, and export engine
npm run test:api       # Tests /api/analyze-beats and /api/generate-image routes
npm run test:e2e       # Runs complete storyboard generation & file export simulation

# Run live hardware diagnostic against local Ollama & environment
npm run test:live

# Run production build
npm run build
```
