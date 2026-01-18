import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: "*" })); // Allow all origins for local development (tighten in production)
app.use(express.json());
app.use(express.static("public"));

// Main generation endpoint
app.post("/api/generate", async (req, res) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("NEW REQUEST ARRIVED → /api/generate");
  console.log("Time:", new Date().toISOString());
  console.log("Received body:", req.body);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const { userQuery, systemPrompt } = req.body;

    // Basic validation
    if (!userQuery?.trim()) {
      console.log("→ REJECTING: Empty or missing userQuery");
      return res.status(400).json({
        error: "No input provided to Kindred.",
        received: req.body
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("❌ CRITICAL: GEMINI_API_KEY is missing in .env");
      return res.status(500).json({
        error: "Server configuration error - API key missing"
      });
    }

    // Using a currently available model (January 2026)
    // Options in order of recommendation:
    // 1. gemini-2.5-flash       ← fastest & cheapest, great quality
    // 2. gemini-2.5-pro         ← better reasoning & empathy
    // 3. gemini-1.5-flash       ← very stable fallback
    // 4. gemini-3-flash-preview ← experimental/newest (may require special access)

    const MODEL = "gemini-2.5-flash"; // ← Change here if you want to try another

    console.log(`→ Calling Gemini model: ${MODEL}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt || "You are a helpful assistant."}\n\n${userQuery}`
            }]
          }],
          generationConfig: {
            temperature: 0.75,          // 0.0 = focused, 1.0 = creative
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 1200,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      }
    );

    console.log(`← Gemini response status: ${response.status}`);

    const data = await response.json();

    // Log a preview of the response (truncate if huge)
    const preview = JSON.stringify(data, null, 2).slice(0, 800) + 
                    (JSON.stringify(data).length > 800 ? "..." : "");
    console.log("Gemini response preview:", preview);

    if (!response.ok) {
      console.error("Gemini API failed:", JSON.stringify(data, null, 2));
      return res.status(response.status).json({
        error: "AI Service Error",
        details: data
      });
    }

    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText?.trim()) {
      console.log("→ WARNING: No text generated (possible safety block)");
      return res.status(500).json({
        error: "AI returned no text. This usually happens due to safety filters."
      });
    }

    console.log(`→ SUCCESS - Generated text length: ${generatedText.length} chars`);

    res.json({ text: generatedText });

  } catch (err) {
    console.error("SERVER CRASH:", err.message);
    console.error(err.stack);
    res.status(500).json({
      error: "Internal server error",
      message: err.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 6060;
app.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   KINDRED SERVER IS RUNNING`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Model in use: gemini-2.5-flash`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
