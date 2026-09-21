const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

let suggestions = [];

// Helper: remove suggestions older than 72 hours
function getActiveSuggestions() {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000; // 72 hours
  suggestions = suggestions.filter(s => new Date(s.createdAt).getTime() > cutoff);
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
    anonymous: true, 
    likes: 0,
    createdAt: new Date() 
  };
  suggestions.push(newItem);
  res.json(newItem);
});

// NEW: Like a suggestion
app.post('/api/suggestions/:id/like', (req, res) => {
  getActiveSuggestions();
  const id = parseInt(req.params.id);
  const item = suggestions.find(s => s.id === id);
  if (!item) return res.status(404).json({ error: 'Not found or expired' });
  item.likes = (item.likes || 0) + 1;
  res.json(item);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log('Running on', PORT));