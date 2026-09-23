const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@00';

// --- YOUR CLOUD KEYS (for 3-day keep on free plan) ---
const BIN_ID = process.env.BIN_ID || '6ab3d2a3ffd5d1605326cf2f';
const BIN_KEY = process.env.BIN_KEY || '$2a$10$SzX7NkdaOM7azha4IOiMwekKJ8Y8cqyw/9WlcDB1gs.opuQedr4Na';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const suggPath = path.join(dataDir, 'suggestions.json');
const staffPath = path.join(dataDir, 'staff_ids.json');

function loadJsonSafe(p){
  try { if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')||'[]'); } catch(e){} return null;
}

let suggestions = loadJsonSafe(suggPath) || [];
let staffIds = loadJsonSafe(staffPath) || [];

// Try recover old places
let old1 = loadJsonSafe(path.join(__dirname, 'suggestions.json'));
let old2 = loadJsonSafe(path.join(__dirname, 'public', 'suggestions.json'));
if(old1 && old1.length > suggestions.length) suggestions = old1;
if(old2 && old2.length > suggestions.length) suggestions = old2;

// --- CLOUD LOAD / SAVE ---
async function loadFromCloud(){
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': BIN_KEY }
    });
    const data = await res.json();
    const record = data.record;
    if(Array.isArray(record)){
      // old format: just array
      if(record.length > 0 && record[0].text) suggestions = record;
    } else if(record && typeof record === 'object'){
      if(record.suggestions) suggestions = record.suggestions;
      if(record.staffIds) staffIds = record.staffIds;
    }
    console.log('Cloud loaded:', suggestions.length, 'suggestions,', staffIds.length, 'staff');
  } catch(e){ console.log('Cloud load failed, using local', e.message); }
}

async function saveToCloud(){
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': BIN_KEY },
      body: JSON.stringify({ suggestions, staffIds })
    });
  } catch(e){ console.log('Cloud save error', e.message); }
  // also keep local backup
  try {
    fs.writeFileSync(suggPath, JSON.stringify(suggestions, null, 2));
    fs.writeFileSync(staffPath, JSON.stringify(staffIds, null, 2));
  } catch(e){}
}

function saveSuggestions(){ saveToCloud(); }
function saveStaffIds(){ saveToCloud(); }

function cleanOld(){
  const THREE_DAYS = 3*24*60*60*1000;
  const now = Date.now();
  const before = suggestions.length;
  suggestions = suggestions.filter(s => {
    try { return (now - new Date(s.date).getTime()) < THREE_DAYS; } catch(e){ return true; }
  });
  if(before!== suggestions.length){
    console.log(`Auto-cleaned ${before - suggestions.length} expired`);
    saveToCloud();
  }
}

// Load cloud first
loadFromCloud().then(()=>{ cleanOld(); });
setInterval(cleanOld, 60*60*1000);

function isValidStaffId(id){
  if(!id) return false;
  id = id.trim().toUpperCase();
  if(staffIds.length === 0) return true;
  return staffIds.map(x=>x.toUpperCase()).includes(id);
}

app.post('/api/staff/verify', (req,res)=>{
  if(isValidStaffId(req.body.staffId)) return res.json({ valid: true });
  res.status(401).json({ valid: false, message: 'Invalid Staff ID' });
});

app.post('/api/suggestions', (req,res)=>{
  const staffId = req.headers['x-staff-id'];
  if(!isValidStaffId(staffId)) return res.status(403).json({ message: 'Invalid Staff ID' });
  const { text } = req.body;
  if(!text ||!text.trim()) return res.status(400).json({ message: 'Text required' });
  suggestions.push({ id: Date.now(), text: text.trim(), date: new Date().toLocaleString() });
  saveSuggestions();
  res.json({ success: true });
});

app.post('/api/admin/login', (req,res)=>{
  if(req.body.password === ADMIN_PASSWORD) return res.json({ success: true });
  res.status(401).json({ message: 'Wrong password' });
});

function checkAdmin(req,res,next){
  if(req.headers['x-admin-password']!== ADMIN_PASSWORD) return res.status(403).json({ message: 'Unauthorized' });
  next();
}

app.get('/api/admin/suggestions', checkAdmin, (req,res)=>{ cleanOld(); res.json(suggestions); });
app.delete('/api/admin/suggestions/:id', checkAdmin, (req,res)=>{
  suggestions = suggestions.filter(s=> s.id!== Number(req.params.id));
  saveSuggestions();
  res.json({ success: true });
});

app.get('/api/admin/staff', checkAdmin, (req,res)=> res.json(staffIds));
app.post('/api/admin/staff', checkAdmin, (req,res)=>{
  let { id } = req.body;
  if(!id) return res.status(400).json({ message: 'ID required' });
  id = id.trim().toUpperCase();
  if(!staffIds.map(x=>x.toUpperCase()).includes(id)){ staffIds.push(id); saveStaffIds(); }
  res.json(staffIds);
});
app.delete('/api/admin/staff/:id', checkAdmin, (req,res)=>{
  staffIds = staffIds.filter(x=> x.toUpperCase()!== req.params.id.toUpperCase());
  saveStaffIds();
  res.json(staffIds);
});

app.listen(PORT, ()=> console.log(`Running on ${PORT}`));