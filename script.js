const msg = document.getElementById('msg');
const submitBtn = document.getElementById('submitBtn');
const list = document.getElementById('list');
const status = document.getElementById('status');

async function load() {
  try {
    const res = await fetch('/api/suggestions');
    const data = await res.json();
    if (!data || data.length === 0) {
      list.innerHTML = '<p>No suggestions yet</p>';
      return;
    }
    list.innerHTML = data.map(s => {
      const content = s.text || s.message || "";
      const time = s.createdAt ? new Date(s.createdAt).toLocaleString() : "";
      return `<div style="border-left:3px solid #4CAF50; padding:10px; margin:8px 0; background:#fff; border-radius:6px;">
        <b>Anonymous</b>: ${content}
        <br><small style="color:#888">${time}</small>
      </div>`;
    }).join('');
  } catch (e) {
    list.innerHTML = '<p>Failed to load</p>';
  }
}

async function submit() {
  const text = msg.value.trim();
  if (!text) return;
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";
  try {
    await fetch('/api/suggestions', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ text: text, anonymous: true, name: "Anonymous" })
    });
    msg.value = '';
    status.textContent = 'Submitted! ✅';
    setTimeout(()=> status.textContent = '', 2000);
    load();
  } catch (e) {
    alert('Failed');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Suggestion";
  }
}

submitBtn.addEventListener('click', submit);
load();