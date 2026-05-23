import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { username, portfolio } = await request.json();

    const { data, error } = await supabase
      .from("portfolios")
      .insert([{
        username,
        bio: portfolio.bio,
        skills: portfolio.skills.join(","),
        projects: portfolio.projects,
      }])
      .select();

    if (error) throw error;

    return Response.json({ id: data[0].id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}