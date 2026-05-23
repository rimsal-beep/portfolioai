import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { repos, username } = await request.json();

    const repoSummary = repos
      .map((r) => `- ${r.name}: ${r.description || "No description"} (${r.language || "Unknown"}, ⭐${r.stargazers_count})`)
      .join("\n");

    const prompt = `You are a professional portfolio writer for developers.

Based on the following GitHub repositories for the user "${username}", write a complete developer portfolio in this exact format:

## Bio
A compelling 3-sentence professional bio about this developer based on their projects.

## Skills
A comma-separated list of technical skills inferred from their repos.

## Projects
For each repo, write a 2-3 sentence professional project description.

Here are their repositories:
${repoSummary}

Write in a professional but personable tone. Be specific about technologies used.`;

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