import jsPDF from "jspdf";

export async function POST(request) {
  const { portfolio, username } = await request.json();

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(109, 40, 217);
  doc.text(`@${username}`, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(139, 92, 246);
  doc.text("AI-Generated Portfolio", margin, y);
  y += 12;

  // Line
  doc.setDrawColor(109, 40, 217);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Bio
  doc.setFontSize(10);
  doc.setTextColor(109, 40, 217);
  doc.text("ABOUT", margin, y);
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  const bioLines = doc.splitTextToSize(portfolio.bio, maxWidth);
  doc.text(bioLines, margin, y);
  y += bioLines.length * 6 + 10;

  // Skills
  doc.setFontSize(10);
  doc.setTextColor(109, 40, 217);
  doc.text("SKILLS", margin, y);
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  const skillsText = portfolio.skills.join("  ·  ");
  const skillLines = doc.splitTextToSize(skillsText, maxWidth);
  doc.text(skillLines, margin, y);
  y += skillLines.length * 6 + 10;

  // Projects
  doc.setFontSize(10);
  doc.setTextColor(109, 40, 217);
  doc.text("PROJECTS", margin, y);
  y += 8;

  for (const project of portfolio.projects) {
    if (y > 260) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(project.name, margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(project.desc, maxWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 8;
  }

  const pdfBase64 = doc.output("datauristring");
  return Response.json({ pdf: pdfBase64 });
}