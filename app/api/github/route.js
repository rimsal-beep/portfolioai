export async function POST(request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return Response.json({ error: "No username provided" }, { status: 400 });
    }

    const headers = {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
    };

    const [reposRes, profileRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=6`, { headers }),
      fetch(`https://api.github.com/users/${username}`, { headers }),
    ]);

    if (!reposRes.ok) {
      if (reposRes.status === 404) {
        return Response.json({ error: "GitHub user not found" }, { status: 404 });
      }
      return Response.json({ error: "Failed to fetch from GitHub" }, { status: reposRes.status });
    }

    const repos = await reposRes.json();
    const profile = await profileRes.json();

    return Response.json({ repos, profile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}