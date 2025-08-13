// src/app/api/dev/create-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

/**
 * DEV-ONLY API Route zum Erstellen von Test-API-Logs
 * GET /api/dev/create-logs
 * 
 * WICHTIG: Nur für Development - in Production deaktivieren!
 */

export async function GET(request: NextRequest) {
  // Sicherheitscheck: Nur in Development verwenden
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
    return NextResponse.json(
      { error: 'Dev endpoints not allowed in production' },
      { status: 403 }
    );
  }

  try {
    console.log('🚀 Erstelle API-Logs für Developer Portal Analytics...');
    
    // Test User ID - in echtem Szenario würde man die User ID aus Firebase Auth holen
    const TEST_USER_ID = 'stefan-test-user';
    const TEST_ORGANIZATION_ID = 'celeropress-demo-org';
    
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
      
      return 200;
    }
    
    function getRandomEndpoint(): string {
      return API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)];
    }
    
    function getRandomLatency(): number {
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
    
    const now = new Date();
    const logs = [];
    
    // Erstelle Logs für die letzten 7 Tage (kleinere Menge für schnellere Erstellung)
    for (let day = 0; day < 7; day++) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() - day);
      
      // Pro Tag: 50-150 API-Calls
      const callsPerDay = Math.floor(Math.random() * 100) + 50;
      
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
    
    // Füge Logs einzeln hinzu (einfacher für kleine Mengen)
    const apiLogsCollection = collection(db, 'api_logs');
    let created = 0;
    
    for (const log of logs) {
      await addDoc(apiLogsCollection, log);
      created++;
      
      // Fortschritt alle 50 Einträge
      if (created % 50 === 0) {
        console.log(`📝 ${created}/${logs.length} Logs erstellt...`);
      }
    }
    
    console.log('✅ API-Logs erfolgreich erstellt!');
    
    // Statistiken berechnen
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
    
    const stats = {
      totalRequests,
      todayRequests,
      errorRate: parseFloat(errorRate),
      avgLatency,
      daysGenerated: 7,
      created: created
    };
    
    console.log('\n📊 STATISTIKEN:', stats);
    
    return NextResponse.json({
      success: true,
      message: 'API-Logs erfolgreich erstellt!',
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der API-Logs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create API logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dev/create-logs - Löscht alle Test-API-Logs
 */
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
    return NextResponse.json(
      { error: 'Dev endpoints not allowed in production' },
      { status: 403 }
    );
  }

  try {
    console.log('🗑️ Lösche alle API-Logs...');
    
    // TODO: Implementiere Löschung wenn nötig
    // Für jetzt nur Bestätigung zurückgeben
    
    return NextResponse.json({
      success: true,
      message: 'Löschung nicht implementiert - verwende Firebase Console für manuelle Löschung'
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen der API-Logs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete API logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}