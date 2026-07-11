"use server";

type ResumeScore = {
  skills: string[];
  yearsExperience: number;
  matchScore: number;
  suggestedStage: "APPLIED" | "SCREENING" | "TECHNICAL";
  summary: string;
};

export async function scoreResumeAgainstJob(
  resumeText: string,
  jobTitle: string,
  jobDescription: string
): Promise<ResumeScore | null> {
  if (!resumeText.trim()) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY missing from environment.");
    return null;
  }

  const prompt = `You are screening a resume for this job:

Title: ${jobTitle}
Description: ${jobDescription}

Resume text:
"""
${resumeText.slice(0, 8000)}
"""

Return ONLY a JSON object, no markdown, no preamble, matching exactly this shape:
{
  "skills": string[],
  "yearsExperience": number,
  "matchScore": number,
  "suggestedStage": "APPLIED" | "SCREENING" | "TECHNICAL",
  "summary": string (max 2 sentences)
}`;

  try {
   const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as ResumeScore;
  } catch (err) {
    console.error("Resume scoring failed:", err);
    return null;
  }
}