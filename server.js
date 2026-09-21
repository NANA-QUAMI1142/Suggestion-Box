const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

let suggestions = [];

app.get('/api/suggestions', (req, res) => {
  res.json(suggestions);
});

app.post('/api/suggestions', (req, res) => {
  const message = req.body.message || req.body.text || req.body.suggestion;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message required' });
  }
  const newItem = { id: Date.now(), message: message.trim(), anonymous: true, createdAt: new Date() };
  suggestions.push(newItem);
  res.json(newItem);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log('Running on', PORT));
