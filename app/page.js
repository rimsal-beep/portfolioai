"use client";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState([]);
  const [portfolio, setPortfolio] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState("input"); // input | repos | portfolio

  async function handleFetchRepos() {
    if (!username) return;
    setLoading(true);
    setError("");
    setRepos([]);
    setPortfolio("");

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
    setPortfolio("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos, username }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPortfolio(data.portfolio);
      setStep("portfolio");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep("input");
    setUsername("");
    setRepos([]);
    setPortfolio("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 pb-16">

      {/* Navbar */}
      <div className="flex justify-between items-center px-8 py-4 bg-gray-900 border-b border-gray-800 mb-12">
        <h2 className="text-xl font-bold cursor-pointer" onClick={handleReset}>
          Portfolio<span className="text-violet-500">AI</span>
        </h2>
        {session ? (
          <div className="flex items-center gap-4">
            <img src={session.user.image} className="w-8 h-8 rounded-full" />
            <span className="text-gray-300 text-sm">{session.user.name}</span>
            <button onClick={() => signOut()} className="text-sm text-gray-400 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        ) : (
          <button onClick={() => signIn("github")} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-semibold transition-colors">
            Sign in with GitHub
          </button>
        )}
      </div>

      {/* STEP 1 — Input */}
      {step === "input" && (
        <div className="flex flex-col items-center justify-center">
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
          <button
            onClick={handleFetchRepos}
            disabled={loading}
            className="mt-4 px-8 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
          >
            {loading ? "Fetching repos..." : "Fetch Repos →"}
          </button>
          {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
      )}

      {/* STEP 2 — Repos */}
      {step === "repos" && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Found {repos.length} repos for <span className="text-violet-400">@{username}</span></h2>
          <p className="text-gray-400 mb-6">These will be used to generate your portfolio.</p>

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
            <button onClick={handleReset} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors">
              ← Back
            </button>
            <button
              onClick={handleGeneratePortfolio}
              disabled={loading}
              className="px-8 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
            >
              {loading ? "Generating with AI..." : "✨ Generate Portfolio"}
            </button>
          </div>
          {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
      )}

      {/* STEP 3 — Portfolio Output */}
      {step === "portfolio" && (
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">✨ Portfolio for <span className="text-violet-400">@{username}</span></h2>
            <button onClick={handleReset} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
              Start Over
            </button>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
            <pre className="whitespace-pre-wrap text-gray-200 leading-relaxed font-sans">
              {portfolio}
            </pre>
          </div>
        </div>
      )}

    </main>
  );
}