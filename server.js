const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'suggestions.json');

// Load from file if exists
let suggestions = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    suggestions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log('Loaded', suggestions.length, 'suggestions from file');
  } catch(e) { suggestions = []; }
}

function saveToFile() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(suggestions, null, 2));
}

function getActiveSuggestions() {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000;
  const before = suggestions.length;
  suggestions = suggestions.filter(s => new Date(s.createdAt).getTime() > cutoff);
  if (suggestions.length !== before) saveToFile(); // save if we removed expired
  return suggestions;
}

app.get('/api/suggestions', (req, res) => {
  res.json(getActiveSuggestions());
});

app.post('/api/suggestions', (req, res) => {
  const message = req.body.message || req.body.text || req.body.suggestion;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message required' });
  }
  const newItem = { 
    id: Date.now(), 
    message: message.trim(), 
    anonymous: req.body.anonymous !== false, 
    likes: 0,
    createdAt: new Date() 
  };
  suggestions.push(newItem);
  saveToFile();
  res.json(newItem);
});

app.post('/api/suggestions/:id/like', (req, res) => {
  getActiveSuggestions();
  const id = parseInt(req.params.id);
  const item = suggestions.find(s => s.id === id);
  if (!item) return res.status(404).json({ error: 'Not found or expired' });
  item.likes = (item.likes || 0) + 1;
  saveToFile();
  res.json(item);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log('Running on', PORT));