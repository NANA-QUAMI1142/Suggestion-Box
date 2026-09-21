const msg = document.getElementById('msg');
const anon = document.getElementById('anon');
const submitBtn = document.getElementById('submitBtn');
const list = document.getElementById('list');
const status = document.getElementById('status');
const nameInput = document.getElementById('nameInput');

async function load() {
  try {
    const res = await fetch('/api/suggestions');
    const data = await res.json();
    if (!data || data.length === 0) {
      list.innerHTML = '<p>No suggestions yet</p>';
      return;
    }
    // THIS IS THE FIX - no more JSON
    list.innerHTML = data.map(s => {
      const content = s.text || s.message || "";
      const author = s.anonymous ? "Anonymous" : (s.name || "User");
      const time = s.createdAt ? new Date(s.createdAt).toLocaleString() : "";
      return `
        <div style="border-left:3px solid #4CAF50; padding:10px; margin:8px 0; background:#fff; border-radius:6px;">
          <div style="font-size:14px;"><b>${author}</b>: ${content}</div>
          <div style="font-size:11px; color:#888; margin-top:4px;">${time} ❤️ ${s.likes||0}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.log(e);
    list.innerHTML = '<p>Failed to load</p>';
  }
}

async function submit() {
  const text = msg.value.trim();
  if (!text) return;
  
  let name = "Anonymous";
  let anonymous = true;
  
  if (anon && !anon.checked && nameInput) {
    name = nameInput.value.trim() || "User";
    anonymous = false;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    await fetch('/api/suggestions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ text, name, anonymous })
    });
    msg.value = '';
    if (nameInput) nameInput.value = '';
    if (status) {
      status.textContent = 'Submitted! ✅';
      setTimeout(()=> status.textContent = '', 2000);
    }
    load();
  } catch (e) {
    alert('Failed to submit');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Suggestion";
  }
}

if (submitBtn) submitBtn.addEventListener('click', submit);
load();