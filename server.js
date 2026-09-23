const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@00';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATA FOLDER ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const suggPath = path.join(dataDir, 'suggestions.json');
const staffPath = path.join(dataDir, 'staff_ids.json');

let suggestions = fs.existsSync(suggPath) ? JSON.parse(fs.readFileSync(suggPath, 'utf8') || '[]') : [];
let staffIds = fs.existsSync(staffPath) ? JSON.parse(fs.readFileSync(staffPath, 'utf8') || '[]') : [];

function saveSuggestions(){ fs.writeFileSync(suggPath, JSON.stringify(suggestions, null, 2)); }
function saveStaffIds(){ fs.writeFileSync(staffPath, JSON.stringify(staffIds, null, 2)); }

function cleanOld(){
  const THREE_DAYS = 3*24*60*60*1000;
  const now = Date.now();
  const before = suggestions.length;
  suggestions = suggestions.filter(s => (now - new Date(s.date).getTime()) < THREE_DAYS);
  if(before !== suggestions.length) saveSuggestions();
}
cleanOld();
setInterval(cleanOld, 60*60*1000);

function isValidStaffId(id){
  if(!id) return false;
  id = id.trim().toUpperCase();
  if(staffIds.length === 0) return true; // Allow all if list empty (for now)
  return staffIds.map(x=>x.toUpperCase()).includes(id);
}

// --- STAFF VERIFY ---
app.post('/api/staff/verify', (req,res)=>{
  const { staffId } = req.body;
  if(isValidStaffId(staffId)) return res.json({ valid: true });
  res.status(401).json({ valid: false, message: 'Invalid Staff ID' });
});

// --- SUGGESTION SUBMIT (Now protected by Staff ID) ---
app.post('/api/suggestions', (req,res)=>{
  const staffId = req.headers['x-staff-id'];
  if(!isValidStaffId(staffId)) return res.status(403).json({ message: 'Invalid Staff ID' });
  
  const { text } = req.body;
  if(!text || !text.trim()) return res.status(400).json({ message: 'Text required' });
  
  suggestions.push({ id: Date.now(), text: text.trim(), date: new Date().toLocaleString() });
  saveSuggestions();
  res.json({ success: true });
});

// --- ADMIN AUTH ---
app.post('/api/admin/login', (req,res)=>{
  if(req.body.password === ADMIN_PASSWORD) return res.json({ success: true });
  res.status(401).json({ message: 'Wrong password' });
});

function checkAdmin(req,res,next){
  if(req.headers['x-admin-password'] !== ADMIN_PASSWORD) return res.status(403).json({ message: 'Unauthorized' });
  next();
}

app.get('/api/admin/suggestions', checkAdmin, (req,res)=>{
  cleanOld();
  res.json(suggestions);
});

app.delete('/api/admin/suggestions/:id', checkAdmin, (req,res)=>{
  suggestions = suggestions.filter(s=> s.id !== Number(req.params.id));
  saveSuggestions();
  res.json({ success: true });
});

// --- ADMIN MANAGE STAFF IDs ---
app.get('/api/admin/staff', checkAdmin, (req,res)=> res.json(staffIds));
app.post('/api/admin/staff', checkAdmin, (req,res)=>{
  let { id } = req.body;
  if(!id) return res.status(400).json({ message: 'ID required' });
  id = id.trim().toUpperCase();
  if(!staffIds.map(x=>x.toUpperCase()).includes(id)){
    staffIds.push(id);
    saveStaffIds();
  }
  res.json(staffIds);
});
app.delete('/api/admin/staff/:id', checkAdmin, (req,res)=>{
  const id = req.params.id.toUpperCase();
  staffIds = staffIds.filter(x=> x.toUpperCase() !== id);
  saveStaffIds();
  res.json(staffIds);
});

app.listen(PORT, ()=> console.log(`Running on ${PORT}`));