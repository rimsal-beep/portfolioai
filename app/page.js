"use client";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState([]);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!username) return;
    setLoading(true);
    setError("");
    setRepos([]);

    try {
      const res = await fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=6`);
      if (!res.ok) throw new Error("GitHub user not found");
      const data = await res.json();
      setRepos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 flex justify-between items-center px-8 py-4 bg-gray-900 border-b border-gray-800">
        <h2 className="text-xl font-bold">Portfolio<span className="text-violet-500">AI</span></h2>
        {session ? (
          <div className="flex items-center gap-4">
            <img src={session.user.image} className="w-8 h-8 rounded-full" />
            <span className="text-gray-300 text-sm">{session.user.name}</span>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn("github")}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Sign in with GitHub
          </button>
        )}
      </div>

      {/* Hero */}
      <h1 className="text-5xl font-bold text-center mb-4">
        Portfolio<span className="text-violet-500">AI</span>
      </h1>
      <p className="text-gray-400 text-xl text-center max-w-xl mb-8">
        Enter your GitHub username and we will generate your entire portfolio in seconds.
      </p>

      <input
        type="text"
        placeholder="Enter your GitHub username..."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full max-w-md px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
      />
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mt-4 px-8 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
      >
        {loading ? "Fetching repos..." : "Generate Portfolio →"}
      </button>

      {error && <p className="mt-6 text-red-400">{error}</p>}

      {repos.length > 0 && (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
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
      )}
    </main>
  );
}