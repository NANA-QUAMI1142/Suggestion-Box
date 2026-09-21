const msgEl = document.getElementById('msg');
const anonEl = document.getElementById('anon');
const listEl = document.getElementById('list');
const btn = document.getElementById('submitBtn');

btn.onclick = async () => {
  const text = msgEl.value.trim();
  if(!text) return alert("Type something");
  await fetch('/api/suggestions', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ text, message: text, anonymous: anonEl.checked, name: anonEl.checked ? "" : "User" })
  });
  msgEl.value = "";
  load();
};

async function load() {
  const res = await fetch('/api/suggestions');
  const data = await res.json();
  // Handle both 'text' and 'message' field names
  listEl.innerHTML = data.map(s => {
    const content = s.text || s.message || "";
    const author = s.anonymous ? "Anonymous" : (s.name || "Someone");
    return `<div style="border-left:3px solid #4CAF50; padding:10px; margin:8px 0; background:#fff; border-radius:6px;">
      <b>${author}</b>: ${content}
    </div>`;
  }).join('') || "<i>No suggestions yet</i>";
}
load();