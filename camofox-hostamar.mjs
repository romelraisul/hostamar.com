#!/usr/bin/env node
/**
 * Camofox-Hostamar Marketing Integration
 * Anti-detection browser automation for market research & competitor analysis
 * Run: node camofox-hostamar.js
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CAMOFOX_PORT = 9377;
const HOSTAMAR_DIR = process.cwd();
const OUTPUT_DIR = join(HOSTAMAR_DIR, 'camofox-research');

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const RESEARCH_TASKS = [
  {
    name: 'bangladesh_ai_trends',
    url: 'https://www.google.com/search?q=bangladesh+AI+video+generator+2025',
    macro: '@google_search',
    query: 'bangladesh AI video generator 2025 bangla content',
    goal: 'Find current AI video trends in BD market'
  },
  {
    name: 'competitor_pricing',
    url: 'https://www.youtube.com/results?search_query=bangla+ai+video+generator',
    goal: 'Analyze competitor pricing and features'
  },
  {
    name: 'facebook_group_analysis',
    url: 'https://www.facebook.com/groups/bangladeshcreators',
    goal: 'Monitor creator discussions (requires login)'
  },
  {
    name: 'youtube_transcript',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    goal: 'Extract transcript for content ideas'
  }
];

async function callCamofox(endpoint, body = null) {
  const fetch = (await import('node-fetch')).default;
  const opts = {
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.method = 'POST';
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`http://localhost:${CAMOFOX_PORT}${endpoint}`, opts);
  return res.json();
}

async function runResearchTask(task) {
  console.log(`\n🎯 Task: ${task.name}`);
  console.log(`   Goal: ${task.goal}`);
  
  try {
    // Create tab
    const createTab = await callCamofox('/tabs', { 
      userId: 'hostamar_marketing', 
      sessionKey: `research_${Date.now()}`,
      url: task.url
    });
    const tabId = createTab.tabId;
    console.log(`   Tab created: ${tabId}`);
    
    // Get snapshot
    const snapshot = await callCamofox(`/tabs/${tabId}/snapshot?userId=hostamar_marketing`);
    console.log(`   Snapshot: ${snapshot.snapshot.substring(0, 200)}...`);
    
    // Save results
    const outputFile = join(OUTPUT_DIR, `${task.name}_${new Date().toISOString().split('T')[0]}.json`);
    writeFileSync(outputFile, JSON.stringify({
      task: task,
      timestamp: new Date().toISOString(),
      snapshot: snapshot.snapshot,
      snapshotType: snapshot.type,
      url: snapshot.url,
      title: snapshot.title
    }, null, 2));
    console.log(`   Saved: ${outputFile}`);
    
    // Close tab
    await callCamofox(`/tabs/${tabId}?userId=hostamar_marketing`, null);
    console.log(`   Tab closed`);
    
    return outputFile;
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('🦊 Camofox-Hostamar Marketing Research');
  console.log('=====================================\n');
  
  // Check if Camofox is running
  try {
    await callCamofox('/health');
    console.log('✅ Camofox server is running on port 9377\n');
  } catch (err) {
    console.log('🔴 Camofox server not running. Starting it...\n');
    
    const camofoxDir = join(HOSTAMAR_DIR, 'camofox');
    const camofoxProc = spawn('npm', ['start'], {
      cwd: camofoxDir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    camofoxProc.stderr.on('data', (data) => {
      console.log(`   [Camofox] ${data}`);
    });
    
    // Wait for server to start
    console.log('   Waiting for server to start (30s)...');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        await callCamofox('/health');
        console.log('   ✅ Camofox started!\n');
        break;
      } catch {}
    }
  }
  
  // Run research tasks
  const results = [];
  for (const task of RESEARCH_TASKS) {
    const result = await runResearchTask(task);
    if (result) results.push(result);
  }
  
  console.log('\n📊 Research Summary:');
  console.log(`   Tasks completed: ${results.length}/${RESEARCH_TASKS.length}`);
  console.log(`   Output directory: ${OUTPUT_DIR}`);
  
  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    tasks: RESEARCH_TASKS.length,
    completed: results.length,
    files: results,
    nextSteps: [
      'Review generated JSON files',
      'Extract key insights for content',
      'Update marketing strategy based on findings'
    ]
  };
  
  writeFileSync(join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n📝 Summary saved to: camofox-research/summary.json');
}

main().catch(console.error);