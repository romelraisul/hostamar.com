// Hostamar AI Browser Extension — Background Service Worker (Manifest V3)

const API_BASE = 'https://hostamar.com';

// Context menu: right-click → summarize
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'hostamar-summarize',
    title: '🇧🇩 Hostamar দিয়ে সারাংশ করুন',
    contexts: ['page', 'selection'],
  });
  chrome.contextMenus.create({
    id: 'hostamar-summarize-selection',
    title: '🇧🇩 সিলেক্টেড টেক্সট সারাংশ করুন',
    contexts: ['selection'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'hostamar-summarize' || info.menuItemId === 'hostamar-summarize-selection') {
    const url = tab.url;
    const title = tab.title;
    const selection = info.selectionText || '';

    // Open side panel with the URL
    chrome.tabs.sendMessage(tab.id, {
      type: 'OPEN_SIDEPANEL',
      url: url,
      title: title,
      selection: selection,
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUMMARIZE_URL') {
    summarizeUrl(request.url, request.title, request.selection)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (request.type === 'GET_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({ url: tabs[0].url, title: tabs[0].title });
      }
    });
    return true;
  }
});

// Call Hostamar API to summarize
async function summarizeUrl(url, title, selection) {
  try {
    const response = await fetch(`${API_BASE}/api/browser/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title, selection }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Fallback: try to extract key info from the page
    return {
      summary: `পৃষ্ঠার শিরোনাম: ${title}\nURL: ${url}`,
      keyActions: [],
      language: 'bn',
      source: 'extension-fallback',
    };
  }
}
