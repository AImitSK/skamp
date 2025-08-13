// src/scripts/create-api-logs.ts
/**
 * Script zum Erstellen von API-Logs für Developer Portal Analytics
 * Fügt realistische Test-Daten in Firestore api_logs Collection ein
 */

import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

// Test User ID (ersetze mit echter User ID aus Firebase Auth)
const TEST_USER_ID = 'test-user-123';
const TEST_ORGANIZATION_ID = 'test-org-456';

// API Endpoints für Test-Logs
const API_ENDPOINTS = [
  '/api/v1/contacts',
  '/api/v1/companies', 
  '/api/v1/search',
  '/api/v1/publications',
  '/api/v1/webhooks',
  '/api/v1/export'
];

// Status Codes für realistische Verteilung
const STATUS_CODES = [
  { code: 200, weight: 85 }, // 85% Success
  { code: 201, weight: 5 },  // 5% Created
  { code: 400, weight: 5 },  // 5% Client Error
  { code: 401, weight: 3 },  // 3% Unauthorized  
  { code: 500, weight: 2 }   // 2% Server Error
];

function getRandomStatusCode(): number {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const status of STATUS_CODES) {
    cumulative += status.weight;
    if (random <= cumulative) {
      return status.code;
    }
  }
  
  return 200; // Fallback
}

function getRandomEndpoint(): string {
  return API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)];
}

function getRandomLatency(): number {
  // Realistische Latenz: 10ms - 500ms, meistens unter 100ms
  const base = Math.random() * 80 + 10; // 10-90ms
  const spike = Math.random() < 0.1 ? Math.random() * 400 : 0; // 10% haben hohe Latenz
  return Math.round(base + spike);
}

function getRandomIP(): string {
  const ips = [
    '192.168.1.1',
    '10.0.0.1', 
    '203.0.113.1',
    '198.51.100.1',
    '172.16.0.1'
  ];
  return ips[Math.floor(Math.random() * ips.length)];
}

async function createAPILogs() {
  console.log('🚀 Erstelle API-Logs für Developer Portal Analytics...');
  
  const now = new Date();
  const logs = [];
  
  // Erstelle Logs für die letzten 30 Tage
  for (let day = 0; day < 30; day++) {
    const dayDate = new Date(now);
    dayDate.setDate(dayDate.getDate() - day);
    
    // Pro Tag: 10-200 API-Calls (mehr in den letzten Tagen)
    const callsPerDay = Math.floor(Math.random() * (200 - day * 5)) + 10;
    
    for (let call = 0; call < callsPerDay; call++) {
      const callTime = new Date(dayDate);
      callTime.setHours(
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );
      
      const status = getRandomStatusCode();
      
      logs.push({
        userId: TEST_USER_ID,
        organizationId: TEST_ORGANIZATION_ID,
        endpoint: getRandomEndpoint(),
        method: 'GET',
        status: status,
        latency: getRandomLatency(),
        timestamp: Timestamp.fromDate(callTime),
        ip: getRandomIP(),
        userAgent: 'CeleroPress-SDK/1.0.0',
        apiKeyId: 'cp_live_' + Math.random().toString(36).substring(2, 15),
        requestSize: Math.floor(Math.random() * 1000) + 100,
        responseSize: Math.floor(Math.random() * 5000) + 500,
        isError: status >= 400
      });
    }
  }
  
  console.log(`📊 Erstelle ${logs.length} API-Log-Einträge...`);
  
  // Füge Logs in Batches hinzu (Firestore Limit: 500 operations per batch)
  const batchSize = 100;
  const apiLogsCollection = collection(db, 'api_logs');
  
  for (let i = 0; i < logs.length; i += batchSize) {
    const batch = logs.slice(i, i + batchSize);
    
    console.log(`📝 Füge Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(logs.length/batchSize)} hinzu...`);
    
    const promises = batch.map(log => addDoc(apiLogsCollection, log));
    await Promise.all(promises);
  }
  
  console.log('✅ API-Logs erfolgreich erstellt!');
  
  // Statistiken ausgeben
  const totalRequests = logs.length;
  const todayRequests = logs.filter(log => {
    const logDate = log.timestamp.toDate();
    return logDate.toDateString() === now.toDateString();
  }).length;
  
  const errorCount = logs.filter(log => log.isError).length;
  const errorRate = ((errorCount / totalRequests) * 100).toFixed(2);
  
  const avgLatency = Math.round(
    logs.reduce((sum, log) => sum + log.latency, 0) / logs.length
  );
  
  console.log('\n📊 STATISTIKEN:');
  console.log(`- Gesamt Requests: ${totalRequests.toLocaleString('de-DE')}`);
  console.log(`- Requests heute: ${todayRequests.toLocaleString('de-DE')}`);
  console.log(`- Fehlerrate: ${errorRate}%`);
  console.log(`- Durchschnittliche Latenz: ${avgLatency}ms`);
  console.log('\n🎯 Developer Portal sollte jetzt realistische Daten anzeigen!');
}

// Script ausführen
if (typeof window === 'undefined') {
  // Nur im Node.js Kontext ausführen
  createAPILogs().catch(console.error);
}

export { createAPILogs };