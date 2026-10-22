"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Upload,
  RefreshCw,
  ImageIcon,
  BookOpen,
  AlertCircle,
  Settings,
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  FileText,
  FileArchive,
  FileCode,
  Users,
  Palette,
  Film,
  RotateCcw,
  Check,
  Wand2,
  Server,
  Zap,
} from "lucide-react";
import {
  ART_STYLES,
  AspectRatio,
  Beat,
  ImageProvider,
  LLMProvider,
  AI_STUDIO_DEFAULT_KEY,
  AI_STUDIO_DEFAULT_MODEL,
  AI_STUDIO_DEFAULT_URL,
  AI_STUDIO_IMAGE_MODELS,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_MODELS,
} from "@/lib/providers";
import {
  exportToPdf,
  exportToZip,
  exportToMarkdown,
  exportToJson,
} from "@/lib/export";

const STORAGE_KEY_SETTINGS = "storyboard_app_settings_v1";
const STORAGE_KEY_CONTENT = "storyboard_app_content_v1";

export default function StoryBeatApp() {
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  // Story & Character State
  const [story, setStory] = useState("");
  const [characterBible, setCharacterBible] = useState("");
  const [isCharacterBibleOpen, setIsCharacterBibleOpen] = useState(false);

  // Visual Controls State
  const [selectedArtStyleId, setSelectedArtStyleId] = useState<string>("cinematic-35mm");
  const [customArtStyle, setCustomArtStyle] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  // Beats & Pipeline State
  const [beats, setBeats] = useState<Beat[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Provider Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>("openrouter");
  const [llmModel, setLlmModel] = useState(OPENROUTER_DEFAULT_MODEL);
  const [llmApiKey, setLlmApiKey] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");

  const [imageProvider, setImageProvider] = useState<ImageProvider>("aistudio");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageModel, setImageModel] = useState(AI_STUDIO_DEFAULT_MODEL);
  const [aiStudioBaseUrl, setAiStudioBaseUrl] = useState(AI_STUDIO_DEFAULT_URL);
  const [aiStudioApiKey, setAiStudioApiKey] = useState(AI_STUDIO_DEFAULT_KEY);

  // Prompt Enhancement & Diagnostic State
  const [enhancingBeatId, setEnhancingBeatId] = useState<string | null>(null);
  const [connectionTestStatus, setConnectionTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [connectionTestMsg, setConnectionTestMsg] = useState<string | null>(null);

  // Load persisted settings and content on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.llmProvider) {
          setLlmProvider(parsed.llmProvider);
        } else {
          setLlmProvider("openrouter");
        }
        if (parsed.llmModel && parsed.llmModel !== "anthropic/claude-3.5-sonnet") {
          setLlmModel(parsed.llmModel);
        } else {
          setLlmModel(OPENROUTER_DEFAULT_MODEL);
        }
        if (parsed.llmApiKey) setLlmApiKey(parsed.llmApiKey);
        if (parsed.ollamaBaseUrl) setOllamaBaseUrl(parsed.ollamaBaseUrl);

        if (parsed.imageProvider) setImageProvider(parsed.imageProvider);
        if (parsed.imageApiKey) setImageApiKey(parsed.imageApiKey);
        if (parsed.imageModel) setImageModel(parsed.imageModel);
        if (parsed.aiStudioBaseUrl) setAiStudioBaseUrl(parsed.aiStudioBaseUrl);
        if (parsed.aiStudioApiKey) setAiStudioApiKey(parsed.aiStudioApiKey);

        if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
        if (parsed.selectedArtStyleId) setSelectedArtStyleId(parsed.selectedArtStyleId);
        if (parsed.customArtStyle) setCustomArtStyle(parsed.customArtStyle);
      }

      const savedContent = localStorage.getItem(STORAGE_KEY_CONTENT);
      if (savedContent) {
        const parsed = JSON.parse(savedContent);
        if (parsed.story) setStory(parsed.story);
        if (parsed.characterBible) {
          setCharacterBible(parsed.characterBible);
          setIsCharacterBibleOpen(true);
        }
        if (parsed.beats && Array.isArray(parsed.beats)) {
          setBeats(parsed.beats);
        }
      }
    } catch (err) {
      console.warn("Failed to restore state from localStorage:", err);
    } finally {
      setIsClientLoaded(true);
    }
  }, []);

  // Save settings when changed
  useEffect(() => {
    if (!isClientLoaded) return;
    try {
      const settingsPayload = {
        llmProvider,
        llmModel,
        llmApiKey,
        ollamaBaseUrl,
        imageProvider,
        imageApiKey,
        imageModel,
        aiStudioBaseUrl,
        aiStudioApiKey,
        aspectRatio,
        selectedArtStyleId,
        customArtStyle,
      };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settingsPayload));
    } catch (err) {
      console.warn("Failed to save settings to localStorage:", err);
    }
  }, [
    isClientLoaded,
    llmProvider,
    llmModel,
    llmApiKey,
    ollamaBaseUrl,
    imageProvider,
    imageApiKey,
    imageModel,
    aiStudioBaseUrl,
    aiStudioApiKey,
    aspectRatio,
    selectedArtStyleId,
    customArtStyle,
  ]);

  // Save content and beats when changed
  useEffect(() => {
    if (!isClientLoaded) return;
    try {
      const contentPayload = {
        story,
        characterBible,
        beats,
      };
      localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(contentPayload));
    } catch (err) {
      console.warn("Failed to save content to localStorage:", err);
    }
  }, [isClientLoaded, story, characterBible, beats]);

  const activeArtStyle = ART_STYLES.find((s) => s.id === selectedArtStyleId);
  const activeStyleModifier =
    selectedArtStyleId === "custom"
      ? customArtStyle
      : activeArtStyle?.promptModifier || "";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setStory(event.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handleClearAll = () => {
    if (
      window.confirm("Are you sure you want to clear the current story and all beats? Settings will be preserved.")
    ) {
      setStory("");
      setCharacterBible("");
      setBeats([]);
      setGeneralError(null);
      localStorage.removeItem(STORAGE_KEY_CONTENT);
    }
  };

  const handleAnalyzeStory = async () => {
    if (!story.trim()) return;
    setIsAnalyzing(true);
    setGeneralError(null);

    try {
      const res = await fetch("/api/analyze-beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          characterBible: characterBible.trim() || undefined,
          artStyle: activeStyleModifier.trim() || undefined,
          provider: llmProvider,
          apiKey: llmApiKey || undefined,
          model: llmModel || undefined,
          ollamaBaseUrl: llmProvider === "ollama" ? ollamaBaseUrl : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to identify narrative beats");

      const initializedBeats: Beat[] = (data.beats || []).map((b: any, idx: number) => ({
        id: b.id || `beat-${idx + 1}`,
        title: b.title || `Beat ${idx + 1}`,
        storyExcerpt: b.storyExcerpt || "",
        narrativeContext: b.narrativeContext || "",
        imagePrompt: b.imagePrompt || "",
        status: "pending",
      }));

      setBeats(initializedBeats);
      setIsAnalyzing(false);

      // Trigger progressive image generation for all beats
      for (const beat of initializedBeats) {
        await generateBeatImage(beat.id, beat.imagePrompt);
      }
    } catch (err: any) {
      setGeneralError(err.message);
      setIsAnalyzing(false);
    }
  };

  const generateBeatImage = async (beatId: string, customPrompt?: string) => {
    setBeats((prev) =>
      prev.map((b) => (b.id === beatId ? { ...b, status: "generating", error: undefined } : b))
    );

    try {
      const targetBeat = beats.find((b) => b.id === beatId);
      const promptToUse = customPrompt || targetBeat?.imagePrompt || "";

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse,
          provider: imageProvider,
          apiKey:
            imageProvider === "aistudio"
              ? (imageApiKey || aiStudioApiKey)
              : (imageApiKey || (imageProvider === llmProvider ? llmApiKey : undefined)),
          model:
            imageModel || (imageProvider === "aistudio" ? AI_STUDIO_DEFAULT_MODEL : undefined),
          baseUrl: imageProvider === "aistudio" ? aiStudioBaseUrl : undefined,
          aspectRatio,
          artStyleModifier: activeStyleModifier || undefined,
          selectedArtStyleId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setBeats((prev) =>
        prev.map((b) =>
          b.id === beatId
            ? {
                ...b,
                imageUrl: data.imageUrl,
                status: "completed",
              }
            : b
        )
      );
    } catch (err: any) {
      setBeats((prev) =>
        prev.map((b) =>
          b.id === beatId ? { ...b, status: "error", error: err.message } : b
        )
      );
    }
  };

  const handleEnhancePrompt = async (beatId: string, currentPrompt: string) => {
    if (!currentPrompt.trim()) return;
    setEnhancingBeatId(beatId);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentPrompt,
          baseUrl: aiStudioBaseUrl,
          apiKey: aiStudioApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enhancement failed");
      if (data.enhancedPrompt) {
        handleUpdateBeat(beatId, { imagePrompt: data.enhancedPrompt });
      }
    } catch (err: any) {
      console.error("Enhance prompt error:", err);
      alert(`Could not enhance prompt: ${err.message}`);
    } finally {
      setEnhancingBeatId(null);
    }
  };

  const handleTestConnection = async () => {
    setConnectionTestStatus("testing");
    setConnectionTestMsg(null);
    try {
      const cleanUrl = aiStudioBaseUrl.replace(/\/+$/, "");
      const healthUrl = cleanUrl.includes("workers.dev") ? cleanUrl : `${cleanUrl}/health`;

      const res = await fetch(healthUrl, {
        method: cleanUrl.includes("workers.dev") ? "POST" : "GET",
        headers: cleanUrl.includes("workers.dev")
          ? {
              "Content-Type": "application/json",
              Authorization: `Bearer ${aiStudioApiKey}`,
            }
          : {},
        body: cleanUrl.includes("workers.dev")
          ? JSON.stringify({ prompt: "ping", task: "text-to-image" })
          : undefined,
      });

      if (!res.ok && res.status !== 400) {
        throw new Error(`Server returned status ${res.status}`);
      }

      setConnectionTestStatus("success");
      setConnectionTestMsg("Server online & ready! Fast local generation enabled.");
    } catch (err: any) {
      setConnectionTestStatus("error");
      setConnectionTestMsg(
        `Connection failed (${err.message}). If local server is stopped, automatic fallback to Cloudflare Worker will be used.`
      );
    }
  };

  const handleGenerateAllPending = async () => {
    for (const beat of beats) {
      if (beat.status !== "completed") {
        await generateBeatImage(beat.id, beat.imagePrompt);
      }
    }
  };

  const handleRegenerateAll = async () => {
    if (
      !window.confirm(
        "Regenerate images for all beats with the current art style and aspect ratio?"
      )
    )
      return;
    for (const beat of beats) {
      await generateBeatImage(beat.id, beat.imagePrompt);
    }
  };

  // Beat Management Handlers
  const handleAddBeat = () => {
    const newId = `beat-${Date.now().toString(36)}`;
    const newBeat: Beat = {
      id: newId,
      title: `Beat ${beats.length + 1}`,
      storyExcerpt: "",
      narrativeContext: "Custom scene beat added to storyboard.",
      imagePrompt: activeStyleModifier ? `Cinematic shot, ${activeStyleModifier}` : "Cinematic scene shot",
      status: "pending",
    };
    setBeats((prev) => [...prev, newBeat]);
  };

  const handleDeleteBeat = (beatId: string) => {
    setBeats((prev) => prev.filter((b) => b.id !== beatId));
  };

  const handleMoveBeat = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= beats.length) return;

    setBeats((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleUpdateBeat = (beatId: string, updates: Partial<Beat>) => {
    setBeats((prev) =>
      prev.map((b) => (b.id === beatId ? { ...b, ...updates } : b))
    );
  };

  // Export Handlers
  const handleExport = async (type: "pdf" | "zip" | "md" | "json") => {
    if (beats.length === 0) {
      setGeneralError("No beats available to export. Create or analyze beats first.");
      return;
    }

    setIsExporting(type);
    try {
      const meta = {
        artStyle: activeArtStyle?.name || selectedArtStyleId,
        aspectRatio,
      };

      if (type === "pdf") {
        await exportToPdf(story, characterBible, beats, meta);
      } else if (type === "zip") {
        await exportToZip(story, characterBible, beats, meta);
      } else if (type === "md") {
        exportToMarkdown(story, characterBible, beats, meta);
      } else if (type === "json") {
        exportToJson(story, characterBible, beats, meta);
      }
    } catch (err: any) {
      console.error("Export error:", err);
      setGeneralError(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  // Aspect Ratio CSS Class Mapper
  const getAspectClass = () => {
    switch (aspectRatio) {
      case "16:9":
        return "aspect-[16/9]";
      case "2.39:1":
        return "aspect-[2.39/1]";
      case "1:1":
        return "aspect-square";
      case "9:16":
        return "aspect-[9/16]";
      case "4:3":
        return "aspect-[4/3]";
      default:
        return "aspect-[16/9]";
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-10 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with App Info and Controls */}
        <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
                <Sparkles className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                  Story Beat Visualizer
                </h1>
                <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                  AI-powered narrative beat extraction and consistent cinematic storyboard generator
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {beats.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 hover:border-rose-900/50 transition"
                title="Clear current story and beats"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Story</span>
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 px-4 py-2 rounded-lg text-sm text-slate-200 transition shadow-sm"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>AI Providers</span>
            </button>
          </div>
        </header>

        {/* Global Art Style & Aspect Ratio Controls Bar */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Global Art Style Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400" /> Global Art Style
              </label>
              <select
                value={selectedArtStyleId}
                onChange={(e) => setSelectedArtStyleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ART_STYLES.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name} — {style.description}
                  </option>
                ))}
                <option value="custom">Custom Style Modifier...</option>
              </select>

              {selectedArtStyleId === "custom" && (
                <input
                  type="text"
                  placeholder="Enter custom prompt modifiers (e.g. 1970s Technicolor, oil painting on canvas, 4k)..."
                  value={customArtStyle}
                  onChange={(e) => setCustomArtStyle(e.target.value)}
                  className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-indigo-400" /> Widescreen / Aspect Ratio
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "16:9", label: "16:9", sub: "Widescreen" },
                  { id: "2.39:1", label: "2.39:1", sub: "Scope" },
                  { id: "1:1", label: "1:1", sub: "Square" },
                  { id: "9:16", label: "9:16", sub: "Vertical" },
                  { id: "4:3", label: "4:3", sub: "Academy" },
                ].map((ratio) => (
                  <button
                    key={ratio.id}
                    type="button"
                    onClick={() => setAspectRatio(ratio.id as AspectRatio)}
                    className={`py-2 px-1 text-center rounded-lg border transition ${
                      aspectRatio === ratio.id
                        ? "bg-indigo-600/30 border-indigo-500 text-white font-semibold shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-xs font-bold leading-none">{ratio.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-none">{ratio.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Input Card: Story Source & Character Bible */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <label className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Narrative Story Source
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCharacterBibleOpen(!isCharacterBibleOpen)}
                className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md transition border ${
                  characterBible.trim() || isCharacterBibleOpen
                    ? "bg-indigo-950/60 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                {isCharacterBibleOpen ? "Hide Cast & Character Bible" : "Character Bible / Cast"}
                {characterBible.trim() && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                )}
              </button>

              <label className="cursor-pointer text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-md text-slate-300 transition">
                <Upload className="w-3.5 h-3.5" />
                Upload .txt / .md
                <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Character Bible Collapsible Area */}
          {isCharacterBibleOpen && (
            <div className="p-4 bg-slate-950/80 border border-indigo-950 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Character Bible & Visual Consistency
                </span>
                <span className="text-[11px] text-slate-500">
                  Preserved across all beat generation prompts
                </span>
              </div>
              <textarea
                value={characterBible}
                onChange={(e) => setCharacterBible(e.target.value)}
                placeholder="Define character appearances to maintain visual consistency across beats, e.g.:
Elena: Late 20s pilot, short cropped dark auburn hair, scar over left eyebrow, weathered brown leather jacket.
Marcus: Tall cybernetic engineer in his 40s, sharp angular jawline, silver optical eyepiece, charcoal coat."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          )}

          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Paste your script, novel chapter, screenplay excerpt, or narrative scene here..."
            rows={7}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 font-serif text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
          />

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 pt-1 border-t border-slate-800/60">
            <div className="flex items-center gap-4">
              <span>
                Narrative Model: <strong className="text-indigo-400 uppercase">{llmProvider}</strong>
              </span>
              <span>
                Image Model: <strong className="text-indigo-400 uppercase">{imageProvider}</strong>
              </span>
              <span>
                Aspect Ratio: <strong className="text-slate-300">{aspectRatio}</strong>
              </span>
            </div>
            <div className="text-slate-500">
              {story.trim().length > 0 && `${story.trim().split(/\s+/).length} words`}
            </div>
          </div>

          {generalError && (
            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-950/40 p-3 rounded-lg border border-rose-900/70">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAnalyzeStory}
              disabled={isAnalyzing || !story.trim()}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Extracting Beats with {llmProvider.toUpperCase()}...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Extract Beats & Generate Storyboard
                </>
              )}
            </button>
          </div>
        </section>

        {/* Beats Output Section */}
        {beats.length > 0 && (
          <section className="space-y-6">
            {/* Storyboard Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Film className="w-5 h-5 text-indigo-400" />
                  Storyboard Timeline ({beats.length} {beats.length === 1 ? "Beat" : "Beats"})
                </h2>
                <p className="text-xs text-slate-400">
                  Add, reorder, edit narrative prompts, or export the production package
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddBeat}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  Add Beat
                </button>

                <button
                  onClick={handleGenerateAllPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition"
                  title="Generate visuals for any pending beats"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Generate Pending
                </button>

                <button
                  onClick={handleRegenerateAll}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition"
                  title="Regenerate all images using current aspect ratio and art style"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  Regenerate All
                </button>

                {/* Export Options Dropdown / Buttons */}
                <div className="flex items-center gap-1 bg-indigo-950/60 border border-indigo-700/60 rounded-lg p-1">
                  <button
                    onClick={() => handleExport("pdf")}
                    disabled={isExporting !== null}
                    className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-indigo-900/80 rounded text-xs font-medium text-indigo-200 transition disabled:opacity-50"
                    title="Export as professional PDF Storyboard Sheet"
                  >
                    {isExporting === "pdf" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => handleExport("zip")}
                    disabled={isExporting !== null}
                    className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-indigo-900/80 rounded text-xs font-medium text-indigo-200 transition disabled:opacity-50"
                    title="Export ZIP package with full-res images, markdown, script, and JSON"
                  >
                    {isExporting === "zip" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileArchive className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>ZIP Package</span>
                  </button>

                  <button
                    onClick={() => handleExport("md")}
                    disabled={isExporting !== null}
                    className="flex items-center gap-1 px-2 py-1.5 hover:bg-indigo-900/80 rounded text-xs text-indigo-200 transition disabled:opacity-50"
                    title="Download Markdown storyboard file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>MD</span>
                  </button>

                  <button
                    onClick={() => handleExport("json")}
                    disabled={isExporting !== null}
                    className="flex items-center gap-1 px-2 py-1.5 hover:bg-indigo-900/80 rounded text-xs text-indigo-200 transition disabled:opacity-50"
                    title="Download JSON data file"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Beat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {beats.map((beat, idx) => (
                <div
                  key={beat.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl overflow-hidden flex flex-col justify-between shadow-lg transition"
                >
                  {/* Visual Preview Container with selected aspect ratio */}
                  <div
                    className={`relative w-full ${getAspectClass()} bg-slate-950 flex items-center justify-center border-b border-slate-800 overflow-hidden`}
                  >
                    {beat.status === "generating" && (
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                        <span className="text-xs text-slate-400">Rendering visual beat...</span>
                      </div>
                    )}
                    {beat.status === "pending" && (
                      <div className="flex flex-col items-center gap-2 opacity-40">
                        <ImageIcon className="w-12 h-12" />
                        <span className="text-xs font-medium">Pending visual generation</span>
                      </div>
                    )}
                    {beat.status === "completed" && beat.imageUrl && (
                      <img
                        src={beat.imageUrl}
                        alt={beat.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {beat.status === "error" && (
                      <div className="flex flex-col items-center gap-1.5 p-6 text-center">
                        <AlertCircle className="w-6 h-6 text-rose-400" />
                        <span className="text-xs font-semibold text-rose-400">Rendering Error</span>
                        <p className="text-[11px] text-rose-300 max-w-sm line-clamp-3">{beat.error}</p>
                      </div>
                    )}

                    {/* Badge on visual */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                      <span className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-bold text-indigo-300 border border-indigo-500/30">
                        BEAT {idx + 1}
                      </span>
                      {beat.status === "completed" && (
                        <span className="bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </div>

                    {/* Move & Delete Controls */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-lg border border-slate-700/60">
                      <button
                        onClick={() => handleMoveBeat(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded"
                        title="Move beat up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveBeat(idx, "down")}
                        disabled={idx === beats.length - 1}
                        className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded"
                        title="Move beat down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBeat(beat.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded transition"
                        title="Delete beat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Beat Details and Editable Fields */}
                  <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Beat Title Editable */}
                      <input
                        type="text"
                        value={beat.title}
                        onChange={(e) => handleUpdateBeat(beat.id, { title: e.target.value })}
                        className="w-full font-bold text-base bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-950 px-1 py-0.5 rounded text-white focus:outline-none transition"
                        placeholder="Beat Title"
                      />

                      {/* Excerpt */}
                      {beat.storyExcerpt !== undefined && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Story Excerpt
                          </label>
                          <textarea
                            value={beat.storyExcerpt}
                            onChange={(e) =>
                              handleUpdateBeat(beat.id, { storyExcerpt: e.target.value })
                            }
                            rows={2}
                            className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 italic text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Quote from story..."
                          />
                        </div>
                      )}

                      {/* Narrative Context */}
                      {beat.narrativeContext !== undefined && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Dramatic Context
                          </label>
                          <input
                            type="text"
                            value={beat.narrativeContext}
                            onChange={(e) =>
                              handleUpdateBeat(beat.id, { narrativeContext: e.target.value })
                            }
                            className="w-full bg-slate-950/60 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Why this beat is pivotal..."
                          />
                        </div>
                      )}

                      {/* Prompt */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            Image Generation Prompt
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEnhancePrompt(beat.id, beat.imagePrompt)}
                              disabled={enhancingBeatId === beat.id || !beat.imagePrompt.trim()}
                              className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-40 transition py-0.5 px-2 rounded hover:bg-indigo-950/60 border border-transparent hover:border-indigo-800/40"
                              title="Expand keywords into a rich storyboard prompt using AI Studio LLM"
                            >
                              {enhancingBeatId === beat.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                                  <span className="text-slate-400">Enhancing...</span>
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-3 h-3 text-indigo-400" />
                                  <span>✨ Enhance</span>
                                </>
                              )}
                            </button>
                            <span className="text-[10px] text-slate-500 hidden sm:inline">Camera / Lighting / Scene</span>
                          </div>
                        </div>
                        <textarea
                          value={beat.imagePrompt}
                          onChange={(e) =>
                            handleUpdateBeat(beat.id, { imagePrompt: e.target.value })
                          }
                          rows={3}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => generateBeatImage(beat.id, beat.imagePrompt)}
                        disabled={beat.status === "generating"}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg text-xs font-medium text-slate-200 transition flex items-center justify-center gap-1.5"
                      >
                        {beat.status === "generating" ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Rendering...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            {beat.imageUrl ? "Regenerate Visual" : "Generate Visual"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* AI Provider Configuration Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" /> AI Provider Configuration
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Beat Extraction LLM Provider */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                Narrative Beat Extraction Model (LLM)
              </label>
              <select
                value={llmProvider}
                onChange={(e) => {
                  const newProv = e.target.value as LLMProvider;
                  setLlmProvider(newProv);
                  if (newProv === "openrouter" && !llmModel) {
                    setLlmModel(OPENROUTER_DEFAULT_MODEL);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="gemini">Google Gemini (Gemini 2.0 Flash)</option>
                <option value="openrouter">OpenRouter (Llama 3.3 70B / Claude 5.5 / DeepSeek)</option>
                <option value="ollama">Ollama (Local Llama 3 / Mistral)</option>
              </select>

              {llmProvider !== "ollama" ? (
                <input
                  type="password"
                  placeholder={`${llmProvider.toUpperCase()} API Key (Optional if set in .env)`}
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <input
                  type="text"
                  placeholder="Ollama Base URL (e.g. http://localhost:11434)"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}

              {llmProvider === "openrouter" ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    OpenRouter Model Selection
                  </label>
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      OpenRouter Model Selection
                    </label>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Auto Free Router
                    </span>
                  </div>
                  <select
                    value={
                      OPENROUTER_MODELS.some((m) => m.id === (llmModel || OPENROUTER_DEFAULT_MODEL))
                        ? (llmModel || OPENROUTER_DEFAULT_MODEL)
                        : "custom"
                    }
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setLlmModel("");
                      } else {
                        setLlmModel(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {OPENROUTER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.badge ? `[${m.badge}]` : ""} — {m.description}
                      </option>
                    ))}
                    <option value="custom">Custom OpenRouter Model ID...</option>
                  </select>

                  <p className="text-[10px] text-slate-400 leading-normal">
                    ⚡ <strong>openrouter/free</strong> is OpenRouter&apos;s smart auto-router that distributes prompts across active zero-cost models with no token fees.
                  </p>

                  {(!OPENROUTER_MODELS.some((m) => m.id === llmModel) || llmModel === "") && (
                    <input
                      type="text"
                      placeholder="Enter custom OpenRouter model slug (e.g. meta-llama/llama-3.3-70b-instruct)"
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder={`Custom Model Name (default for ${llmProvider})`}
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>

            {/* Image Generation Provider */}
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                Visual Image Generator
              </label>
              <select
                value={imageProvider}
                onChange={(e) => {
                  const newProv = e.target.value as ImageProvider;
                  setImageProvider(newProv);
                  if (newProv === "aistudio" && (!imageModel || imageModel.startsWith("dall-e") || imageModel.startsWith("imagen"))) {
                    setImageModel(AI_STUDIO_DEFAULT_MODEL);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="aistudio">🧪 AI Studio (FastAPI / Cloudflare Workers AI)</option>
                <option value="openai">OpenAI (DALL-E 3)</option>
                <option value="gemini">Google Imagen 3 (Gemini API)</option>
                <option value="openrouter">OpenRouter Image API</option>
              </select>

              {imageProvider === "aistudio" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      FastAPI Server / Worker URL
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. http://localhost:8000"
                      value={aiStudioBaseUrl}
                      onChange={(e) => setAiStudioBaseUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                    />
                    <div className="flex gap-2 text-[10px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => setAiStudioBaseUrl("http://localhost:8000")}
                        className="underline hover:text-indigo-400"
                      >
                        Reset to Localhost (:8000)
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAiStudioBaseUrl(
                            "https://free-image-generation-api.potter-jason7839.workers.dev"
                          )
                        }
                        className="underline hover:text-indigo-400"
                      >
                        Use Direct Cloudflare Worker
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      API Authorization Key
                    </label>
                    <input
                      type="password"
                      placeholder="API Key (default: 5b7f74f8ddb448f920eef0ae4263d81525d74)"
                      value={aiStudioApiKey}
                      onChange={(e) => setAiStudioApiKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Generous & Quality Image Model
                      </label>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Free Quota Safe
                      </span>
                    </div>
                    <select
                      value={imageModel || AI_STUDIO_DEFAULT_MODEL}
                      onChange={(e) => setImageModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {AI_STUDIO_IMAGE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.badge} ({m.cost})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      ⚡ High-cost models (FLUX.2 Dev & Klein 9B at ~2,000–3,000+ neurons) are excluded to ensure your free tier daily quota lasts.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={connectionTestStatus === "testing"}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      {connectionTestStatus === "testing" ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>Testing Server Connection...</span>
                        </>
                      ) : (
                        <>
                          <Server className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Test Local Server Connection</span>
                        </>
                      )}
                    </button>
                    {connectionTestStatus === "success" && (
                      <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{connectionTestMsg}</span>
                      </div>
                    )}
                    {connectionTestStatus === "error" && (
                      <div className="p-2 bg-rose-950/60 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span>{connectionTestMsg}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="password"
                    placeholder="Image API Key (optional if using same provider as LLM)"
                    value={imageApiKey}
                    onChange={(e) => setImageApiKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  <input
                    type="text"
                    placeholder="Image Model Name (e.g. dall-e-3, imagen-3.0-generate-002)"
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Note: Provider settings and keys are saved securely in your browser&apos;s localStorage
              and persist across reloads.
            </p>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/30"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
