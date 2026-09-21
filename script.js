const textInput = document.getElementById('textInput');
const nameInput = document.getElementById('nameInput');
const anonCheck = document.getElementById('anonCheck');
const submitBtn = document.getElementById('submitBtn');
const listDiv = document.getElementById('list');

// Auto-disable name input if anonymous is checked
anonCheck.onchange = () => {
  nameInput.disabled = anonCheck.checked;
  if(anonCheck.checked) nameInput.value = "";
};

submitBtn.onclick = async () => {
  const text = textInput.value;
  const name = nameInput.value;
  const anonymous = anonCheck.checked;

  if(!text.trim()) return alert("Write something");

  await fetch('/api/suggestions', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ text, name, anonymous })
  });
  location.reload();
};

async function load() {
  const res = await fetch('/api/suggestions');
  const data = await res.json();
  listDiv.innerHTML = data.map(s => {
    const displayName = s.anonymous ? "Anonymous" : (s.name || "Anonymous");
    const time = new Date(s.createdAt).toLocaleString();
    return `<div style="border:1px solid #ddd; padding:10px; margin:8px 0; border-radius:8px;">
      <b>${displayName}</b> • ${time}<br>${s.text}
    </div>`;
  }).join('');
}
load();

// Run once on start
nameInput.disabled = anonCheck.checked;