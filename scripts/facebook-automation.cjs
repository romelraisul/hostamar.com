#!/usr/bin/env node
/**
 * Hostamar Facebook Automation Script
 * Uses Camofox browser (localhost:9377) to:
 * - Login to Facebook
 * - Join groups
 * - Post introductory messages
 * 
 * Prerequisites:
 * 1. Camofox server running on port 9377
 * 2. Set env vars: FB_EMAIL, FB_PASSWORD, FB_GROUPS (comma-separated)
 * 
 * Usage: node facebook-automation.js
 */

const API = 'http://127.0.0.1:9377';
const USER_ID = 'hostamar_founder';

// Facebook group URLs - Bangladeshi creator groups
const BANGLADESH_CREATOR_GROUPS = [
  // Add actual Facebook group URLs here
  // Format: 'https://facebook.com/groups/groupname'
  // Example groups to join:
  'https://facebook.com/groups/videoeditingbangladesh',
  'https://facebook.com/groups/youtuberbangladesh',
  'https://facebook.com/groups/digitalmarketingbangladesh',
  'https://facebook.com/groups/freelancerbangladesh',
  'https://facebook.com/groups/contentcreatorbangladesh',
];

const INTRO_POST = `আসসালামু আলাইকুম! 🙋‍♂️

আমি রোমেল, Hostamar.com এর ফাউন্ডার। Hostamar একটি AI ভিডিও জেনারেশন প্ল্যাটফর্ম যা বাংলাদেশি ক্রিয়েটরদের জন্য তৈরি। 

Hostamar দিয়ে আপনি পারেন:
✅ ১০৮০p প্রফেশনাল ভিডিও বানাতে ৫ মিনিটে
✅ ৫০+ টেমপ্লেট (YouTube, Facebook, TikTok)
✅ বাংলা টেক্সট সাপোর্ট
✅ AI অটোমেটিক ভিডিও জেনারেশন
✅ ফ্রি টায়ার - মাসে ৫ টি ভিডিও ফ্রি!

আমি এখানে আছি আপনাদের প্রশ্নের উত্তর দিতে। Hostamar নিয়ে আপনার কী জানতে চান? কমেন্টে জানান 👇

👉 hostamar.com

#Hostamar #VideoCreation #BangladeshiCreator`;

async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  
  const url = `${API}${endpoint}`;
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginToFacebook(email, password) {
  console.log('🔑 Logging in to Facebook...');
  
  // Create tab
  const tab = await makeRequest('/tabs', 'POST', {
    userId: USER_ID,
    url: 'https://facebook.com/login'
  });
  const tabId = tab.tabId;
  console.log(`📑 Tab created: ${tabId}`);
  await sleep(3000);

  // Get login page snapshot
  const snapshot = await makeRequest(`/tabs/${tabId}/snapshot?userId=${USER_ID}`, 'GET');
  
  // Type email
  await makeRequest(`/tabs/${tabId}/type`, 'POST', {
    userId: USER_ID,
    selector: 'input[name="email"]',
    text: email
  });
  
  // Type password
  await makeRequest(`/tabs/${tabId}/type`, 'POST', {
    userId: USER_ID,
    selector: 'input[name="pass"]',
    text: password
  });
  
  // Click login button
  await makeRequest(`/tabs/${tabId}/click`, 'POST', {
    userId: USER_ID,
    selector: 'button[name="login"]'
  });
  
  console.log('⏳ Waiting for login...');
  await sleep(5000);
  
  return tabId;
}

async function joinGroup(tabId, groupUrl) {
  console.log(`👥 Joining group: ${groupUrl}`);
  
  await makeRequest(`/tabs/${tabId}/navigate`, 'POST', {
    userId: USER_ID,
    url: groupUrl
  });
  await sleep(3000);
  
  // Try clicking "Join Group" button
  try {
    await makeRequest(`/tabs/${tabId}/click`, 'POST', {
      userId: USER_ID,
      selector: 'div[aria-label*="Join"]'
    });
    console.log('✅ Join button clicked');
    await sleep(2000);
  } catch (e) {
    console.log(`⚠️ Could not click join: ${e.message}`);
  }
}

async function postInGroup(tabId, groupUrl, message) {
  console.log(`📝 Posting in group: ${groupUrl}`);
  
  await makeRequest(`/tabs/${tabId}/navigate`, 'POST', {
    userId: USER_ID,
    url: groupUrl
  });
  await sleep(3000);
  
  // Click on the post creation area
  try {
    await makeRequest(`/tabs/${tabId}/click`, 'POST', {
      userId: USER_ID,
      selector: 'div[role="button"][aria-label*="post"], div[aria-label*="Create post"]'
    });
    await sleep(2000);
    
    // Type the message
    await makeRequest(`/tabs/${tabId}/type`, 'POST', {
      userId: USER_ID,
      selector: 'div[role="textbox"][aria-label*="post"], div[contenteditable="true"]',
      text: message
    });
    await sleep(1000);
    
    // Click submit
    await makeRequest(`/tabs/${tabId}/click`, 'POST', {
      userId: USER_ID,
      selector: 'div[aria-label*="Post"]'
    });
    console.log('✅ Post submitted');
    await sleep(3000);
  } catch (e) {
    console.log(`⚠️ Could not post: ${e.message}`);
  }
}

async function main() {
  const email = process.env.FB_EMAIL;
  const password = process.env.FB_PASSWORD;
  
  if (!email || !password) {
    console.log('⚠️ FB_EMAIL and FB_PASSWORD env vars required');
    console.log('Usage: FB_EMAIL=your@email.com FB_PASSWORD=yourpass node facebook-automation.js');
    console.log('Set FB_GROUPS for custom groups (comma-separated URLs)');
    
    // Still provide ready-to-use script
    console.log('\n============= HOSTAMAR FACEBOOK AUTOMATION SCRIPT =============');
    console.log('Camofox running on port 9377 ✅');
    console.log('\nTo automate Facebook:');
    console.log('1. Clear cookies: DELETE http://127.0.0.1:9377/sessions/hostamar_founder');
    console.log('2. Set env vars:');
    console.log('   FB_EMAIL=your_fb_email');
    console.log('   FB_PASSWORD=your_fb_password');
    console.log('3. Run: node scripts/facebook-automation.js');
    console.log('');
    console.log('Default groups to join (update URLs in script):');
    BANGLADESH_CREATOR_GROUPS.forEach((g, i) => console.log(`   ${i+1}. ${g}`));
    console.log('');
    console.log('Intro post template ready ✅');
    console.log('');
    console.log('===============================================================');
    return;
  }
  
  try {
    const tabId = await loginToFacebook(email, password);
    
    // Get groups from env or use defaults
    const groups = process.env.FB_GROUPS 
      ? process.env.FB_GROUPS.split(',').map(g => g.trim())
      : BANGLADESH_CREATOR_GROUPS;
    
    for (const groupUrl of groups) {
      await joinGroup(tabId, groupUrl);
      await postInGroup(tabId, groupUrl, INTRO_POST);
      await sleep(5000); // Wait between groups to avoid rate limiting
    }
    
    console.log('🎉 All groups processed!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

main();
