const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@00';

// --- FIXED: trims hidden line breaks ---
let BIN_ID = (process.env.BIN_ID || '6ab3d2a3ffd5d1605326cf2f').trim().replace(/\s+/g, '');
let BIN_KEY = (process.env.BIN_KEY || '$2a$10$SzX7NkdaOM7azha4IOiMwekKJ8Y8cqyw/9WlcDB1gs.opuQedr4Na').trim().replace(/\s+/g, '');

console.log(`[config] BIN_ID length ${BIN_ID.length}`);
console.log(`[config] BIN_KEY length ${BIN_KEY.length}`);

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

let old1 = loadJsonSafe(path.join(__dirname, 'suggestions.json'));
let old2 = loadJsonSafe(path.join(__dirname, 'public', 'suggestions.json'));
if(old1 && old1.length > suggestions.length) suggestions = old1;
if(old2 && old2.length > suggestions.length) suggestions = old2;

// --- PATCHED CLOUD LOAD ---
async function loadFromCloud(){
  if(!BIN_ID) return;
  const url = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;
  try {
    console.log(`Cloud load trying: ${url}`);
    let res = await fetch(url, {
      headers: {
        'X-Master-Key': BIN_KEY,
        'X-Access-Key': BIN_KEY,
        'User-Agent': 'suggestion-box/1.0'
      }
    });
    console.log(`Cloud status (with key): ${res.status}`);
    let text = await res.text();

    if(!res.ok || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<')) {
      console.log('With-key failed, retrying as PUBLIC bin...');
      res = await fetch(url, { headers: { 'User-Agent': 'suggestion-box/1.0' } });
      console.log(`Cloud status (public): ${res.status}`);
      text = await res.text();
    }

    if(text.trim().startsWith('<!DOCTYPE')){
      throw new Error(`HTML returned: ${text.slice(0,200)}`);
    }

    const data = JSON.parse(text);
    const record = data.record || data;
    if(Array.isArray(record)){
      if(record.length > 0 && record[0].text) suggestions = record;
    } else if(record && typeof record === 'object'){
      if(record.suggestions) suggestions = record.suggestions;
      if(record.staffIds) staffIds = record.staffIds;
    }
    console.log('Cloud loaded:', suggestions.length, 'suggestions,', staffIds.length, 'staff');
  } catch(e){
    console.log('Cloud load failed, using local:', e.message);
  }
}

async function saveToCloud(){
  if(!BIN_ID ||!BIN_KEY) return;
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': BIN_KEY,
        'X-Access-Key': BIN_KEY,
        'User-Agent': 'suggestion-box/1.0'
      },
      body: JSON.stringify({ suggestions, staffIds })
    });
    console.log(`Cloud save status: ${res.status}`);
  } catch(e){ console.log('Cloud save error', e.message); }
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
