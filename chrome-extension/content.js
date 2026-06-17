// Hostamar AI Browser Extension — Content Script

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_SIDEPANEL') {
    // Show floating summary panel
    showSummaryPanel(request.url, request.title, request.selection);
  }
});

function showSummaryPanel(url, title, selection) {
  // Remove existing panel if any
  const existing = document.getElementById('hostamar-summary-panel');
  if (existing) existing.remove();

  // Create floating panel
  const panel = document.createElement('div');
  panel.id = 'hostamar-summary-panel';
  panel.innerHTML = `
    <div class="hostamar-panel-header">
      <span class="hostamar-logo">H</span>
      <span class="hostamar-title">Hostamar AI সারাংশ</span>
      <button class="hostamar-close" onclick="this.closest('#hostamar-summary-panel').remove()">✕</button>
    </div>
    <div class="hostamar-panel-body">
      <div class="hostamar-loading">
        <div class="hostamar-spinner"></div>
        <p>পৃষ্ঠা পড়া হচ্ছে...</p>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // Fetch summary from API
  fetch(`${'https://hostamar.com'}/api/browser/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, selection }),
  })
    .then((res) => res.json())
    .then((data) => {
      const body = panel.querySelector('.hostamar-panel-body');
      if (data.summary) {
        body.innerHTML = `
          <div class="hostamar-summary-content">
            <h4>সারাংশ</h4>
            <p>${escapeHtml(data.summary)}</p>
            ${data.keyActions && data.keyActions.length > 0 ? `
              <h4>মূল পদক্ষেপ</h4>
              <ul>
                ${data.keyActions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
              </ul>
            ` : ''}
            <div class="hostamar-footer">
              <small>Powered by <a href="https://hostamar.com" target="_blank">Hostamar</a></small>
            </div>
          </div>
        `;
      } else {
        body.innerHTML = `
          <div class="hostamar-error">
            <p>সারাংশ তৈরি করা যায়নি। <a href="https://hostamar.com/browser" target="_blank">ওয়েবসাইটে চেষ্টা করুন</a></p>
          </div>
        `;
      }
    })
    .catch(() => {
      const body = panel.querySelector('.hostamar-panel-body');
      body.innerHTML = `
        <div class="hostamar-error">
          <p>সংযোগ বিচ্ছিন্ন। <a href="https://hostamar.com/browser" target="_blank">ওয়েবসাইটে চেষ্টা করুন</a></p>
        </div>
      `;
    });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
