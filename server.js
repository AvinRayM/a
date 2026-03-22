require('dotenv').config();
const express = require('express');
const cors = require('cors'); // This allows Netlify to talk to Render
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for ALL domains (Netlify, Localhost, etc.)
app.use(cors()); 
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

let lastGeneratedData = null;

const SYSTEM_PROMPT = `
You are a ROBLOX ENGINE EXPERT.
RULES:
1. RESPONSE FORMAT: Return ONLY valid JSON.
2. STRUCTURE: { "tasks": [ { "type": "script"|"localscript"|"ui"|"part", "name": "...", "parent": "...", "source": "...", "properties": {...} } ] }
3. LUA: Use game:GetService(). UI must have UICorner.
`;

app.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log(`[AI] Processing: ${prompt}`);

        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUSER REQUEST: ${prompt}`);
        const response = await result.response;
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        const jsonResponse = JSON.parse(text);
        lastGeneratedData = jsonResponse;
        
        res.json({ success: true, data: jsonResponse });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Plugin endpoint
app.get('/latest', (req, res) => {
    if (!lastGeneratedData) return res.status(404).json({ error: "No data" });
    res.json(lastGeneratedData);
});

// Root endpoint just to check if server is alive
app.get('/', (req, res) => res.send('Roblox AI Backend is Running!'));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
