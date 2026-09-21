const form = document.querySelector('form') || document;
const textarea = document.querySelector('textarea');
const checkbox = document.querySelector('input[type="checkbox"]');
const button = document.querySelector('button');
const recentDiv = document.getElementById('recent') || document.querySelector('.recent');

// Submit
if (button) {
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    const message = textarea.value.trim();
    if (!message) {
      alert('Please type a message');
      return;
    }
    
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          anonymous: checkbox ? checkbox.checked : true
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      
      textarea.value = '';
      loadSuggestions();
    } catch (err) {
      // Show error like in your photo
      let errDiv = document.querySelector('.error');
      if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.className = 'error';
        button.after(errDiv);
      }
      errDiv.textContent = `Error: ${err.message}`;
    }
  });
}

// Load recent
async function loadSuggestions() {
  try {
    const res = await fetch('/api/suggestions');
    const suggestions = await res.json();
    if (!recentDiv) return;
    
    recentDiv.innerHTML = '<h3>Recent Suggestions</h3>' + 
      suggestions.reverse().map(s => `
        <div style="border-left:3px solid #4CAF50; padding:8px; margin:8px 0; background:#f9f9f9">
          <div>${s.message}</div>
          <small style="color:#666">${s.anonymous ? 'Anonymous' : s.name || 'User'} - Submitted</small>
        </div>
      `).join('');
  } catch (e) {}
}

loadSuggestions();