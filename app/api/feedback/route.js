import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { portfolio, username } = await request.json();

    const prompt = `You are a senior tech recruiter with 10+ years of experience hiring developers.

Analyze this developer portfolio and give honest, specific feedback.

Developer: ${username}

Bio: ${portfolio.bio}

Skills: ${portfolio.skills.join(", ")}

Projects:
${portfolio.projects.map((p) => `- ${p.name}: ${p.desc}`).join("\n")}

Respond in this EXACT format, nothing else:

SCORE: [number from 1-10]

STRENGTHS:
- [strength 1]
- [strength 2]
- [strength 3]

WEAKNESSES:
- [weakness 1]
- [weakness 2]

MISSING:
- [missing skill or project type 1]
- [missing skill or project type 2]

SUGGESTIONS:
- [specific actionable suggestion 1]
- [specific actionable suggestion 2]
- [specific actionable suggestion 3]

VERDICT:
[2 sentence summary of this candidate's employability]`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const text = completion.choices[0]?.message?.content || "";
    return Response.json({ feedback: text });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}