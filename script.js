const textarea = document.querySelector('textarea');
const checkbox = document.querySelector('input[type="checkbox"]');
const button = document.querySelector('button');
const recentDiv = document.querySelector('div:last-child') || document.body;

async function loadSuggestions() {
  try {
    const res = await fetch('/api/suggestions');
    const data = await res.json();
    
    let container = document.querySelector('#recent-list');
    if (!container) {
      // find the Recent Suggestions box
      const boxes = document.querySelectorAll('div');
      for (let b of boxes) {
        if (b.innerHTML.includes('Recent Suggestions')) {
          container = b;
          break;
        }
      }
    }
    if (!container) return;

    // Keep title
    const title = container.querySelector('h3') || document.createElement('h3');
    
    if (data.length === 0) {
      container.innerHTML = '<h3>Recent Suggestions</h3><p>No suggestions yet</p>';
      return;
    }

    container.innerHTML = '<h3>Recent Suggestions</h3>' + data.slice().reverse().map(s => `
      <div style="border-left:4px solid #4CAF50; padding:10px; margin:10px 0; background:#f9f9f9; border-radius:4px;">
        <div style="font-size:15px;">${s.message}</div>
        <small style="color:#777;">${s.anonymous ? 'Anonymous' : 'User'} • ${new Date(s.createdAt).toLocaleString()}</small>
      </div>
    `).join('');

  } catch (e) {
    console.log('load error', e);
  }
}

if (button) {
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    const msg = textarea.value.trim();
    if (!msg) return alert('Type something');

    button.textContent = 'Submitting...';
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, anonymous: checkbox.checked })
      });
      if (!res.ok) throw new Error('failed');
      textarea.value = '';
      loadSuggestions();
    } catch (err) {
      alert('Error submitting');
    } finally {
      button.textContent = 'Submit Suggestion';
    }
  });
}

loadSuggestions();