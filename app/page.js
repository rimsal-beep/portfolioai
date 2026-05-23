"use client";
import { useState, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

function parsePortfolio(text) {
  const sections = { bio: "", skills: [], projects: [] };
  const lines = text.split("\n");
  let current = "";
  let projectBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "## Bio") { current = "bio"; continue; }
    if (line === "## Skills") { current = "skills"; continue; }
    if (line === "## Projects") { current = "projects"; continue; }

    if (current === "bio" && line) sections.bio += line + " ";
    if (current === "skills" && line) {
      sections.skills = line.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (current === "projects") {
      if (line.startsWith("### ")) {
        if (projectBuffer.length) {
          const [name, ...desc] = projectBuffer;
          sections.projects.push({ name: name.replace("### ", ""), desc: desc.join(" ").trim() });
          projectBuffer = [];
        }
        projectBuffer.push(line);
      } else if (line) {
        projectBuffer.push(line);
      }
    }
  }
  if (projectBuffer.length) {
    const [name, ...desc] = projectBuffer;
    sections.projects.push({ name: name.replace("### ", ""), desc: desc.join(" ").trim() });
  }
  return sections;
}

export default function Home() {
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("input");
  const portfolioRef = useRef(null);

  async function handleFetchRepos() {
    if (!username) return;
    setLoading(true);
    setError("");
    setRepos([]);
    setPortfolio(null);
    try {
      const res = await fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=6`);
      if (!res.ok) throw new Error("GitHub user not found");
      const data = await res.json();
      setRepos(data);
      setStep("repos");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePortfolio() {
    setLoading(true);
    setError("");
    setPortfolio(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos, username }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPortfolio(parsePortfolio(data.portfolio));
      setStep("portfolio");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

 async function handleDownloadPDF() {
  try {
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolio, username }),
    });
    const data = await res.json();
    const link = document.createElement("a");
    link.href = data.pdf;
    link.download = `${username}-portfolio.pdf`;
    link.click();
  } catch (err) {
    alert("PDF generation failed: " + err.message);
  }
}
async function handleShare() {
  try {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, portfolio }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const url = `${window.location.origin}/portfolio/${data.id}`;
    await navigator.clipboard.writeText(url);
    alert(`Link copied! 🎉\n\n${url}`);
  } catch (err) {
    alert("Error: " + err.message);
  }
}
  function handleReset() {
    setStep("input");
    setUsername("");
    setRepos([]);
    setPortfolio(null);
    setError("");
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-16">

      {/* Navbar */}
      <div className="flex justify-between items-center px-8 py-4 bg-gray-900 border-b border-gray-800 mb-12">
        <h2 className="text-xl font-bold cursor-pointer" onClick={handleReset}>
          Portfolio<span className="text-violet-500">AI</span>
        </h2>
        {session ? (
          <div className="flex items-center gap-4">
            <img src={session.user.image} className="w-8 h-8 rounded-full" />
            <span className="text-gray-300 text-sm">{session.user.name}</span>
            <button onClick={() => signOut()} className="text-sm text-gray-400 hover:text-white transition-colors">Sign out</button>
          </div>
        ) : (
          <button onClick={() => signIn("github")} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-semibold transition-colors">
            Sign in with GitHub
          </button>
        )}
      </div>

      {/* STEP 1 — Input */}
      {step === "input" && (
        <div className="flex flex-col items-center justify-center px-4">
          <h1 className="text-5xl font-bold text-center mb-4">
            Portfolio<span className="text-violet-500">AI</span>
          </h1>
          <p className="text-gray-400 text-xl text-center max-w-xl mb-8">
            Enter any GitHub username and we will generate a full developer portfolio with AI.
          </p>
          <input
            type="text"
            placeholder="Enter GitHub username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetchRepos()}
            className="w-full max-w-md px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          <button onClick={handleFetchRepos} disabled={loading}
            className="mt-4 px-8 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg font-semibold transition-colors">
            {loading ? "Fetching repos..." : "Fetch Repos →"}
          </button>
          {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
      )}

      {/* STEP 2 — Repos */}
      {step === "repos" && (
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-2">Found {repos.length} repos for <span className="text-violet-400">@{username}</span></h2>
          <p className="text-gray-400 mb-6">These will be used to generate your AI portfolio.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {repos.map((repo) => (
              <div key={repo.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="font-semibold text-violet-400">{repo.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{repo.description || "No description"}</p>
                <div className="flex gap-4 mt-3 text-sm text-gray-500">
                  <span>⭐ {repo.stargazers_count}</span>
                  <span>🍴 {repo.forks_count}</span>
                  {repo.language && <span>💻 {repo.language}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <button onClick={handleReset} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors">← Back</button>
            <button onClick={handleGeneratePortfolio} disabled={loading}
              className="px-8 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg font-semibold transition-colors">
              {loading ? "Generating with AI..." : "✨ Generate Portfolio"}
            </button>
          </div>
          {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
      )}

      {/* STEP 3 — Portfolio Output */}
      {step === "portfolio" && portfolio && (
        <div className="max-w-3xl mx-auto px-4">

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold">@{username}</h2>
              <p className="text-violet-400 text-sm mt-1">AI-generated portfolio</p>
            </div>
            <div className="flex gap-3">
  <button onClick={handleShare}
    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors">
    🔗 Share
  </button>
  <button onClick={handleDownloadPDF}
    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-semibold transition-colors">
    ⬇ Download PDF
  </button>
  <button onClick={handleReset}
    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
    Start Over
  </button>
</div>
          </div>

          {/* Portfolio content wrapped in ref */}
          <div ref={portfolioRef} className="flex flex-col gap-6 bg-gray-950 p-4 rounded-xl">

            {/* Bio */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">About</h3>
              <p className="text-gray-200 leading-relaxed text-lg">{portfolio.bio}</p>
            </div>

            {/* Skills */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {portfolio.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-violet-900/40 border border-violet-700/50 text-violet-300 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-4">Projects</h3>
              <div className="flex flex-col gap-4">
                {portfolio.projects.map((project, i) => (
                  <div key={i} className="border border-gray-700 rounded-lg p-4 hover:border-violet-700/50 transition-colors">
                    <h4 className="font-semibold text-white mb-1">{project.name}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">{project.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}