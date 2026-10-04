import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL_FALLBACKS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

async function generateWithFallback(prompt) {
  const MAX_RETRIES_PER_MODEL = 2;

  for (const model of MODEL_FALLBACKS) {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model,
        });
        return completion.choices[0]?.message?.content || "";
      } catch (err) {
        console.error(`Model ${model} attempt ${attempt} failed:`, err.message);
        if (attempt < MAX_RETRIES_PER_MODEL) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }
  }
  throw new Error("All AI models are currently unavailable. Please try again shortly.");
}

function parseFeedbackText(raw) {
  const result = { score: "", strengths: [], weaknesses: [], missing: [], suggestions: [], verdict: "" };
  const sections = {
    STRENGTHS: "strengths",
    WEAKNESSES: "weaknesses",
    MISSING: "missing",
    SUGGESTIONS: "suggestions",
    VERDICT: "verdict",
  };

  // strip markdown noise (bold, backticks)
  const text = raw.replace(/\*\*/g, "").replace(/__/g, "").replace(/`/g, "");
  let current = "";

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim().replace(/^#+\s*/, "");
    if (!line) continue;

    const scoreMatch = line.match(/^SCORE\s*:?\s*(\d+(?:\.\d+)?)/i);
    if (scoreMatch) {
      result.score = scoreMatch[1];
      current = "";
      continue;
    }

    const header = line.match(/^(STRENGTHS|WEAKNESSES|MISSING|SUGGESTIONS|VERDICT)(?:\s*:\s*(.*)|\s*)$/i);
    if (header) {
      current = sections[header[1].toUpperCase()];
      if (current === "verdict" && header[2]) result.verdict += header[2] + " ";
      continue;
    }

    if (current === "verdict") {
      result.verdict += line + " ";
      continue;
    }

    const bullet = line.match(/^(?:[-*•–]|\d+[.)])\s+(.*)$/);
    if (bullet && current) result[current].push(bullet[1]);
  }

  return result;
}

function isValidFeedback(f) {
  return f.score && f.strengths.length > 0 && f.verdict.trim().length > 0;
}

export async function POST(request) {
  try {
    const { portfolio, username, portfolioId } = await request.json();

    if (!portfolio.projects || portfolio.projects.length === 0) {
      const emptyFeedback = {
        score: "0",
        strengths: [],
        weaknesses: ["No public repositories found on GitHub"],
        missing: ["At least one original project", "A README file explaining your work", "Commits showing real coding activity"],
        suggestions: [
          "Start by pushing any project to GitHub — even a small one",
          "Add descriptions to your repos so recruiters understand your work",
          "Make at least 3 original projects before applying for jobs"
        ],
        verdict: "This profile has no public repositories yet. Start building and pushing projects to GitHub to get a real portfolio score."
      };
      if (portfolioId) {
        await supabase.from("portfolios").update({ feedback: emptyFeedback }).eq("id", portfolioId);
      }
      return Response.json({ feedback: emptyFeedback });
    }

    const prompt = `You are a senior tech recruiter with 10+ years hiring developers at top companies like Google, Meta, and startups.

Analyze this developer portfolio VERY specifically and honestly. Be precise — mention actual project names, actual skills, actual gaps.

Developer: ${username}

Bio: ${portfolio.bio}

Skills: ${portfolio.skills.join(", ")}

Projects:
${portfolio.projects.map((p) => `- ${p.name}: ${p.desc}`).join("\n")}

Give SPECIFIC feedback based on what you actually see. Don't be generic. Reference actual project names and skills.

Respond in this EXACT format:

SCORE: [number 1-10, be honest and strict]

STRENGTHS:
- [specific strength referencing actual projects/skills]
- [specific strength referencing actual projects/skills]
- [specific strength referencing actual projects/skills]

WEAKNESSES:
- [specific weakness with exact reason]
- [specific weakness with exact reason]

MISSING:
- [specific missing skill/project type that would help this developer get hired]
- [specific missing skill/project type]

SUGGESTIONS:
- [very specific actionable suggestion mentioning what to build or learn]
- [very specific actionable suggestion]
- [very specific actionable suggestion]

VERDICT:
[2 sentences. Be specific. Mention actual skills and projects. Say exactly what kind of role this developer is ready for right now.]`;

    // Ask the AI, validate the result, and quietly retry if it's unreadable
    let result = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const text = await generateWithFallback(prompt);
      const parsed = parseFeedbackText(text);
      if (isValidFeedback(parsed)) {
        result = parsed;
        break;
      }
      console.error(`Unparseable feedback (attempt ${attempt}):`, text);
    }

    if (!result) {
      return Response.json(
        { error: "The AI returned an unreadable response. Please try again." },
        { status: 502 }
      );
    }

    if (portfolioId) {
      await supabase.from("portfolios").update({ feedback: result }).eq("id", portfolioId);
    }

    return Response.json({ feedback: result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}