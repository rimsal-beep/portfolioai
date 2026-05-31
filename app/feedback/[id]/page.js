import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default async function FeedbackPage({ params }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return (
      <main style={{minHeight: "100vh", background: "#030712", color: "white", display: "flex", alignItems: "center", justifyContent: "center"}}>
        <p style={{color: "#9ca3af"}}>Feedback not found.</p>
      </main>
    );
  }

  const f = data.feedback || { score: "N/A", strengths: [], weaknesses: [], missing: [], suggestions: [], verdict: "Feedback not available." };

  return (
    <main style={{minHeight: "100vh", background: "#030712", color: "white", paddingBottom: "64px"}}>

      {/* Navbar */}
      <div style={{position: "sticky", top: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 48px", marginBottom: "48px", background: "rgba(3,7,18,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)"}}>
        <Link href="/" style={{fontSize: "1.3rem", fontWeight: "800", cursor: "pointer", textDecoration: "none"}}>
          Portfolio<span style={{background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>AI</span>
        </Link>
       <Link href="/" style={{padding: "10px 20px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#d1d5db", textDecoration: "none", fontSize: "0.875rem"}}>
  ← Generate New
</Link>
      </div>

      <div style={{maxWidth: "800px", margin: "0 auto", padding: "0 32px"}}>

        {/* Header */}
        <div style={{marginBottom: "40px"}}>
          <div style={{display: "inline-block", padding: "6px 16px", borderRadius: "999px", background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#a78bfa", fontSize: "0.75rem", fontWeight: "600", marginBottom: "16px"}}>
            🧠 AI Recruiter Analysis
          </div>
          <h1 style={{fontSize: "2.5rem", fontWeight: "800", marginBottom: "8px"}}>
            Feedback for <span style={{background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>@{data.username}</span>
          </h1>
          <p style={{color: "#9ca3af"}}>Here is how a senior tech recruiter would evaluate your profile.</p>
        </div>

        {/* Score */}
        <div style={{background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "20px", padding: "32px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "24px"}}>
          <div style={{fontSize: "5rem", fontWeight: "900", background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1}}>
            {f.score}
          </div>
          <div>
            <p style={{color: "white", fontWeight: "700", fontSize: "1.3rem"}}>Portfolio Score</p>
            <p style={{color: "#9ca3af", fontSize: "0.875rem", marginTop: "4px"}}>out of 10 — based on projects, skills, and presentation</p>
          </div>
        </div>

        {/* Verdict */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", marginBottom: "24px"}}>
          <p style={{color: "#a78bfa", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px"}}>Recruiter Verdict</p>
          <p style={{color: "#e5e7eb", lineHeight: "1.8", fontSize: "1.05rem", fontStyle: "italic"}}>&ldquo;{f.verdict}&rdquo;</p>
        </div>

        {/* Grid */}
       <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px"}}>

          <div style={{background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "16px", padding: "24px"}}>
            <h4 style={{color: "#4ade80", fontWeight: "700", marginBottom: "16px", fontSize: "1rem"}}>💪 Strengths</h4>
            {f.strengths.map((s, i) => (
              <div key={i} style={{display: "flex", gap: "10px", marginBottom: "10px", alignItems: "flex-start"}}>
                <span style={{color: "#4ade80", marginTop: "2px", fontWeight: "700"}}>✓</span>
                <p style={{color: "#d1d5db", fontSize: "0.9rem", lineHeight: "1.5"}}>{s}</p>
              </div>
            ))}
          </div>

          <div style={{background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "16px", padding: "24px"}}>
            <h4 style={{color: "#f87171", fontWeight: "700", marginBottom: "16px", fontSize: "1rem"}}>⚠️ Weaknesses</h4>
            {f.weaknesses.map((w, i) => (
              <div key={i} style={{display: "flex", gap: "10px", marginBottom: "10px", alignItems: "flex-start"}}>
                <span style={{color: "#f87171", marginTop: "2px", fontWeight: "700"}}>✗</span>
                <p style={{color: "#d1d5db", fontSize: "0.9rem", lineHeight: "1.5"}}>{w}</p>
              </div>
            ))}
          </div>

          <div style={{background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "16px", padding: "24px"}}>
            <h4 style={{color: "#facc15", fontWeight: "700", marginBottom: "16px", fontSize: "1rem"}}>📌 Missing</h4>
            {f.missing.map((m, i) => (
              <div key={i} style={{display: "flex", gap: "10px", marginBottom: "10px", alignItems: "flex-start"}}>
                <span style={{color: "#facc15", marginTop: "2px", fontWeight: "700"}}>!</span>
                <p style={{color: "#d1d5db", fontSize: "0.9rem", lineHeight: "1.5"}}>{m}</p>
              </div>
            ))}
          </div>

          <div style={{background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "16px", padding: "24px"}}>
            <h4 style={{color: "#60a5fa", fontWeight: "700", marginBottom: "16px", fontSize: "1rem"}}>💡 Suggestions</h4>
            {f.suggestions.map((s, i) => (
              <div key={i} style={{display: "flex", gap: "10px", marginBottom: "10px", alignItems: "flex-start"}}>
                <span style={{color: "#60a5fa", marginTop: "2px", fontWeight: "700"}}>→</span>
                <p style={{color: "#d1d5db", fontSize: "0.9rem", lineHeight: "1.5"}}>{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{textAlign: "center", padding: "32px", background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: "16px"}}>
          <p style={{color: "#9ca3af", marginBottom: "16px"}}>Want to improve your score? Generate a new portfolio after updating your GitHub.</p>
          <Link href="/" style={{display: "inline-block", padding: "12px 32px", borderRadius: "12px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "white", textDecoration: "none", fontWeight: "700", fontSize: "0.95rem"}}>
            Generate New Portfolio →
          </Link>
        </div>

      </div>
    </main>
  );
}