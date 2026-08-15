"use client";
import { useState, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

function parsePortfolio(text) {
  const sections = { title: "", bio: "", skills: [], projects: [] };
  const lines = text.split("\n");
  let current = "";
  let projectBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "## Title") { current = "title"; continue; }
    if (line === "## Bio") { current = "bio"; continue; }
    if (line === "## Skills") { current = "skills"; continue; }
    if (line === "## Projects") { current = "projects"; continue; }
    if (current === "title" && line) { sections.title = line; continue; }
    if (current === "bio" && line) { sections.bio += line + " "; continue; }
    if (current === "skills" && line) {
      sections.skills = line.split(",").map((s) => s.trim()).filter(Boolean);
      continue;
    }
    if (current === "projects") {
      if (line.startsWith("### ")) {
        if (projectBuffer.length) {
          const [name, ...desc] = projectBuffer;
          sections.projects.push({ name: name.replace("### ", ""), desc: desc.join(" ").trim() });
          projectBuffer = [];
        }
        projectBuffer.push(line);
      } else if (line.startsWith("* **") || line.startsWith("- **")) {
        if (projectBuffer.length) {
          const [name, ...desc] = projectBuffer;
          sections.projects.push({ name, desc: desc.join(" ").trim() });
          projectBuffer = [];
        }
        const match = line.match(/\*\*([^*]+)\*\*:?\s*(.*)/);
        if (match) {
          projectBuffer.push(match[1]);
          if (match[2]) projectBuffer.push(match[2]);
        }
      } else if (line && projectBuffer.length) {
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

function parseFeedback(text) {
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
  return result;
}

export default function Home() {
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("input");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [githubProfile, setGithubProfile] = useState(null);
  const [sharedId, setSharedId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const portfolioRef = useRef(null);

async function handleFetchRepos() {
  if (!username) return;
  setLoading(true);
  setError("");
  setRepos([]);
  setPortfolio(null);
  try {
    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const reposData = data.repos;
    const profileData = data.profile;

    if (!Array.isArray(reposData) || reposData.length === 0) {
      throw new Error("⚠️ This GitHub account has no public repositories. PortfolioAI needs at least one public repo to generate a portfolio.");
    }

    setRepos(reposData);
    setGithubProfile(profileData);
    setStep("repos");
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

  async function handleSaveAndShare() {
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, portfolio }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const url = `${window.location.origin}/portfolio/${data.id}`;
      setSharedId(data.id);
      setShareUrl(url);
      setShowShareModal(true);
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  async function handleGetFeedback() {
    setFeedbackLoading(true);
    try {
      const saveRes = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, portfolio }),
      });
      const saveData = await saveRes.json();
      if (saveData.error) throw new Error(saveData.error);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio, username, portfolioId: saveData.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = `/feedback/${saveData.id}`;
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setFeedbackLoading(false);
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
    <main className="min-h-screen gradient-bg text-white pb-16">

      {/* Navbar */}
      <div style={{position: "sticky", top: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", marginBottom: "32px", background: "rgba(3,7,18,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)"}}>
        <h2 onClick={handleReset} style={{fontSize: "1.3rem", fontWeight: "800", cursor: "pointer", letterSpacing: "-0.02em"}}>
          Portfolio<span style={{background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>AI</span>
        </h2>
        {session ? (
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <img src={session.user.image} style={{width: "32px", height: "32px", borderRadius: "50%", border: "2px solid rgba(168,85,247,0.5)"}} />
            <span style={{color: "#d1d5db", fontSize: "0.8rem", display: "none"}} className="sm:block">{session.user.name}</span>
            <button onClick={() => signOut()} className="btn-press" style={{color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem"}}>
              Sign out
            </button>
          </div>
        ) : (
          <button onClick={() => signIn("github", { prompt: "select_account" })} className="btn-press" style={{padding: "8px 14px", borderRadius: "10px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 0 20px rgba(124,58,237,0.4)", border: "none", color: "white", fontWeight: "600", cursor: "pointer", fontSize: "0.8rem"}}>
            Sign in
          </button>
        )}
      </div>

      {/* STEP 1 — Input */}
      {step === "input" && (
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 0"}}>
          <div style={{textAlign: "center", marginBottom: "32px"}}>
            <div style={{display: "inline-block", padding: "6px 14px", borderRadius: "999px", background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#a78bfa", fontSize: "0.7rem", fontWeight: "600", marginBottom: "20px"}}>
              ✨ AI-Powered Portfolio Generator
            </div>
            <h1 style={{fontSize: "clamp(1.8rem, 8vw, 3.8rem)", fontWeight: "800", lineHeight: "1.1", marginBottom: "16px"}}>
              Generate Your<br />
              <span style={{background: "linear-gradient(135deg,#a855f7,#ec4899,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>
                Dream Portfolio
              </span>
            </h1>
            <p style={{color: "#9ca3af", fontSize: "clamp(0.9rem, 3vw, 1.1rem)", maxWidth: "480px", margin: "0 auto 32px", lineHeight: "1.7"}}>
              Enter any GitHub username and AI will craft a stunning developer portfolio in seconds.
            </p>
          </div>
          <div style={{width: "100%", maxWidth: "440px"}}>
            <input
              type="text"
              placeholder="Enter GitHub username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchRepos()}
              style={{width: "100%", padding: "14px 18px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: "1rem", marginBottom: "12px", outline: "none", boxSizing: "border-box"}}
            />
            <button onClick={handleFetchRepos} disabled={loading} className="btn-press"
              style={{width: "100%", padding: "14px", borderRadius: "12px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 0 30px rgba(124,58,237,0.5)", border: "none", color: "white", fontSize: "1rem", fontWeight: "700", cursor: "pointer", opacity: loading ? 0.5 : 1}}>
              {loading ? "Fetching repos..." : "Fetch GitHub Repos →"}
            </button>
            {error && <p style={{color: "#f87171", textAlign: "center", marginTop: "12px"}}>{error}</p>}
          </div>
          <div style={{display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px", marginTop: "36px"}}>
            {[
              {icon: "🤖", label: "AI-Generated Bio"},
              {icon: "💼", label: "Project Writeups"},
              {icon: "🎯", label: "Recruiter Feedback"},
              {icon: "📄", label: "PDF Export"},
              {icon: "🔗", label: "Shareable Link"},
            ].map((f, i) => (
              <div key={i} style={{display: "flex", alignItems: "center", gap: "6px", color: "#6b7280", fontSize: "0.8rem"}}>
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 — Repos */}
{step === "repos" && (
  <div style={{maxWidth: "700px", margin: "0 auto", padding: "0 16px"}}>
    <div style={{marginBottom: "24px"}}>
      <h2 style={{fontSize: "clamp(1.4rem, 5vw, 2rem)", fontWeight: "700", marginBottom: "8px"}}>
        Found <span style={{background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>{repos.length} repos</span> for @{username}
      </h2>
      {repos.length === 0 ? (
        <div style={{background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "20px", marginTop: "16px", textAlign: "center"}}>
          <p style={{color: "#f87171", fontWeight: "700", fontSize: "1rem", marginBottom: "6px"}}>⚠️ No public repositories found</p>
          <p style={{color: "#9ca3af", fontSize: "0.875rem", lineHeight: "1.6"}}>This GitHub account has no public repos. PortfolioAI cannot generate a portfolio without real projects. Please add at least one public repository to GitHub first.</p>
        </div>
      ) : (
        <p style={{color: "#9ca3af"}}>These will be used to generate your AI portfolio.</p>
      )}
    </div>

    {repos.length > 0 && (
      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", marginBottom: "24px"}}>
        {repos.map((repo) => (
          <div key={repo.id} style={{background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "16px"}}>
            <h3 style={{color: "#a78bfa", fontWeight: "600", marginBottom: "6px"}}>{repo.name}</h3>
            <p style={{color: "#9ca3af", fontSize: "0.875rem", marginBottom: "12px"}}>{repo.description || "No description"}</p>
            <div style={{display: "flex", gap: "12px", fontSize: "0.8rem", color: "#6b7280", flexWrap: "wrap"}}>
              <span>⭐ {repo.stargazers_count}</span>
              <span>🍴 {repo.forks_count}</span>
              {repo.language && <span>💻 {repo.language}</span>}
            </div>
          </div>
        ))}
      </div>
    )}

    <div style={{display: "flex", gap: "12px"}}>
      <button onClick={handleReset} className="btn-press" style={{padding: "12px 20px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#d1d5db", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap"}}>
        ← Back
      </button>
      <button
        onClick={handleGeneratePortfolio}
        className="btn-press"
        disabled={loading || repos.length === 0}
        style={{flex: 1, padding: "12px", borderRadius: "12px", background: repos.length === 0 ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: repos.length === 0 ? "none" : "0 0 25px rgba(124,58,237,0.4)", border: repos.length === 0 ? "1px solid rgba(255,255,255,0.1)" : "none", color: repos.length === 0 ? "#6b7280" : "white", cursor: repos.length === 0 ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "0.95rem", opacity: loading ? 0.5 : 1}}>
        {repos.length === 0 ? "⚠️ No repos to generate from" : loading ? "✨ Generating..." : "✨ Generate Portfolio"}
      </button>
    </div>
    {error && <p style={{color: "#f87171", marginTop: "16px"}}>{error}</p>}
  </div>
)}
      {/* STEP 3 — Portfolio Output */}
      {step === "portfolio" && portfolio && (
        <div style={{maxWidth: "860px", margin: "0 auto", padding: "0 16px"}}>

          {/* Action buttons */}
          <div style={{display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "24px", flexWrap: "wrap"}}>
            <button onClick={handleSaveAndShare} className="btn-press" style={{padding: "9px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#d1d5db", cursor: "pointer", fontSize: "0.8rem", fontWeight: "500"}}>
              🔗 Share
            </button>
            <button onClick={handleDownloadPDF} className="btn-press" style={{padding: "9px 14px", borderRadius: "10px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 0 20px rgba(124,58,237,0.35)", border: "none", color: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600"}}>
              ⬇ PDF
            </button>
            <button onClick={handleReset} className="btn-press" style={{padding: "9px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#6b7280", cursor: "pointer", fontSize: "0.8rem"}}>
              ↺ Reset
            </button>
          </div>

          <div ref={portfolioRef} style={{display: "flex", flexDirection: "column", gap: "14px"}}>

            {/* Profile Hero Card */}
            <div style={{background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.06))", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "20px", padding: "28px", position: "relative", overflow: "hidden"}}>
              <div style={{position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(124,58,237,0.2), transparent)", borderRadius: "50%", pointerEvents: "none"}}></div>
              <div style={{display: "flex", alignItems: "center", gap: "16px", position: "relative", flexWrap: "wrap"}}>
                {githubProfile?.avatar_url && (
                  <img src={githubProfile.avatar_url} alt={username}
                    style={{width: "72px", height: "72px", borderRadius: "50%", border: "3px solid rgba(124,58,237,0.5)", boxShadow: "0 0 20px rgba(124,58,237,0.3)", flexShrink: 0}} />
                )}
                <div>
                  <p style={{color: "#a78bfa", fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "4px"}}>Developer Portfolio</p>
                  <h2 style={{fontSize: "clamp(1.3rem, 4vw, 2rem)", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "4px"}}>
                    {githubProfile?.name || username}
                  </h2>
                  <p style={{color: "#a78bfa", fontSize: "0.9rem", fontWeight: "500", marginBottom: "6px"}}>
                    {portfolio.title || "Software Developer"}
                  </p>
                  <div style={{display: "flex", gap: "12px", flexWrap: "wrap"}}>
                    <span style={{color: "#6b7280", fontSize: "0.8rem"}}>@{username}</span>
                    {githubProfile?.location && <span style={{color: "#6b7280", fontSize: "0.8rem"}}>📍 {githubProfile.location}</span>}
                    {githubProfile?.public_repos && <span style={{color: "#6b7280", fontSize: "0.8rem"}}>📦 {githubProfile.public_repos}</span>}
                    {githubProfile?.followers && <span style={{color: "#6b7280", fontSize: "0.8rem"}}>👥 {githubProfile.followers}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", padding: "24px"}}>
              <p style={{color: "#a78bfa", fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px"}}>Summary</p>
              <p style={{color: "#e5e7eb", lineHeight: "1.9", fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)"}}>{portfolio.bio}</p>
            </div>

            {/* Skills */}
            <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", padding: "24px"}}>
              <p style={{color: "#a78bfa", fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "14px"}}>Technical Skills</p>
              <div style={{display: "flex", flexWrap: "wrap", gap: "8px"}}>
                {portfolio.skills.map((skill, i) => (
                  <span key={i} style={{padding: "6px 14px", borderRadius: "999px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd", fontSize: "0.8rem", fontWeight: "500"}}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", padding: "24px"}}>
              <p style={{color: "#a78bfa", fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "18px"}}>Featured Projects</p>
              <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
                {portfolio.projects.map((project, i) => (
                  <div key={i} style={{background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px"}}>
                    <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px"}}>
                      <div style={{width: "28px", height: "28px", borderRadius: "7px", background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(219,39,119,0.2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "#a78bfa", fontWeight: "700", flexShrink: 0}}>
                        {i + 1}
                      </div>
                      <h4 style={{color: "white", fontWeight: "700", fontSize: "0.95rem"}}>{project.name}</h4>
                    </div>
                    <p style={{color: "#9ca3af", fontSize: "0.85rem", lineHeight: "1.7", paddingLeft: "38px"}}>{project.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Recruiter Feedback Button */}
          <div style={{marginTop: "28px", textAlign: "center"}}>
            <button onClick={handleGetFeedback} disabled={feedbackLoading} className="btn-press"
              style={{padding: "16px 32px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(219,39,119,0.1))", border: "1px solid rgba(124,58,237,0.4)", color: "#e5e7eb", cursor: "pointer", fontSize: "0.95rem", fontWeight: "700", boxShadow: "0 0 40px rgba(124,58,237,0.15)", width: "100%", maxWidth: "400px"}}>
              {feedbackLoading ? "🧠 Analyzing..." : "🧠 Get AI Recruiter Feedback"}
            </button>
            <p style={{color: "#4b5563", fontSize: "0.75rem", marginTop: "8px"}}>Get honest feedback on your strengths, weaknesses & how to improve</p>
          </div>

        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div style={{position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)"}} onClick={() => setShowShareModal(false)}>
          <div style={{background: "#0f0f1a", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "20px", padding: "24px", width: "100%", maxWidth: "440px", margin: "0 16px"}} onClick={(e) => e.stopPropagation()}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px"}}>
              <h3 style={{color: "white", fontWeight: "700", fontSize: "1.1rem"}}>Share Portfolio</h3>
              <button onClick={() => setShowShareModal(false)} className="btn-press" style={{background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "1.2rem"}}>✕</button>
            </div>
            <div style={{background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px"}}>
              <p style={{color: "#9ca3af", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{shareUrl}</p>
              <button className="btn-press" onClick={() => { navigator.clipboard.writeText(shareUrl); alert("Copied!"); }}
                style={{padding: "6px 12px", borderRadius: "8px", background: "rgba(124,58,237,0.3)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap"}}>
                Copy
              </button>
            </div>
            <p style={{color: "#6b7280", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px"}}>Share via</p>
            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px"}}>
              <a href={`https://wa.me/?text=Check out my AI-generated portfolio! ${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.25)", textDecoration: "none", color: "#4ade80", fontSize: "0.8rem", fontWeight: "600"}}>
                💬 WhatsApp
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.3)", textDecoration: "none", color: "#60a5fa", fontSize: "0.8rem", fontWeight: "600"}}>
                💼 LinkedIn
              </a>
              <a href={`mailto:?subject=Check out my developer portfolio&body=Check it out: ${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(234,67,53,0.08)", border: "1px solid rgba(234,67,53,0.25)", textDecoration: "none", color: "#f87171", fontSize: "0.8rem", fontWeight: "600"}}>
                📧 Email
              </a>
              <a href={`https://twitter.com/intent/tweet?text=Just generated my developer portfolio with AI! 🚀&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", color: "#e5e7eb", fontSize: "0.8rem", fontWeight: "600"}}>
                𝕏 Twitter
              </a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=Check out my AI-generated portfolio!`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(0,136,204,0.08)", border: "1px solid rgba(0,136,204,0.25)", textDecoration: "none", color: "#38bdf8", fontSize: "0.8rem", fontWeight: "600"}}>
                ✈️ Telegram
              </a>
              <a href={`https://outlook.live.com/mail/0/deeplink/compose?subject=My portfolio&body=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.25)", textDecoration: "none", color: "#60a5fa", fontSize: "0.8rem", fontWeight: "600"}}>
                📨 Outlook
              </a>
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      {step === "input" && (
        <div style={{maxWidth: "900px", margin: "60px auto 0", padding: "0 16px"}}>

          <div style={{textAlign: "center", marginBottom: "48px"}}>
            <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "14px"}}>What is PortfolioAI?</p>
            <h2 style={{fontSize: "clamp(1.6rem, 5vw, 2.5rem)", fontWeight: "800", marginBottom: "16px", lineHeight: "1.2"}}>
              Your GitHub repos,<br />
              <span style={{background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>
                turned into a portfolio
              </span>
            </h2>
            <p style={{color: "#9ca3af", fontSize: "0.95rem", maxWidth: "560px", margin: "0 auto", lineHeight: "1.8"}}>
              Most developers are terrible at writing about themselves. PortfolioAI reads your GitHub and uses AI to craft a professional portfolio that impresses recruiters — in seconds.
            </p>
          </div>

          <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "48px"}}>
            {[
              {icon: "🔍", step: "01", title: "Enter GitHub username", desc: "We fetch your public repos instantly. No login required."},
              {icon: "🤖", step: "02", title: "AI generates your portfolio", desc: "Bio, skills, and project writeups crafted in seconds."},
              {icon: "🚀", step: "03", title: "Share or download", desc: "Get a public link or download as PDF. Ready for recruiters."},
            ].map((item, i) => (
              <div key={i} style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px", padding: "24px"}}>
                <div style={{fontSize: "1.6rem", marginBottom: "10px"}}>{item.icon}</div>
                <p style={{color: "#6b7280", fontSize: "0.7rem", fontWeight: "700", marginBottom: "6px"}}>{item.step}</p>
                <h3 style={{color: "white", fontWeight: "700", marginBottom: "6px", fontSize: "0.95rem"}}>{item.title}</h3>
                <p style={{color: "#9ca3af", fontSize: "0.85rem", lineHeight: "1.6"}}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(219,39,119,0.04))", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "20px", padding: "32px", marginBottom: "48px"}}>
            <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "24px"}}>Everything You Need</p>
            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px"}}>
              {[
                {icon: "🤖", title: "AI-Generated Bio", desc: "Professional bio written from your actual GitHub activity."},
                {icon: "💼", title: "Project Writeups", desc: "Each project described professionally — even ones with no README."},
                {icon: "🎯", title: "Recruiter Feedback", desc: "AI scores your profile and tells you exactly how to improve."},
                {icon: "📄", title: "PDF Export", desc: "Download your portfolio as a PDF ready to attach to applications."},
                {icon: "🔗", title: "Shareable Link", desc: "Share via WhatsApp, LinkedIn, Twitter, Email and more."},
                {icon: "⚡", title: "Instant Generation", desc: "Full portfolio ready in under 10 seconds. No signup needed."},
              ].map((f, i) => (
                <div key={i} style={{display: "flex", gap: "12px", alignItems: "flex-start"}}>
                  <div style={{width: "36px", height: "36px", borderRadius: "9px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0}}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 style={{color: "white", fontWeight: "600", marginBottom: "3px", fontSize: "0.9rem"}}>{f.title}</h3>
                    <p style={{color: "#9ca3af", fontSize: "0.8rem", lineHeight: "1.5"}}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{textAlign: "center", marginBottom: "60px"}}>
            <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "14px"}}>Our Mission</p>
            <h2 style={{fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: "800", marginBottom: "14px"}}>Every developer deserves to be seen</h2>
            <p style={{color: "#9ca3af", fontSize: "0.95rem", maxWidth: "520px", margin: "0 auto", lineHeight: "1.8"}}>
              We built PortfolioAI because great developers were getting overlooked — not because of their skills, but because they could not present them well. We are fixing that.
            </p>
          </div>

        </div>
      )}

      {/* Footer */}
      <div style={{borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "32px", padding: "48px 20px 32px", background: "rgba(0,0,0,0.3)"}}>
        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "32px", maxWidth: "900px", margin: "0 auto 40px"}}>
          <div>
            <p style={{fontWeight: "800", fontSize: "1.2rem", marginBottom: "10px"}}>
              Portfolio<span style={{background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>AI</span>
            </p>
            <p style={{color: "#6b7280", fontSize: "0.8rem", lineHeight: "1.7", marginBottom: "16px"}}>
              Turn your GitHub repos into a stunning developer portfolio with AI. Free to use.
            </p>
          <div style={{display: "flex", gap: "10px"}}>
  {/* GitHub */}
  <a href="https://github.com/rimsal-beep/portfolioai" target="_blank" rel="noopener noreferrer"
    style={{width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none"}}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#9ca3af" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10.01 10.01 0 0022 12c0-5.52-4.48-10-10-10z"/>
    </svg>
  </a>

  {/* X / Twitter */}
  <a href="https://twitter.com/YOUR_HANDLE" target="_blank" rel="noopener noreferrer"
    style={{width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none"}}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#9ca3af" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  </a>

  {/* LinkedIn */}
  <a href="https://linkedin.com/in/YOUR_PROFILE" target="_blank" rel="noopener noreferrer"
    style={{width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none"}}>
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#9ca3af" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  </a>
</div>
          </div>
          <div>
            <p style={{color: "white", fontWeight: "600", fontSize: "0.875rem", marginBottom: "14px"}}>Product</p>
            <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
             {[{label: "Generate Portfolio", href: "/"}, {label: "How it Works", href: "#how-it-works"}, {label: "Features", href: "#features"}].map((l, i) => (
                <a key={i} href={l.href} style={{color: "#6b7280", fontSize: "0.8rem", textDecoration: "none"}}>{l.label}</a>
              ))}
            </div>
          </div>
          <div>
            <p style={{color: "white", fontWeight: "600", fontSize: "0.875rem", marginBottom: "14px"}}>Resources</p>
            <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
          {[
  {label: "GitHub Repo", href: "https://github.com/rimsal-beep/portfolioai"},
  {label: "Report a Bug", href: "mailto:YOUR_REAL_EMAIL@gmail.com"},
  {label: "Request Feature", href: "mailto:YOUR_REAL_EMAIL@gmail.com"},
].map((l, i) => (
                <a key={i} href={l.href} style={{color: "#6b7280", fontSize: "0.8rem", textDecoration: "none"}}>{l.label}</a>
              ))}
            </div>
          </div>
          <div>
            <p style={{color: "white", fontWeight: "600", fontSize: "0.875rem", marginBottom: "14px"}}>Built With</p>
            <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
              {["Next.js 14", "Groq AI", "Supabase", "GitHub OAuth"].map((t, i) => (
                <span key={i} style={{color: "#6b7280", fontSize: "0.8rem"}}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px", maxWidth: "900px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px"}}>
          <p style={{color: "#374151", fontSize: "0.75rem"}}>© 2025 PortfolioAI. Built for developers, by developers.</p>
          <p style={{color: "#374151", fontSize: "0.75rem"}}>Free to use · No signup required</p>
        </div>
      </div>

    </main>
  );
}