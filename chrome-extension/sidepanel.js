// Hostamar AI Browser Extension — Side Panel Script

// Get URL from query params or active tab
const params = new URLSearchParams(window.location.search);
const pageUrl = params.get('url');
const pageTitle = params.get('title');

if (pageUrl) {
  document.getElementById('page-title').textContent = pageTitle || pageUrl;
  summarizeUrl(pageUrl, pageTitle);
} else {
  // Get from active tab
  chrome.runtime.sendMessage({ type: 'GET_TAB_INFO' }, (response) => {
    if (response) {
      document.getElementById('page-title').textContent = response.title || response.url;
      summarizeUrl(response.url, response.title);
    }
  });
}

async function summarizeUrl(url, title) {
  const content = document.getElementById('content');

  try {
    chrome.runtime.sendMessage(
      { type: 'SUMMARIZE_URL', url, title, selection: '' },
      (response) => {
        if (response && response.success && response.data) {
          const data = response.data;
          let html = '<div class="summary">';

          if (data.summary) {
            html += `<p>${escapeHtml(data.summary)}</p>`;
          }

          if (data.keyActions && data.keyActions.length > 0) {
            html += '<h4>মূল পদক্ষেপ</h4><ul>';
            data.keyActions.forEach((action) => {
              html += `<li>${escapeHtml(action)}</li>`;
            });
            html += '</ul>';
          }

          html += '</div>';
          content.innerHTML = html;
        } else {
          content.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">সারাংশ তৈরি করা যায়নি।</p>';
        }
      }
    );
  } catch (err) {
    content.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">সংযোগ বিচ্ছিন্ন।</p>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
