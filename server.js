import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

app.use(cors()); 
app.use(express.json());
app.use(express.static("public"));

app.post("/api/generate", async (req, res) => {
  try {
    // FIX: We pull userQuery and systemPrompt which your HTML is now sending
    const { userQuery, systemPrompt } = req.body;

    // Validation
    if (!userQuery) {
        return res.status(400).json({ error: "No input provided to Kindred." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("❌ ERROR: GEMINI_API_KEY is missing in your .env file!");
      return res.status(500).json({ error: "Server configuration error (API Key missing)." });
    }

    // Calling Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ text: `${systemPrompt}\n\nUser Request: ${userQuery}` }] 
          }]
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", JSON.stringify(data, null, 2));
      return res.status(response.status).json({ error: "AI Service Error", details: data });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: "AI returned no text. This usually happens due to safety filters." });
    }

    // Success! Sending text back to your beautiful UI
    res.json({ text });
    
  } catch (err) {
    console.error("Critical Server Crash:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

const PORT = process.env.PORT || 6060;
app.listen(PORT, () => {
    console.log(`---`);
    console.log(`✅ KINDRED SERVER IS LIVE`);
    console.log(`🚀 URL: http://localhost:${PORT}`);
    console.log(`---`);
});