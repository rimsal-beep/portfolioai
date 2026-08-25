import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Tried in order. If one is deprecated by Groq, the next is used automatically.
const MODEL_FALLBACKS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

async function generateWithFallback(prompt) {
  let lastError;
  for (const model of MODEL_FALLBACKS) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err) {
      console.error(`Model ${model} failed:`, err.message);
      lastError = err;
      continue;
    }
  }
  throw new Error("All AI models are currently unavailable. Please try again shortly.");
}

export async function POST(request) {
  try {
    const { repos, username } = await request.json();

    if (!repos || repos.length === 0) {
      return Response.json({ portfolio: "NO_REPOS" });
    }

    const repoSummary = repos
      .map((r) => `- ${r.name}: ${r.description || "No description"} (${r.language || "Unknown"}, ⭐${r.stargazers_count})`)
      .join("\n");

    const prompt = `You are a professional portfolio writer for developers.

STRICT RULES — follow these exactly:
- ONLY write about the repositories listed below. Do NOT invent anything.
- Do NOT add projects, skills, or technologies not present in the list.
- Be specific and reference actual repo names.

Developer GitHub username: "${username}"

Their repositories:
${repoSummary}

Write a complete developer portfolio in this EXACT format:

## Title
A short professional job title inferred from the repos — max 6 words

## Bio
A compelling 3-sentence professional bio based ONLY on the repos above.

## Skills
A comma-separated list of technical skills inferred ONLY from the repos above.

## Projects
For each repo listed above, write EXACTLY one entry:

### reponame
2-3 sentence description of this specific project only.

Write a SEPARATE ### entry for EVERY single repo. Do not combine repos. Do not invent repos.`;

    const text = await generateWithFallback(prompt);
    return Response.json({ portfolio: text });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}