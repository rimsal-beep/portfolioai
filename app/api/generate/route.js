import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { repos, username, profile } = await request.json();

    const repoSummary = repos
      .map((r) => `- ${r.name}: ${r.description || "No description"} (${r.language || "Unknown"}, ⭐${r.stargazers_count})`)
      .join("\n");

    const prompt = `You are a professional portfolio writer for developers.

Based on the following GitHub repositories for the user "${username}", write a complete developer portfolio in this EXACT format:

## Title
A short professional job title (e.g. "Full-Stack Developer" or "Frontend Engineer & AI Enthusiast") — max 6 words

## Bio
A compelling 3-sentence professional bio about this developer based on their projects.

## Skills
A comma-separated list of technical skills inferred from their repos.
## Projects
Write EXACTLY one entry per project using this format, no exceptions:

### projectname
2-3 sentences about this specific project only.

### nextprojectname  
2-3 sentences about this specific project only.

Write a SEPARATE ### entry for EVERY single repo listed. Do not combine repos.

Here are their repositories:
${repoSummary}

Write in a professional but personable tone. Be specific about technologies used.`;

    const model = groq.chat.completions;
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