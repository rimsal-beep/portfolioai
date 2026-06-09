import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { repos, username } = await request.json();

    if (!repos || repos.length === 0) {
      return Response.json({ 
    portfolio: "NO_REPOS"
  });
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

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const text = completion.choices[0]?.message?.content || "";
    return Response.json({ portfolio: text });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}