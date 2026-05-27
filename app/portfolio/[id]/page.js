import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default async function PortfolioPage({ params }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return (
      <main style={{minHeight: "100vh", background: "#030712", color: "white", display: "flex", alignItems: "center", justifyContent: "center"}}>
        <p style={{color: "#9ca3af"}}>Portfolio not found.</p>
      </main>
    );
  }

  const skills = data.skills ? data.skills.split(",") : [];
  const projects = data.projects || [];

  return (
    <main style={{minHeight: "100vh", background: "#030712", color: "white", paddingBottom: "64px"}}>

      {/* Navbar */}
      <div style={{position: "sticky", top: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 48px", marginBottom: "48px", background: "rgba(3,7,18,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)"}}>
        <Link href="/" style={{fontSize: "1.3rem", fontWeight: "800", cursor: "pointer", textDecoration: "none", color: "white"}}>
          Portfolio<span style={{background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>AI</span>
        </Link>
        <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
          {data.feedback && (
            <Link href={`/feedback/${id}`} style={{padding: "10px 18px", borderRadius: "10px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", textDecoration: "none", fontSize: "0.875rem", fontWeight: "600"}}>
              🧠 View Feedback
            </Link>
          )}
          <Link href="/" style={{padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 0 20px rgba(124,58,237,0.3)", color: "white", textDecoration: "none", fontSize: "0.875rem", fontWeight: "600"}}>
            Generate Yours →
          </Link>
        </div>
      </div>

      <div style={{maxWidth: "860px", margin: "0 auto", padding: "0 32px"}}>

        {/* Profile Hero */}
        <div style={{background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.06))", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "24px", padding: "40px", marginBottom: "16px", position: "relative", overflow: "hidden"}}>
          <div style={{position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(124,58,237,0.2), transparent)", borderRadius: "50%", pointerEvents: "none"}}></div>
          <div style={{position: "relative"}}>
            <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px"}}>Developer Portfolio</p>
            <h1 style={{fontSize: "2.5rem", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "8px"}}>@{data.username}</h1>
            <p style={{color: "#6b7280", fontSize: "0.875rem"}}>AI-generated portfolio · PortfolioAI</p>
          </div>
        </div>

        {/* Bio */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px", marginBottom: "16px"}}>
          <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "14px"}}>Summary</p>
          <p style={{color: "#e5e7eb", lineHeight: "1.9", fontSize: "1.05rem"}}>{data.bio}</p>
        </div>

        {/* Skills */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px", marginBottom: "16px"}}>
          <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "16px"}}>Technical Skills</p>
          <div style={{display: "flex", flexWrap: "wrap", gap: "10px"}}>
            {skills.map((skill, i) => (
              <span key={i} style={{padding: "7px 16px", borderRadius: "999px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd", fontSize: "0.875rem", fontWeight: "500"}}>
                {skill.trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px", marginBottom: "32px"}}>
          <p style={{color: "#a78bfa", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "20px"}}>Featured Projects</p>
          <div style={{display: "flex", flexDirection: "column", gap: "14px"}}>
            {projects.map((project, i) => (
              <div key={i} style={{background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "20px"}}>
                <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px"}}>
                  <div style={{width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(219,39,119,0.2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", color: "#a78bfa", fontWeight: "700", flexShrink: 0}}>
                    {i + 1}
                  </div>
                  <h4 style={{color: "white", fontWeight: "700", fontSize: "1rem"}}>{project.name}</h4>
                </div>
                <p style={{color: "#9ca3af", fontSize: "0.9rem", lineHeight: "1.7", paddingLeft: "42px"}}>{project.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{textAlign: "center", padding: "40px", background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: "20px"}}>
          <p style={{color: "#9ca3af", marginBottom: "16px"}}>Want your own AI-generated portfolio?</p>
          <Link href="/" style={{display: "inline-block", padding: "14px 40px", borderRadius: "12px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 0 25px rgba(124,58,237,0.35)", color: "white", textDecoration: "none", fontWeight: "700"}}>
            Generate Mine →
          </Link>
        </div>

      </div>
    </main>
  );
}