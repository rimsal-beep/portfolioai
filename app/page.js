"use client";
import { useState, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

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

    if (current === "title" && line) sections.title = line;
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
  const portfolioRef = useRef(null);
  const [sharedId, setSharedId] = useState(null);
const [showShareModal, setShowShareModal] = useState(false);
const [shareUrl, setShareUrl] = useState("");
const [githubProfile, setGithubProfile] = useState(null);

 async function handleFetchRepos() {
  if (!username) return;
  setLoading(true);
  setError("");
  setRepos([]);
  setPortfolio(null);
  try {
    const [reposRes, profileRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=6`),
      fetch(`https://api.github.com/users/${username}`)
    ]);
    if (!reposRes.ok) throw new Error("GitHub user not found");
    const reposData = await reposRes.json();
    const profileData = await profileRes.json();
    setRepos(reposData);
    setGithubProfile(profileData);
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
      body: JSON.stringify({ repos, username, profile: githubProfile }),
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
    // First save portfolio to get an ID
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

    // Redirect to feedback page
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
    setFeedback(null);
  }

  return (
    <main className="min-h-screen gradient-bg text-white pb-16">

  {/* Navbar */}
      <div style={{position: "sticky", top: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 48px", marginBottom: "48px", background: "rgba(3,7,18,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)"}}>
        <h2 onClick={handleReset} style={{fontSize: "1.3rem", fontWeight: "800", cursor: "pointer", letterSpacing: "-0.02em"}}>
          Portfolio<span style={{background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>AI</span>
        </h2>
        {session ? (
          <div style={{display: "flex", alignItems: "center", gap: "16px"}}>
            <img src={session.user.image} style={{width: "34px", height: "34px", borderRadius: "50%", border: "2px solid rgba(168,85,247,0.5)"}} />
            <span style={{color: "#d1d5db", fontSize: "0.9rem"}}>{session.user.name}</span>
            <button onClick={() => signOut()} className="btn-press" style={{color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem"}}>
              Sign out
            </button>
          </div>
        ) : (
          <button onClick={() => signIn("github", { prompt: "select_account" })}  className="btn-press" style={{padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 0 20px rgba(124,58,237,0.4)", border: "none", color: "white", fontWeight: "600", cursor: "pointer", fontSize: "0.875rem"}}>
            Sign in with GitHub
          </button>
        )}
      </div>

     {/* STEP 1 — Input */}
      {step === "input" && (
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 24px 0"}}>
          <div style={{textAlign: "center", marginBottom: "40px"}}>
            <div style={{display: "inline-block", padding: "6px 16px", borderRadius: "999px", background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#a78bfa", fontSize: "0.75rem", fontWeight: "600", marginBottom: "24px"}}>
              ✨ AI-Powered Portfolio Generator
            </div>
            <h1 style={{fontSize: "3.8rem", fontWeight: "800", lineHeight: "1.1", marginBottom: "16px"}}>
              Generate Your<br />
              <span style={{background: "linear-gradient(135deg,#a855f7,#ec4899,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>
                Dream Portfolio
              </span>
            </h1>
            <p style={{color: "#9ca3af", fontSize: "1.1rem", maxWidth: "480px", margin: "0 auto 40px"}}>
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
              style={{width: "100%", padding: "16px 20px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: "1rem", marginBottom: "12px", outline: "none", boxSizing: "border-box"}}
            />
            <button
              onClick={handleFetchRepos}
              disabled={loading}
              className="btn-press"
              style={{width: "100%", padding: "16px", borderRadius: "12px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 0 30px rgba(124,58,237,0.5)", border: "none", color: "white", fontSize: "1rem", fontWeight: "700", cursor: "pointer", opacity: loading ? 0.5 : 1}}
            >
              {loading ? "Fetching repos..." : "Fetch GitHub Repos →"}
            </button>
            {error && <p style={{color: "#f87171", textAlign: "center", marginTop: "12px"}}>{error}</p>}
          </div>
     <div style={{display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px", marginTop: "48px"}}>
  {[
    {icon: "🤖", label: "AI-Generated Bio"},
    {icon: "💼", label: "Project Writeups"},
    {icon: "🎯", label: "Recruiter Feedback"},
    {icon: "📄", label: "PDF Export"},
    {icon: "🔗", label: "Shareable Link"},
  ].map((f, i) => (
    <div key={i} style={{display: "flex", alignItems: "center", gap: "8px", color: "#6b7280", fontSize: "0.875rem"}}>
      <span style={{fontSize: "1.1rem"}}>{f.icon}</span>
      <span>{f.label}</span>
    </div>
  ))}
</div>
        </div>
      )}

      {/* STEP 2 — Repos */}
      {step === "repos" && (
        <div style={{maxWidth: "700px", margin: "0 auto", padding: "0 32px"}}>
          <div style={{marginBottom: "32px"}}>
            <h2 style={{fontSize: "2rem", fontWeight: "700", marginBottom: "8px"}}>
              Found <span style={{background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>{repos.length} repos</span> for @{username}
            </h2>
            <p style={{color: "#9ca3af"}}>These will be used to generate your AI portfolio.</p>
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px"}}>
            {repos.map((repo) => (
              <div key={repo.id} style={{background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "16px"}}>
                <h3 style={{color: "#a78bfa", fontWeight: "600", marginBottom: "6px"}}>{repo.name}</h3>
                <p style={{color: "#9ca3af", fontSize: "0.875rem", marginBottom: "12px"}}>{repo.description || "No description"}</p>
                <div style={{display: "flex", gap: "16px", fontSize: "0.8rem", color: "#6b7280"}}>
                  <span>⭐ {repo.stargazers_count}</span>
                  <span>🍴 {repo.forks_count}</span>
                  {repo.language && <span>💻 {repo.language}</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{display: "flex", gap: "16px"}}>
            <button onClick={handleReset} className="btn-press" style={{padding: "12px 24px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#d1d5db", cursor: "pointer", fontWeight: "600"}}>
              ← Back
            </button>
            <button onClick={handleGeneratePortfolio} className="btn-press" disabled={loading} style={{flex: 1, padding: "12px", borderRadius: "12px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 0 25px rgba(124,58,237,0.4)", border: "none", color: "white", cursor: "pointer", fontWeight: "700", fontSize: "1rem", opacity: loading ? 0.5 : 1}}>
              {loading ? "✨ Generating with AI..." : "✨ Generate Portfolio"}
            </button>
          </div>
          {error && <p style={{color: "#f87171", marginTop: "16px"}}>{error}</p>}
        </div>
      )}
{/* STEP 3 — Portfolio Output */}
      {step === "portfolio" && portfolio && (
        <div style={{maxWidth: "860px", margin: "0 auto", padding: "0 32px"}}>

          {/* Action buttons */}
          <div style={{display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "32px", flexWrap: "wrap"}}>
            <button onClick={handleSaveAndShare} className="btn-press" style={{padding: "10px 18px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#d1d5db", cursor: "pointer", fontSize: "0.85rem", fontWeight: "500"}}>
              🔗 Share
            </button>
            <button onClick={handleDownloadPDF} className="btn-press" style={{padding: "10px 18px", borderRadius: "10px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 0 20px rgba(124,58,237,0.35)", border: "none", color: "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600"}}>
              ⬇ Download PDF
            </button>
            <button onClick={handleReset} className="btn-press" style={{padding: "10px 18px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#6b7280", cursor: "pointer", fontSize: "0.85rem"}}>
              ↺ Start Over
            </button>
          </div>

          <div ref={portfolioRef} style={{display: "flex", flexDirection: "column", gap: "16px"}}>

            {/* Profile Hero Card */}
            <div style={{background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.06))", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "24px", padding: "40px", position: "relative", overflow: "hidden"}}>
              {/* Background glow */}
              <div style={{position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(124,58,237,0.2), transparent)", borderRadius: "50%", pointerEvents: "none"}}></div>
              <div style={{position: "absolute", bottom: "-40px", left: "-40px", width: "150px", height: "150px", background: "radial-gradient(circle, rgba(219,39,119,0.1), transparent)", borderRadius: "50%", pointerEvents: "none"}}></div>

              <div style={{display: "flex", alignItems: "center", gap: "28px", position: "relative"}}>
                {/* Avatar */}
                {githubProfile?.avatar_url && (
                  <img
                    src={githubProfile.avatar_url}
                    alt={username}
                    style={{width: "100px", height: "100px", borderRadius: "50%", border: "3px solid rgba(124,58,237,0.5)", boxShadow: "0 0 30px rgba(124,58,237,0.3)", flexShrink: 0}}
                  />
                )}
                <div>
                  <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "6px"}}>Developer Portfolio</p>
                  <h2 style={{fontSize: "2rem", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "4px"}}>
                    {githubProfile?.name || username}
                  </h2>
                  <p style={{color: "#a78bfa", fontSize: "1rem", fontWeight: "500", marginBottom: "8px"}}>
                    {portfolio.title || "Software Developer"}
                  </p>
                  <div style={{display: "flex", gap: "16px", flexWrap: "wrap"}}>
                    <span style={{color: "#6b7280", fontSize: "0.85rem"}}>@{username}</span>
                    {githubProfile?.location && <span style={{color: "#6b7280", fontSize: "0.85rem"}}>📍 {githubProfile.location}</span>}
                    {githubProfile?.public_repos && <span style={{color: "#6b7280", fontSize: "0.85rem"}}>📦 {githubProfile.public_repos} repos</span>}
                    {githubProfile?.followers && <span style={{color: "#6b7280", fontSize: "0.85rem"}}>👥 {githubProfile.followers} followers</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px"}}>
              <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "14px"}}>Summary</p>
              <p style={{color: "#e5e7eb", lineHeight: "1.9", fontSize: "1.05rem"}}>{portfolio.bio}</p>
            </div>

            {/* Skills */}
            <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px"}}>
              <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "16px"}}>Technical Skills</p>
              <div style={{display: "flex", flexWrap: "wrap", gap: "10px"}}>
                {portfolio.skills.map((skill, i) => (
                  <span key={i} style={{padding: "7px 16px", borderRadius: "999px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd", fontSize: "0.875rem", fontWeight: "500"}}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px"}}>
              <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "20px"}}>Featured Projects</p>
              <div style={{display: "flex", flexDirection: "column", gap: "14px"}}>
                {portfolio.projects.map((project, i) => (
                  <div key={i} style={{background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "20px"}}>
                    <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px"}}>
                      <div style={{width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(219,39,119,0.2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", flexShrink: 0}}>
                        {i + 1}
                      </div>
                      <h4 style={{color: "white", fontWeight: "700", fontSize: "1rem"}}>{project.name}</h4>
                    </div>
                    <p style={{color: "#9ca3af", fontSize: "0.9rem", lineHeight: "1.7", paddingLeft: "42px"}}>{project.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Recruiter Feedback Button */}
          <div style={{marginTop: "32px", textAlign: "center"}}>
            <button
              onClick={handleGetFeedback}
              disabled={feedbackLoading}
              className="btn-press"
              style={{padding: "18px 48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(219,39,119,0.1))", border: "1px solid rgba(124,58,237,0.4)", color: "#e5e7eb", cursor: "pointer", fontSize: "1rem", fontWeight: "700", boxShadow: "0 0 40px rgba(124,58,237,0.15)"}}
            >
              {feedbackLoading ? "🧠 Analyzing your profile..." : "🧠 Get AI Recruiter Feedback"}
            </button>
            <p style={{color: "#4b5563", fontSize: "0.8rem", marginTop: "10px"}}>Get honest feedback on your strengths, weaknesses & how to get hired faster</p>
          </div>

        </div>
      )}
      {/* Share Modal */}
      {showShareModal && (
        <div style={{position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)"}} onClick={() => setShowShareModal(false)}>
          <div style={{background: "#0f0f1a", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "440px", margin: "0 24px"}} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px"}}>
              <h3 style={{color: "white", fontWeight: "700", fontSize: "1.1rem"}}>Share Portfolio</h3>
              <button onClick={() => setShowShareModal(false)} className="btn-press" style={{background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "1.2rem"}}>✕</button>
            </div>

            {/* URL Preview */}
            <div style={{background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px 16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px"}}>
              <p style={{color: "#9ca3af", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{shareUrl}</p>
              <button
                className="btn-press"
                onClick={() => { navigator.clipboard.writeText(shareUrl); alert("Copied!"); }}
                style={{padding: "6px 12px", borderRadius: "8px", background: "rgba(124,58,237,0.3)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap"}}
              >
                Copy
              </button>
            </div>

            {/* Share buttons */}
            <p style={{color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px"}}>Share via</p>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>

              {/* WhatsApp */}
              <a href={`https://wa.me/?text=Check out my AI-generated portfolio! ${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.25)", textDecoration: "none", color: "#4ade80", fontSize: "0.875rem", fontWeight: "600"}}>
                <span style={{fontSize: "1.2rem"}}>💬</span> WhatsApp
              </a>

              {/* LinkedIn */}
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.3)", textDecoration: "none", color: "#60a5fa", fontSize: "0.875rem", fontWeight: "600"}}>
                <span style={{fontSize: "1.2rem"}}>💼</span> LinkedIn
              </a>

              {/* Gmail */}
              <a href={`mailto:?subject=Check out my developer portfolio&body=I generated my portfolio using PortfolioAI! Check it out: ${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", background: "rgba(234,67,53,0.08)", border: "1px solid rgba(234,67,53,0.25)", textDecoration: "none", color: "#f87171", fontSize: "0.875rem", fontWeight: "600"}}>
                <span style={{fontSize: "1.2rem"}}>📧</span> Email
              </a>

              {/* Twitter/X */}
              <a href={`https://twitter.com/intent/tweet?text=Just generated my developer portfolio with AI! Check it out 🚀&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", color: "#e5e7eb", fontSize: "0.875rem", fontWeight: "600"}}>
                <span style={{fontSize: "1.2rem"}}>𝕏</span> Twitter
              </a>

              {/* Telegram */}
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=Check out my AI-generated developer portfolio!`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", background: "rgba(0,136,204,0.08)", border: "1px solid rgba(0,136,204,0.25)", textDecoration: "none", color: "#38bdf8", fontSize: "0.875rem", fontWeight: "600"}}>
                <span style={{fontSize: "1.2rem"}}>✈️</span> Telegram
              </a>

              {/* Outlook */}
              <a href={`https://outlook.live.com/mail/0/deeplink/compose?subject=Check out my developer portfolio&body=I generated my portfolio using PortfolioAI! ${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-press"
                style={{display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.25)", textDecoration: "none", color: "#60a5fa", fontSize: "0.875rem", fontWeight: "600"}}>
                <span style={{fontSize: "1.2rem"}}>📨</span> Outlook
              </a>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}