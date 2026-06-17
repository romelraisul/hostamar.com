// Hostamar AI Browser Extension — Popup Script

document.getElementById('summarize').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.runtime.sendMessage({
      type: 'SUMMARIZE_URL',
      url: tab.url,
      title: tab.title,
      selection: '',
    });
    window.close();
  }
});

document.getElementById('openBrowser').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://hostamar.com/browser' });
  window.close();
});
