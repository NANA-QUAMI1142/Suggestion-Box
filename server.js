const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Your admin password 
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@00';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- PERSISTENT STORAGE SETUP ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const filePath = path.join(dataDir, 'suggestions.json');

let suggestions = [];
if (fs.existsSync(filePath)) {
  try {
    suggestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    suggestions = [];
  }
}

function saveSuggestions() {
  fs.writeFileSync(filePath, JSON.stringify(suggestions, null, 2));
}

function cleanOldSuggestions() {
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const before = suggestions.length;
  suggestions = suggestions.filter(s => {
    try {
      const t = new Date(s.date).getTime();
      return (now - t) < THREE_DAYS;
    } catch(e) { return true; }
  });
  if (suggestions.length !== before) {
    saveSuggestions();
    console.log(`Auto-cleaned ${before - suggestions.length} old suggestions (>3 days)`);
  }
}

// Clean on start and every hour
cleanOldSuggestions();
setInterval(cleanOldSuggestions, 60 * 60 * 1000);

// --- ROUTES ---

// User submits suggestion
app.post('/api/suggestions', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'Text required' });
  }
  const newSuggestion = {
    id: Date.now(),
    text: text.trim(),
    date: new Date().toLocaleString()
  };
  suggestions.push(newSuggestion);
  saveSuggestions();
  res.json({ success: true });
});

// Admin login check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  res.status(401).json({ message: 'Wrong password' });
});

// Admin get all suggestions (Protected)
app.get('/api/admin/suggestions', (req, res) => {
  const auth = req.headers['x-admin-password'];
  if (auth !== ADMIN_PASSWORD) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  cleanOldSuggestions();
  res.json(suggestions);
});

// Admin delete suggestion (Protected)
app.delete('/api/admin/suggestions/:id', (req, res) => {
  const auth = req.headers['x-admin-password'];
  if (auth !== ADMIN_PASSWORD) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const id = Number(req.params.id);
  suggestions = suggestions.filter(s => s.id !== id);
  saveSuggestions();
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`✅ Audit Service Suggestion Box running on port ${PORT}`));