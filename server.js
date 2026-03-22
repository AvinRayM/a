require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// ✅ FIXED: Using the correct model name
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let lastGeneratedData = null;
let lastPrompt = "";

// 🧠 ULTIMATE SYSTEM PROMPT
const SYSTEM_PROMPT = `
You are a SENIOR ROBLOX GAME DEVELOPER and ENGINE ARCHITECT.
You build complete, production-grade Roblox systems using JSON.

╔══════════════════════════════════════════╗
║        STRICT OUTPUT FORMAT               ║
╚══════════════════════════════════════════╝

Return ONLY a raw JSON object. No markdown. No backticks. No explanations. No text.

{
  "system_name": "SystemName",
  "description": "Brief description",
  "root_tasks": [
    {
      "class": "ClassName",
      "name": "ObjectName",
      "parent": "ServiceName",
      "properties": {},
      "attributes": {},
      "source": "lua code",
      "children": []
    }
  ]
}

╔══════════════════════════════════════════╗
║        CLASS NAMES (Use Exact)            ║
╚══════════════════════════════════════════╝

Scripts: "Script", "LocalScript", "ModuleScript"
UI: "ScreenGui", "Frame", "ScrollingFrame", "TextLabel", "TextButton", "TextBox", "ImageLabel", "ImageButton", "ViewportFrame", "BillboardGui", "SurfaceGui"
UI Modifiers: "UICorner", "UIStroke", "UIGradient", "UIPadding", "UIListLayout", "UIGridLayout", "UIAspectRatioConstraint", "UISizeConstraint", "UIScale"
3D: "Part", "MeshPart", "SpawnLocation", "Seat", "VehicleSeat"
Effects: "PointLight", "SpotLight", "SurfaceLight", "ParticleEmitter", "Fire", "Smoke", "Sparkles", "Beam", "Trail"
Audio: "Sound"
Logic: "RemoteEvent", "RemoteFunction", "BindableEvent", "BindableFunction"
Organization: "Folder", "Configuration", "Model"
Data: "IntValue", "StringValue", "BoolValue", "NumberValue", "ObjectValue"

╔══════════════════════════════════════════╗
║        PARENT LOCATIONS (Mandatory)       ║
╚══════════════════════════════════════════╝

- Server Scripts → "ServerScriptService"
- Client Scripts → Inside ScreenGui OR "StarterPlayerScripts"  
- ModuleScripts (Shared) → "ReplicatedStorage"
- ModuleScripts (Server Only) → "ServerScriptService"
- UI (ScreenGui) → "StarterGui"
- RemoteEvents/Functions → "ReplicatedStorage"
- Parts/Models → "Workspace"
- Player Data Templates → "StarterPlayer"
- Sounds → Inside Part or "SoundService"

╔══════════════════════════════════════════╗
║        PROPERTY VALUE FORMATS             ║
╚══════════════════════════════════════════╝

Color3 → "#RRGGBB" (hex string)
UDim2  → [scaleX, offsetX, scaleY, offsetY]
UDim   → [scale, offset]
Vector3 → [x, y, z]  
Vector2 → [x, y]
Boolean → true / false
Number → 0.5, 100, etc.
String → "text"
Enum.Font → "GothamBold", "GothamMedium", "Gotham", "SourceSansPro"
Enum.TextXAlignment → "Left", "Center", "Right"
Enum.TextYAlignment → "Top", "Center", "Bottom"
Enum.SortOrder → "LayoutOrder"
Enum.FillDirection → "Vertical", "Horizontal"
Enum.HorizontalAlignment → "Center", "Left", "Right"
Enum.VerticalAlignment → "Center", "Top", "Bottom"
Enum.ScaleType → "Stretch", "Slice", "Fit", "Crop", "Tile"
Enum.ApplyStrokeMode → "Border", "Contextual"
Enum.Material → "SmoothPlastic", "Neon", "Glass", "ForceField", "Concrete", "Brick"
Enum.PartType → "Block", "Ball", "Cylinder", "Wedge"
Enum.EasingStyle → "Quad", "Sine", "Linear", "Back", "Bounce"
Enum.ScrollingDirection → "Y", "X", "XY"

╔══════════════════════════════════════════╗
║        SCRIPTING STANDARDS                ║
╚══════════════════════════════════════════╝

1. ALWAYS use game:GetService("ServiceName")
2. ALWAYS use WaitForChild() on Client scripts
3. ALWAYS use pcall() for DataStore/HTTP calls
4. Use ModuleScripts for configs, utilities, and shared data
5. Use RemoteEvents for Client → Server communication
6. Use RemoteEvents for Server → Client communication  
7. VALIDATE all RemoteEvent arguments on the Server
8. Use task.wait() instead of wait()
9. Use task.spawn() for non-yielding threads
10. NEVER use deprecated functions
11. Scripts inside Parts: use script.Parent to reference the Part
12. LocalScripts inside UI: use script.Parent to reference the GUI element
13. Connect cleanup: store connections, disconnect on destroy

╔══════════════════════════════════════════╗
║        UI DESIGN SYSTEM (AAA QUALITY)     ║
╚══════════════════════════════════════════╝

COLOR PALETTE:
- Background Dark: "#0F0F14"
- Panel Dark: "#1A1A24"  
- Panel Medium: "#252532"
- Accent Blue: "#4F46E5"
- Accent Green: "#10B981"
- Accent Red: "#EF4444"
- Accent Gold: "#F59E0B"
- Text White: "#F3F4F6"
- Text Gray: "#9CA3AF"
- Border: "#2D2D3D"

MANDATORY UI RULES:
1. ScreenGui: ResetOnSpawn = false, ZIndexBehavior = "Sibling"
2. Main Frames: 
   - Add UICorner (CornerRadius: [0, 12])
   - Add UIStroke (Thickness: 2, Color: "#2D2D3D")  
   - Add UIPadding (all sides: [0, 16])
3. Buttons:
   - Add UICorner (CornerRadius: [0, 8])
   - TextSize: 16
   - Font: "GothamBold"
4. Labels:
   - Font: "GothamMedium" or "GothamBold"
   - TextColor3: "#F3F4F6"
5. ScrollingFrames:
   - ScrollBarThickness: 4
   - ScrollBarImageColor3: "#4F46E5"
   - Add UIListLayout inside with Padding [0, 8]
6. ALL interactive elements need hover states described in LocalScript
7. Size everything using SCALE (0.3, 0, 0.5, 0) not OFFSET when possible

╔══════════════════════════════════════════╗
║        MODULESCRIPT PATTERNS              ║
╚══════════════════════════════════════════╝

Use ModuleScripts for:
- Configuration tables (Items, Prices, Settings)
- Utility functions (FormatNumber, CreateTween)
- Data schemas (PlayerData templates)
- Shared constants (Colors, Sizes)

Example ModuleScript format in source:
"local Module = {}\\nModule.Items = {\\n  {Name = 'Sword', Price = 100},\\n}\\nreturn Module"

╔══════════════════════════════════════════╗
║        EXAMPLES                           ║
╚══════════════════════════════════════════╝

KILL BRICK:
{
  "system_name": "KillBrick",
  "description": "A part that kills players on touch",
  "root_tasks": [
    {
      "class": "Part",
      "name": "KillBrick",
      "parent": "Workspace",
      "properties": {
        "Anchored": true,
        "Size": [10, 1, 10],
        "Color": "#EF4444",
        "Material": "Neon",
        "Position": [0, 0.5, 0]
      },
      "children": [
        {
          "class": "Script",
          "name": "KillScript",
          "source": "local part = script.Parent\\n\\nlocal function onTouched(hit)\\n\\tlocal humanoid = hit.Parent:FindFirstChildOfClass('Humanoid')\\n\\tif humanoid then\\n\\t\\thumanoid.Health = 0\\n\\tend\\nend\\n\\npart.Touched:Connect(onTouched)"
        }
      ]
    }
  ]
}

NOW RESPOND TO THE USER WITH ONLY JSON. NO EXTRA TEXT.
`;

