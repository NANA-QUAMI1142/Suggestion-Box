const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Serve frontend from root and public folder
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

// Database
const db = new Database('suggestions.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.get('/health', (req,res)=> res.send('OK'));

app.post('/api/suggestions', (req,res)=>{
  const { name, category, message } = req.body;
  if(!message) return res.status(400).json({error:'Message required'});
  const stmt = db.prepare('INSERT INTO suggestions (name, category, message) VALUES (?,?,?)');
  const info = stmt.run(name||'Anonymous', category||'General', message);
  res.json({success:true, id: info.lastInsertRowid});
});

app.get('/api/suggestions', (req,res)=>{
  const rows = db.prepare('SELECT * FROM suggestions ORDER BY id DESC').all();
  res.json(rows);
});

// Catch-all to fix your Not Found
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname, 'index.html'), (err)=>{
    if(err){
      res.sendFile(path.join(__dirname, 'public', 'index.html'), (err2)=>{
        if(err2) res.status(404).send('Not Found - index.html missing in root');
      });
    }
  });
});

app.listen(PORT, ()=> console.log(`Server running on ${PORT}`));