const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 10000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@00";

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let suggestions = [];
const filePath = path.join(__dirname, 'suggestions.json');
if (fs.existsSync(filePath)) {
  try { suggestions = JSON.parse(fs.readFileSync(filePath)); } catch(e){ suggestions = []; }
}

// PUBLIC: User can SUBMIT
app.post('/api/suggestions', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Empty" });
  const newSug = { id: Date.now(), text, date: new Date().toLocaleString(), anonymous: true };
  suggestions.push(newSug);
  fs.writeFileSync(filePath, JSON.stringify(suggestions, null, 2));
  res.json({ success: true, message: "Submitted anonymously" });
});

// ADMIN: Login check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false });
});

// ADMIN: Get all suggestions - PROTECTED
app.get('/api/admin/suggestions', (req, res) => {
  const auth = req.headers['x-admin-password'];
  if (auth !== ADMIN_PASSWORD) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  res.json(suggestions);
});
// ADMIN: Delete a suggestion - PROTECTED
app.delete('/api/admin/suggestions/:id', (req, res) => {
  const auth = req.headers['x-admin-password'];
  if (auth !== ADMIN_PASSWORD) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const id = Number(req.params.id);
  suggestions = suggestions.filter(s => s.id !== id);
  fs.writeFileSync(filePath, JSON.stringify(suggestions, null, 2));
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));