import { NextResponse } from "next/server";
import { getLLMClient, LLMProvider } from "@/lib/providers";
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

    let completion;
    try {
      completion = await client.chat.completions.create({
        model: defaultModel,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze this story and extract the key visual beats as JSON:\n\n${story.trim()}`,
          },
        ],
      });
    } catch (createErr: any) {
      // Fallback without response_format if provider doesn't support json_object mode
      if (
        createErr?.message?.includes("response_format") ||
        createErr?.message?.includes("json_object") ||
        createErr?.status === 400
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
