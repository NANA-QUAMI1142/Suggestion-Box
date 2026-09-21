const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/suggestion-box')
  .then(() => console.log('MongoDB connected'))
  .catch(e => console.log('MongoDB error', e));

const suggestionSchema = new mongoose.Schema({
  message: String,
  anonymous: { type: Boolean, default: true },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 259200 } // 259200 = 72h auto-delete!
});

const Suggestion = mongoose.model('Suggestion', suggestionSchema);

app.get('/api/suggestions', async (req, res) => {
  const items = await Suggestion.find().sort({ createdAt: -1 });
  res.json(items);
});

app.post('/api/suggestions', async (req, res) => {
  const message = req.body.message;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });
  const item = await Suggestion.create({ 
    message: message.trim(), 
    anonymous: req.body.anonymous !== false 
  });
  res.json(item);
});

app.post('/api/suggestions/:id/like', async (req, res) => {
  try {
    const item = await Suggestion.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found or expired' });
    res.json(item);
  } catch(e) {
    res.status(400).json({ error: 'Invalid id' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log('Running on', PORT));