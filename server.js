import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';

// 1. Setup paths so the server knows where your folders are
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// 2. Middleware
app.use(cors({ origin: "*" })); 
app.use(express.json());

// 3. SERVICE THE UI (Fixes "Cannot GET /")
// This tells Express to look inside the 'public' folder for your index.html
app.use(express.static(path.join(__dirname, 'public')));

// 4. Force the home route to load your index.html from the public folder
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 5. MAIN AI GENERATION ENDPOINT
app.post("/api/generate", async (req, res) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("NEW REQUEST → Kindred is thinking...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        const { userQuery, systemPrompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ API KEY MISSING IN .ENV");
            return res.status(500).json({ error: "API Key Configuration Error" });
        }

        // Using the high-speed Gemini 2.5 Flash
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
You are Kindred, a writing assistant that sounds like a real person. 
Your goal is to be helpful, direct, and human.

RULES FOR "HUMAN" TONE:
1. NEVER use corporate jargon (no "commence", "utilize", "leverage", or "delve").
2. ALWAYS use contractions (use "I'm" instead of "I am", "don't" instead of "do not").
3. NO robotic intros (avoid "I hope this finds you well" or "As an AI...").
4. BE CONCISE. Real people don't use 50 words when 10 will do.
5. Follow the user's instructions LITERALLY and COMPLETELY.

### USER INPUT:
${userQuery}

### REQUESTED TONE:
${systemPrompt || "Natural and friendly"}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        topP: 0.95,
                        topK: 64,
                        maxOutputTokens: 2048,
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
            console.error("Gemini API Error:", data);
            return res.status(response.status).json({ error: "AI Service Error" });
        }

        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        console.log(`✅ SUCCESS - Text Generated (${generatedText.length} chars)`);
        res.json({ text: generatedText });

    } catch (err) {
        console.error("SERVER CRASH:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// 6. START SERVER
const PORT = process.env.PORT || 6060;
app.listen(PORT, () => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   KINDRED SERVER IS LIVE`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   UI Folder: /public`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
