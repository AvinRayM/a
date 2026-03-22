require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase limit to 50MB for massive AI responses
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

let lastGeneratedData = null;

const SYSTEM_PROMPT = `
You are a ROBLOX ENGINE ARCHITECT.
You must output a SINGLE valid JSON object.

RULES:
1. NO Markdown. NO Explanations. NO text before or after the JSON.
2. If the user asks for "Best" or "Long", generate fully functional, professional scripts.
3. STRUCTURE:
{
  "root_tasks": [
    {
      "class": "ClassName",
      "name": "Name",
      "parent": "ParentService",
      "properties": { "Color": "#FF0000", "Size": [4,1,4], "Anchored": true },
      "source": "Lua Code Here",
      "children": [ ... ]
    }
  ]
}
4. MODULES: Use ModuleScripts in ReplicatedStorage for complex logic.
5. UI: Use UICorner, UIStroke, and UIGradient.
`;

app.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log(`[AI] Processing Heavy Request: ${prompt}`);

        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUSER REQUEST: ${prompt}`);
        const response = await result.response;
        let text = response.text();

        console.log("[AI] Raw Response Length:", text.length);

        // 1. EXTRACT JSON ONLY (Removes "Here is your code..." chat)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error("AI did not return JSON. It returned text/chat instead.");
        }

        let cleanJson = jsonMatch[0];

        // 2. PARSE JSON
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Failed. Attempting repair...");
            // If AI forgot the last '}', add it
            if (!cleanJson.trim().endsWith("}")) {
                cleanJson += "]} }"; // Try to close root task
                try {
                     jsonResponse = JSON.parse(cleanJson);
                } catch (e2) {
                    throw new Error("AI generated broken JSON. Try a simpler prompt or try again.");
                }
            } else {
                 throw new Error("JSON Syntax Error in AI response.");
            }
        }

        lastGeneratedData = jsonResponse;
        res.json({ success: true, data: jsonResponse });

    } catch (error) {
        console.error("CRITICAL ERROR:", error.message);
        // Send the ACTUAL error to the frontend so you can see it
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/latest', (req, res) => {
    if (!lastGeneratedData) return res.status(404).json({ error: "No data" });
    res.json(lastGeneratedData);
});

app.listen(PORT, () => console.log(`🚀 Pro Server Running on ${PORT}`));
