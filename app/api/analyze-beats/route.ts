import { NextResponse } from "next/server";
import { getLLMClient, LLMProvider, OPENROUTER_DEFAULT_MODEL } from "@/lib/providers";
import { parseAndValidateBeats } from "@/lib/parser";

export async function POST(req: Request) {
  try {
    const {
      story,
      provider = "openai",
      apiKey,
      model,
      ollamaBaseUrl,
      characterBible,
      artStyle,
    } = await req.json();

    if (!story || typeof story !== "string" || !story.trim()) {
      return NextResponse.json({ error: "Story text is required" }, { status: 400 });
    }

    // Validate provider API keys upfront with helpful error messages
    if (provider === "openrouter") {
      const activeKey = apiKey || process.env.OPENROUTER_API_KEY;
      if (!activeKey || !activeKey.trim() || activeKey === "openrouter-dummy-key") {
        return NextResponse.json(
          {
            error:
              "OpenRouter API Key is missing. Please enter your OpenRouter API key in the AI Providers settings modal or configure OPENROUTER_API_KEY in your .env file.",
          },
          { status: 400 }
        );
      }
    } else if (provider === "openai") {
      const activeKey = apiKey || process.env.OPENAI_API_KEY;
      if (!activeKey || !activeKey.trim() || activeKey === "openai-dummy-key") {
        return NextResponse.json(
          {
            error:
              "OpenAI API Key is missing. Please enter your OpenAI API key in the AI Providers settings modal or configure OPENAI_API_KEY in your .env file.",
          },
          { status: 400 }
        );
      }
    } else if (provider === "gemini") {
      const activeKey = apiKey || process.env.GEMINI_API_KEY;
      if (!activeKey || !activeKey.trim() || activeKey === "gemini-dummy-key") {
        return NextResponse.json(
          {
            error:
              "Google Gemini API Key is missing. Please enter your Gemini API key in the AI Providers settings modal or configure GEMINI_API_KEY in your .env file.",
          },
          { status: 400 }
        );
      }
    }

    const { client, defaultModel } = getLLMClient({
      provider: provider as LLMProvider,
      apiKey,
      model,
      ollamaBaseUrl,
    });

    let systemPrompt = `You are an expert film director and storyboard artist.
Analyze the provided story and identify 3 to 6 key visual "beats" (pivotal dramatic moments best suited for illustration).

Return JSON ONLY with this exact structure:
{
  "beats": [
    {
      "id": "beat-1",
      "title": "Short 3-5 word scene headline",
      "storyExcerpt": "The direct quote or excerpt from the story",
      "narrativeContext": "1-2 sentences explaining why this beat is pivotal",
      "imagePrompt": "A detailed, descriptive text-to-image prompt (lighting, camera angle, subject, composition)"
    }
  ]
}`;

    if (characterBible && typeof characterBible === "string" && characterBible.trim()) {
      systemPrompt += `\n\nCHARACTER BIBLE & CAST DESCRIPTIONS:
${characterBible.trim()}
CRITICAL: You must preserve and reflect these character appearances consistently in each beat's "imagePrompt".`;
    }

    if (artStyle && typeof artStyle === "string" && artStyle.trim()) {
      systemPrompt += `\n\nVISUAL ART STYLE DIRECTION:
${artStyle.trim()}
Ensure each beat's "imagePrompt" aligns seamlessly with this art style.`;
    }

    // OpenAI and Gemini support response_format: { type: "json_object" } natively.
    // OpenRouter routes to diverse upstream models where json_object is frequently unsupported
    // and causes upstream providers to abort or close connections prematurely (404/Premature close).
    const shouldUseJsonObject = provider === "openai" || provider === "gemini";

    let completion;
    try {
      const requestPayload: any = {
        model: defaultModel,
        messages: [
          {
            role: "system",
            content: shouldUseJsonObject
              ? systemPrompt
              : `${systemPrompt}\nIMPORTANT: Reply with valid raw JSON only. Do not include markdown code fences or conversational preambles.`,
          },
          {
            role: "user",
            content: `Analyze this story and extract the key visual beats as JSON:\n\n${story.trim()}`,
          },
        ],
      };

      if (shouldUseJsonObject) {
        requestPayload.response_format = { type: "json_object" };
      }

      completion = await client.chat.completions.create(requestPayload);
    } catch (createErr: any) {
      const errMsg = createErr?.message || "";
      const errStatus = createErr?.status;

      // Handle fallback if json_object format was rejected
      if (
        shouldUseJsonObject &&
        (errMsg.includes("response_format") || errMsg.includes("json_object") || errStatus === 400)
      ) {
        completion = await client.chat.completions.create({
          model: defaultModel,
          messages: [
            {
              role: "system",
              content: `${systemPrompt}\nIMPORTANT: Reply with valid raw JSON only. Do not wrap in markdown or conversational text.`,
            },
            {
              role: "user",
              content: `Analyze this story and extract the key visual beats as JSON:\n\n${story.trim()}`,
            },
          ],
        });
      } else {
        // Detailed error diagnosis for common provider issues (e.g. OpenRouter 404 / premature close)
        if (
          provider === "openrouter" &&
          (errMsg.includes("404") ||
            errMsg.includes("Premature close") ||
            errMsg.includes("No such model") ||
            errMsg.includes("not found"))
        ) {
          throw new Error(
            `OpenRouter Model Error: The model "${defaultModel}" was not found or the connection was prematurely closed by OpenRouter. ` +
              `Please use an active model like "${OPENROUTER_DEFAULT_MODEL}" or "anthropic/claude-sonnet-5.5" in the AI Providers settings.`
          );
        }

        if (
          provider === "openrouter" &&
          (errMsg.includes("401") ||
            errMsg.includes("User not found") ||
            errMsg.includes("Missing Authentication"))
        ) {
          throw new Error(
            "OpenRouter Authentication Error: Invalid API key. Please check your OpenRouter API key in the AI Providers settings modal."
          );
        }

        if (
          provider === "openrouter" &&
          (errMsg.includes("402") || errMsg.includes("credit") || errMsg.includes("balance"))
        ) {
          throw new Error(
            `OpenRouter Credit Error: Insufficient account credits to run model "${defaultModel}". Please top up credits or switch models.`
          );
        }

        throw createErr;
      }
    }

    const content = completion.choices[0]?.message?.content || "";
    if (!content.trim()) {
      throw new Error("Received empty response from the AI model.");
    }

    const beats = parseAndValidateBeats(content);
    return NextResponse.json({ beats });
  } catch (error: any) {
    console.error("Beat extraction error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze beats" },
      { status: 500 }
    );
  }
}
