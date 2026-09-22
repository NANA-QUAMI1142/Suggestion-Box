const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI;
if(MONGO_URI){
  mongoose.connect(MONGO_URI).then(()=>console.log("MongoDB connected")).catch(e=>console.log("Mongo error:", e.message));
} else {
  console.log("WARNING: MONGO_URI missing");
}

const suggestionSchema = new mongoose.Schema({
  text: String,
  createdAt: { type: Date, default: Date.now, expires: 259200 }
});
const Suggestion = mongoose.model('Suggestion', suggestionSchema);

app.get('/api/suggestions', async (req,res)=>{
  try{
    const data = await Suggestion.find();
    res.json(data);
  }catch(e){ res.json([]); }
});

app.post('/api/suggestions', async (req,res)=>{
  try{
    const s = new Suggestion({ text: req.body.text });
    await s.save();
    res.json({ok:true});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.delete('/api/suggestions/:id', async (req,res)=>{
  try{
    await Suggestion.findByIdAndDelete(req.params.id);
    res.json({ok:true});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/admin-login', (req,res)=>{
  if(req.query.password === process.env.ADMIN_PASSWORD) res.json({ok:true});
  else res.json({ok:false});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Server running on ' + PORT));