// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serves the web UI

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "Gemini 3.1 Pro" });

// Store the last generated JSON in memory
let lastGeneratedData = null;

const SYSTEM_PROMPT = `
You are a ROBLOX ENGINE EXPERT. You generate complete, functional Roblox systems in JSON format.
Your output will be parsed by a plugin to build games automatically.

RULES:
1. RESPONSE FORMAT: Return ONLY valid JSON. No markdown, no explanations.
2. STRUCTURE:
   {
     "tasks": [
       {
         "type": "script" | "localscript" | "module" | "remote" | "folder" | "ui",
         "name": "String",
         "parent": "String (Service or Parent Name)",
         "source": "Lua Code (For scripts)",
         "properties": { ... },
         "children": [ ... (For UI/Folders) ]
       }
     ]
   }

3. LUA CODING STANDARDS:
   - Use clean, professional Lua.
   - Scripts go in ServerScriptService.
   - LocalScripts go in StarterPlayerScripts.
   - UI goes in StarterGui.
   - RemoteEvents go in ReplicatedStorage.
   - ALWAYS include the specific UI creation in the JSON tree, do not write "Instance.new" in scripts for main UI.

4. UI DESIGN RULES (MANDATORY):
   - Modern Flat Design.
   - Use specific property formats:
     - Color3: Use hex strings (e.g. "#FF0000")
     - UDim2: Use arrays [scaleX, offsetX, scaleY, offsetY]
   - ALWAYS add "UICorner" (0, 8) to Frames and Buttons.
   - ALWAYS add "UIStroke" to main containers.
   - Use descriptive names (e.g., "CoinShopFrame", "PurchaseButton").
   - Center UI using AnchorPoint (0.5, 0.5) and Position (0.5, 0, 0.5, 0).

5. LOGIC:
   - Scripts must reference UI or Remotes correctly.
   - Ensure RemoteEvents are created if the script uses them.
`;

app.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log(`[AI] Processing: ${prompt}`);

        const fullPrompt = `${SYSTEM_PROMPT}\n\nUSER REQUEST: Create a ${prompt}`;
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown if Gemini adds it
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const jsonResponse = JSON.parse(text);
        lastGeneratedData = jsonResponse;

        res.json({ success: true, data: jsonResponse });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ success: false, error: "Failed to generate system." });
    }
});

app.get('/latest', (req, res) => {
    if (!lastGeneratedData) {
        return res.status(404).json({ error: "No data generated yet" });
    }
    res.json(lastGeneratedData);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 AI Server running on http://localhost:${PORT}`));
