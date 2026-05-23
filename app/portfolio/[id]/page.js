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
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Portfolio not found.</p>
      </main>
    );
  }

  const skills = data.skills ? data.skills.split(",") : [];
  const projects = data.projects || [];

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-16">

      {/* Navbar */}
      <div className="flex justify-between items-center px-8 py-4 bg-gray-900 border-b border-gray-800 mb-12">
        <h2 className="text-xl font-bold">
          Portfolio<span className="text-violet-500">AI</span>
        </h2>
       <Link href="/" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-semibold transition-colors">
  Generate Yours →
</Link>
      </div>

      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">@{data.username}</h1>
          <p className="text-violet-400 text-sm mt-1">AI-generated portfolio</p>
        </div>

        {/* Bio */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">About</h3>
          <p className="text-gray-200 leading-relaxed text-lg">{data.bio}</p>
        </div>

        {/* Skills */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
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
            {projects.map((project, i) => (
              <div key={i} className="border border-gray-700 rounded-lg p-4 hover:border-violet-700/50 transition-colors">
                <h4 className="font-semibold text-white mb-1">{project.name}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{project.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}