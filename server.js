require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow large AI responses

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

let lastGeneratedData = null;

// 🧠 THE "GOD MODE" PROMPT
const SYSTEM_PROMPT = `
You are a ROBLOX ENGINE ARCHITECT (Senior Level). 
You do not write basic code. You write PRODUCTION-READY, MODULAR, SCALABLE systems.

### 1. ARCHITECTURE RULES
- **Modularization:** Use 'ModuleScripts' in ReplicatedStorage for shared logic (DataTypes, Configs).
- **Security:** Never trust the client. Validate all RemoteEvent arguments on the Server.
- **Safety:** Always use 'WaitForChild()' on the client. Always use 'pcall' for DataStore or HTTP calls.
- **Cleanup:** Scripts should clean up connections if destroyed (basic Maid pattern).

### 2. UI DESIGN STANDARDS (MANDATORY)
- **Style:** Modern, Flat, Minimalist. Dark Mode by default.
- **Components:**
  - ALWAYS use 'UICorner' (CornerRadius: 0, 8).
  - ALWAYS use 'UIStroke' (Thickness: 2, ApplyStrokeMode: Border).
  - ALWAYS use 'UIPadding' inside frames.
  - ALWAYS use 'UIListLayout' or 'UIGridLayout' for organizing lists.
- **Positioning:** Use AnchorPoint(0.5, 0.5) and Position(0.5, 0, 0.5, 0) to center elements perfectly.
- **Colors:** Use pleasing Hex colors (e.g., Background: #1E1E24, Accent: #4F46E5, Text: #F3F4F6).

### 3. OUTPUT JSON STRUCTURE
Return a SINGLE JSON object.
{
  "root_tasks": [
    {
      "class": "ClassName",
      "name": "Name",
      "parent": "ParentService", 
      "properties": { "PropName": "Value" },
      "attributes": { "AttrKey": "AttrValue" }, 
      "tags": ["Tag1", "Tag2"],
      "source": "LUA CODE HERE...",
      "children": [ ...recursive... ]
    }
  ]
}

### 4. DATA TYPE FORMATS
- **Color3:** "#RRGGBB" (Hex String)
- **Vector3:** [x, y, z]
- **UDim2:** [scaleX, offsetX, scaleY, offsetY]
- **Enum:** String name of EnumItem (e.g., "GothamBold", "MouseButton1")

### USER PROMPT HANDLING
If the user asks for a complex system (e.g. "Shop"), generate:
1. A **ModuleScript** (Config) in ReplicatedStorage.
2. A **RemoteEvent** in ReplicatedStorage.
3. A **ServerScript** in ServerScriptService (Using the Module).
4. A **ScreenGui** in StarterGui with LocalScript (Using the Module).

WRITE EXTENSIVE, PROFESSIONAL LUA CODE.
`;

app.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log(`[AI] Architecting High-Level System: ${prompt}`);

        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUSER REQUEST: ${prompt}`);
        const response = await result.response;
        
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        // JSON Repair Logic
        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first !== -1 && last !== -1) text = text.substring(first, last + 1);

        const jsonResponse = JSON.parse(text);
        lastGeneratedData = jsonResponse;
        
        res.json({ success: true, data: jsonResponse });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ success: false, error: "AI complexity limit reached or invalid format." });
    }
});

app.get('/latest', (req, res) => {
    if (!lastGeneratedData) return res.status(404).json({ error: "No data" });
    res.json(lastGeneratedData);
});

app.listen(PORT, () => console.log(`🚀 Pro Architect running on port ${PORT}`));
