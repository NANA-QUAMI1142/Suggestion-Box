const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/suggestionBox');

const suggestionSchema = new mongoose.Schema({
  text: String,
  createdAt: { type: Date, default: Date.now, expires: 259200 } // auto delete after 3 days
});
const Suggestion = mongoose.model('Suggestion', suggestionSchema);

// Get all suggestions
app.get('/api/suggestions', async (req,res)=>{
  const data = await Suggestion.find();
  res.json(data);
});

// Post new suggestion
app.post('/api/suggestions', async (req,res)=>{
  const s = new Suggestion({ text: req.body.text });
  await s.save();
  res.json({ok:true});
});

// DELETE - THIS WAS MISSING!
app.delete('/api/suggestions/:id', async (req,res)=>{
  try{
    await Suggestion.findByIdAndDelete(req.params.id);
    res.json({ok:true});
  }catch(e){
    res.status(500).json({error:e.message});
  }
});

// Admin login check
app.get('/api/admin-login', (req,res)=>{
  if(req.query.password === process.env.ADMIN_PASSWORD){
    res.json({ok:true});
  } else {
    res.json({ok:false});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server running on ' + PORT));