const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));

mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("Mongo connected"))
  .catch(e=>console.error(e));

const Suggestion = mongoose.model('Suggestion', new mongoose.Schema({
  text: String,
  name: String,
  anonymous: Boolean,
  createdAt: { type: Date, default: Date.now, expires: 259200 }
}));

app.get('/api/suggestions', async (req,res)=>{
  const list = await Suggestion.find().sort({createdAt:-1});
  res.json(list);
});
// ADMIN DELETE
app.delete('/api/suggestions/:id', async (req, res) => {
  const adminPassword = req.headers['x-admin-password'];
  if (adminPassword !== 'admin0011') { // <-- CHANGE THIS PASSWORD
    return res.status(403).json({error: 'Wrong password'});
  }
  try {
    await Suggestion.findByIdAndDelete(req.params.id);
    res.json({success: true});
  } catch(e){ res.status(500).json({error: e.message}) }
});

app.post('/api/suggestions', async (req,res)=>{
  const {text, name, anonymous} = req.body;
  if(!text || !text.trim()) return res.status(400).json({error:"Empty"});
  const s = await Suggestion.create({
    text,
    name: anonymous ? null : name,
    anonymous
  });
  res.json(s);
});

const PORT = process.env.PORT || 3000;
app.get('/', (req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html'));
});
app.listen(PORT, ()=>console.log("Running on "+PORT));