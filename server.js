import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: "*" })); 
app.use(express.json());
app.use(express.static("public"));

// Main generation endpoint
app.post("/api/generate", async (req, res) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("NEW REQUEST ARRIVED → /api/generate");
  console.log("Received body:", req.body);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const { userQuery, systemPrompt } = req.body;

    // Basic validation
    if (!userQuery?.trim()) {
      return res.status(400).json({ error: "No input provided to Kindred." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ CRITICAL: GEMINI_API_KEY is missing in .env");
      return res.status(500).json({ error: "Server configuration error - API key missing" });
    }

    // Model selection: Using the ultra-fast and obedient Gemini 2.5 Flash
    const MODEL = "gemini-2.5-flash"; 

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `### SYSTEM INSTRUCTIONS:
You are an expert Writing Assistant. You must follow the user's instructions LITERALLY and COMPLETELY. 
- If the user asks for a specific number (e.g., 5 ideas), you MUST provide exactly that number.
- Adhere strictly to the requested tone.
- Do not be brief; provide full, high-quality content.

### USER INPUT:
${userQuery}

### TONE/ADDITIONAL CONTEXT:
${systemPrompt || "Helpful and professional assistant"}`
            }]
          }],
          generationConfig: {
            temperature: 0.9,       // Higher temperature prevents "laziness"
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 2048,  // Increased limit for long lists/essays
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API failed:", JSON.stringify(data, null, 2));
      return res.status(response.status).json({ error: "AI Service Error", details: data });
    }

    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText?.trim()) {
      return res.status(500).json({ error: "AI returned no text. This usually happens due to safety filters." });
    }

    console.log(`→ SUCCESS - Generated text length: ${generatedText.length} chars`);
    res.json({ text: generatedText });

  } catch (err) {
    console.error("SERVER CRASH:", err.message);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 6060;
app.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   KINDRED SERVER IS RUNNING`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Model: Gemini 2.5 Flash (Active)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
