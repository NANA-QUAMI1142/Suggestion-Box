import express from "express"; 
import Database from "better-sqlite3"; 
import path from "path"; 
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url)); 
const app = express(); 


// --- Database setup --
const db = new Database(path.join(__dirname, "suggestions.db")); 
db.pragma("journal_mode = WAL");

db.exec(`  
    CREATE TABLE IF NOT EXISTS suggestions (    
    id TEXT PRIMARY KEY,    
    text TEXT NOT NULL,    
    anon INTEGER NOT NULL,    
    submitter TEXT,    
    status TEXT NOT NULL DEFAULT 'Submitted',    
    created_at TEXT NOT NULL 
    );

    CREATE TABLE IF NOT EXISTS audit_log (    
    id INTEGER PRIMARY KEY AUTOINCREMENT,    
    suggestion_id TEXT NOT NULL,    
    action TEXT NOT NULL,    
    at TEXT NOT NULL,    
    FOREIGN KEY (suggestion_id) REFERENCES suggestions(id)  
      ); 
`);

function nextId() {  
    const row = db.prepare("SELECT COUNT(*) AS n FROM suggestions").get();  
    return `SB-${String(row.n + 1).padStart(4, "0")}`; 
} 
    function addLog(suggestionId, action) {  
        db.prepare(    
            "INSERT INTO audit_log (suggestion_id, action, at) VALUES (?, ?, ?)"  
        ).run(suggestionId, action, new Date().toISOString()); 
    }

    // --- Middleware ---
    app.use(express.json()); 
    // NOTE: role comes from a header for this demo only. It is NOT authentication —
    // anyone can set this header to anything. Swap this for real login + sessions 
    // before this touches anything sensitive. See the note at the bottom of this file. 
    function getRole(req) {
     const role = req.header("x-role");  
     return ["submitter", "reviewer", "admin"].includes(role) ? role : "submitter";
    }

    // --- API routes ---

    // List suggestions, with identity redacted for non-admins 
    app.get("/api/suggestions", (req, res) => { 
        const role = getRole(req);  const rows = db    
        .prepare("SELECT * FROM suggestions ORDER BY created_at DESC")    
        .all();
    

    const shaped = rows.map((r) => {    
        let who = "Anonymous";    
        if (!r.anon) who = role === "admin" ? r.submitter : "Identity withheld";    
        const log = db      
        .prepare("SELECT action AS a, at AS t FROM audit_log WHERE suggestion_id = ? ORDER BY id ASC")      
        .all(r.id);    
        return {      
            id: r.id,      
            text: r.text,      
            anon: !!r.anon,      
            status: r.status,      
            who,     
            log,    
        };  
    });

      res.json(shaped);
      });

      // Submit a new suggestion 
      app.post("/api/suggestions", (req, res) => {  
        const { text, anon, submitter } = req.body;  
        if (!text || typeof text !== "string" || !text.trim()) {    
            return res.status(400).json({ error: "Suggestion text is required." });  
        }  
        const id = nextId();  
        const now = new Date().toISOString();
         const isAnon = anon !== false;  
         const who = isAnon ? null : (submitter || "Unnamed submitter").slice(0, 100);  
         db.prepare(    
            "INSERT INTO suggestions (id, text, anon, submitter, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"  )
            .run(id, text.trim().slice(0, 2000), isAnon ? 1 : 0, who, "Submitted", now);  
            addLog(id, isAnon ? "Submitted (anonymous)" : `Submitted by ${who}`);  
            res.status(201).json({ id }); 
        });

        // Update status (reviewer/admin only) 
        const VALID_STATUSES = ["Submitted", "Under review", "Actioned", "Closed"]; 
        app.patch("/api/suggestions/:id/status", (req, res) => {  const role = getRole(req);  
            if (role === "submitter") {    
                return res.status(403).json({ error: "Submitters cannot change status." });  
            }  
            const { status } = req.body;  
            if (!VALID_STATUSES.includes(status)) {    
                return res.status(400).json({ error: "Invalid status." });  
            }  
            const existing = db.prepare("SELECT id FROM suggestions WHERE id = ?").get(req.params.id);  
            if (!existing) return res.status(404).json({ error: "Not found." });  
            db.prepare("UPDATE suggestions SET status = ? WHERE id = ?").run(status, req.params.id);  
            addLog(req.params.id, `Moved to ${status.toLowerCase()} by ${role}`);  res.json({ ok: true }); 
        });

        // --- Serve built frontend ---
        app.use(express.static(path.join(__dirname, "public"))); 
        app.get("*", (req, res) => {  
            res.sendFile(path.join(__dirname, "public", "index.html")); 
        }); 

        const PORT = process.env.PORT || 4000;
        app.listen(PORT, "0.0.0.0", () => {  
            console.log(`Suggestion system running on http://0.0.0.0:${PORT}`);
         }); 
         // SECURITY NOTE for the write-up: this demo trusts an x-role header, which 
         // means anyone with browser dev tools can claim to be an admin. That's fine
         // for a proof-of-concept on a private network, but before real deployment 
         // you'd replace getRole() with actual login (sessions or JWT) tied to a
         // real user/role table, and put the server behind HTTPS.
         