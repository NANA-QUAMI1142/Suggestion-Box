const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // THIS IS IMPORTANT FOR LOGO

mongoose.connect(process.env.MONGODB_URI);

const suggestionSchema = new mongoose.Schema({
  text: String,
  name: String,
  anonymous: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Suggestion = mongoose.model('Suggestion', suggestionSchema);

app.get('/api/suggestions', async (req, res) => {
  const suggestions = await Suggestion.find().sort({ createdAt: -1 });
  res.json(suggestions);
});

app.post('/api/suggestions', async (req, res) => {
  const { text, name, anonymous } = req.body;
  if(!text) return res.status(400).json({error: 'No text'});
  const sug = new Suggestion({ text, name, anonymous });
  await sug.save();
  res.json(sug);
});

// NEW: ADMIN DELETE
app.delete('/api/suggestions/:id', async (req, res) => {
  if (req.headers['x-admin-password'] !== 'admin0011')  { 
    return res.status(403).json({error: 'Wrong password'});
  }
  await Suggestion.findByIdAndDelete(req.params.id);
  res.json({success: true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on ' + PORT));