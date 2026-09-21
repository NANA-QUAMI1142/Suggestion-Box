const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

// In-memory storage (replace with DB later if needed)
let suggestions = [];

// API - Get all
app.get('/api/suggestions', (req, res) => {
  res.json(suggestions);
});

// API - Create - FIXED to accept any field name
app.post('/api/suggestions', (req, res) => {
  console.log('Received body:', req.body); // debug
  
  // Accept message, text, suggestion, content — whatever frontend sends
  const message = req.body.message || req.body.text || req.body.suggestion || req.body.content;
  const anonymous = req.body.anonymous !== false; // default anonymous
  
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message required' });
  }
  
  const newSuggestion = {
    id: Date.now(),
    message: message.trim(),
    anonymous: anonymous,
    createdAt: new Date()
  };
  
  suggestions.push(newSuggestion);
  res.json(newSuggestion);
});

// Serve index.html for any other route
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not Found - index.html missing in root');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});