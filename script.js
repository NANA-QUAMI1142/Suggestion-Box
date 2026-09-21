const msg = document.getElementById('msg');
const anon = document.getElementById('anon');
const submitBtn = document.getElementById('submitBtn');
const list = document.getElementById('list');
const status = document.getElementById('status');
const nameInput = document.getElementById('nameInput');

async function load() {
  const res = await fetch('/api/suggestions');
  const data = await res.json();
  if (!data.length) { list.innerHTML = '<p>No suggestions yet</p>'; return; }
  list.innerHTML = data.map(s => `<div style="border-left:3px solid #4CAF50;padding:10px;margin:8px 0;background:#fff;border-radius:6px"><b>${s.anonymous?'Anonymous':s.name||'User'}</b>: ${s.text||s.message||''}<br><small style="color:#888">${new Date(s.createdAt).toLocaleString()}</small></div>`).join('');
}
async function submit() {
  const text = msg.value.trim(); if(!text) return;
  await fetch('/api/suggestions', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text, name: anon.checked?'Anonymous':(nameInput?.value||'User'), anonymous: anon.checked})});
  msg.value=''; load();
}
submitBtn.addEventListener('click', submit);
load();