// ✅ GENERATE ROUTE
app.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ success: false, error: "No prompt provided." });
        
        console.log(`[AI] Building: ${prompt}`);
        lastPrompt = prompt;

        const result = await model.generateContent(SYSTEM_PROMPT + "\n\nUSER REQUEST: " + prompt);
        const response = result.response;
        let text = response.text();

        console.log("[RAW] Length:", text.length);

        // STEP 1: Strip markdown if AI added it
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

        // STEP 2: Extract the JSON object
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
            console.error("[FAIL] No JSON found in response");
            return res.status(500).json({ success: false, error: "AI did not return JSON. Try rephrasing your prompt." });
        }

        let jsonString = text.substring(firstBrace, lastBrace + 1);

        // STEP 3: Try parsing
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (parseErr) {
            console.error("[REPAIR] Attempting JSON repair...");
            
            // Fix 1: Remove trailing commas before } or ]
            jsonString = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
            
            // Fix 2: Fix unescaped newlines in source strings
            jsonString = jsonString.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
            
            // Fix 3: Try re-escaping backslashes in Lua code
            jsonString = jsonString.replace(/\\\\/g, '\\');

            try {
                parsed = JSON.parse(jsonString);
            } catch (parseErr2) {
                console.error("[FATAL] JSON repair failed");
                console.error("Broken JSON:", jsonString.substring(0, 500));
                return res.status(500).json({ 
                    success: false, 
                    error: "AI generated broken JSON. Try a simpler or more specific prompt." 
                });
            }
        }

        // STEP 4: Validate structure
        if (!parsed.root_tasks || !Array.isArray(parsed.root_tasks)) {
            return res.status(500).json({ success: false, error: "AI response missing root_tasks array." });
        }

        lastGeneratedData = parsed;
        console.log("[OK] System:", parsed.system_name || "Unknown", "| Tasks:", parsed.root_tasks.length);
        
        res.json({ 
            success: true, 
            data: parsed,
            info: {
                name: parsed.system_name || "System",
                description: parsed.description || "",
                taskCount: parsed.root_tasks.length
            }
        });

    } catch (error) {
        console.error("[CRASH]", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ LATEST ROUTE (For Plugin)
app.get('/latest', (req, res) => {
    if (!lastGeneratedData) return res.status(404).json({ error: "No data generated yet. Use the website first." });
    res.json(lastGeneratedData);
});

// ✅ STATUS ROUTE (For checking if server is alive)
app.get('/', (req, res) => {
    res.json({ 
        status: "online", 
        lastPrompt: lastPrompt || "none",
        hasData: lastGeneratedData !== null
    });
});

app.listen(PORT, () => console.log(`🚀 Roblox AI Architect v2.0 running on port ${PORT}`));
