import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { portfolio, username, portfolioId } = await request.json();

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

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const text = completion.choices[0]?.message?.content || "";

    // Parse feedback
    const result = { score: "", strengths: [], weaknesses: [], missing: [], suggestions: [], verdict: "" };
    const lines = text.split("\n");
    let current = "";
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("SCORE:")) { result.score = t.replace("SCORE:", "").trim(); continue; }
      if (t === "STRENGTHS:") { current = "strengths"; continue; }
      if (t === "WEAKNESSES:") { current = "weaknesses"; continue; }
      if (t === "MISSING:") { current = "missing"; continue; }
      if (t === "SUGGESTIONS:") { current = "suggestions"; continue; }
      if (t === "VERDICT:") { current = "verdict"; continue; }
      if (t.startsWith("- ") && current !== "verdict") {
        result[current]?.push(t.replace("- ", ""));
      } else if (current === "verdict" && t) {
        result.verdict += t + " ";
      }
    }

    // Save feedback to Supabase if portfolioId exists
    if (portfolioId) {
      await supabase
        .from("portfolios")
        .update({ feedback: result })
        .eq("id", portfolioId);
    }

    return Response.json({ feedback: result });

} catch (error) {
  console.error("FEEDBACK ERROR:", error);
  return Response.json({ error: error.message }, { status: 500 });
}
}