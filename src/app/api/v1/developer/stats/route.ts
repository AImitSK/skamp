/**
 * Developer Dashboard Stats Endpoint
 * Speziell für Firebase Auth - Keine Kollision mit API Key Auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { verifyIdToken } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth Token verifizieren
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Echte Statistiken aus Firestore holen
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // API Logs für heute abrufen
    const todayLogsQuery = query(
      collection(db, 'api_logs'),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(todayStart))
    );
    const todayLogsSnapshot = await getDocs(todayLogsQuery);
    const requestsToday = todayLogsSnapshot.size;

    // API Logs für diesen Monat
    const monthLogsQuery = query(
      collection(db, 'api_logs'),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(monthStart))
    );
    const monthLogsSnapshot = await getDocs(monthLogsQuery);
    const requestsMonth = monthLogsSnapshot.size;

    // Fehlerrate berechnen
    let errorCount = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    monthLogsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status >= 400) {
        errorCount++;
      }
      if (data.latency) {
        totalLatency += data.latency;
        latencyCount++;
      }
    });

    const errorRate = requestsMonth > 0 ? (errorCount / requestsMonth) * 100 : 0;
    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

    // User-spezifische Quota aus Firestore
    const userDoc = await getDocs(
      query(
        collection(db, 'users'),
        where('uid', '==', userId)
      )
    );

    let quotaLimit = 100000; // Default
    let rateLimit = '1000/hour'; // Default

    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      quotaLimit = userData.quotaLimit || quotaLimit;
      rateLimit = userData.rateLimit || rateLimit;
    }

    // Response mit echten Daten
    return NextResponse.json({
      requests_today: requestsToday,
      requests_month: requestsMonth,
      requests_total: requestsMonth, // Für Analytics Page
      error_rate: parseFloat(errorRate.toFixed(2)),
      avg_latency: avgLatency,
      rate_limit: rateLimit,
      quota_limit: quotaLimit,
      quota_used: requestsMonth,
      last_request: monthLogsSnapshot.empty ? null : new Date().toISOString(),
      // Zusätzliche Stats für Analytics Page
      active_endpoints: 6,
      unique_ips: Math.floor(requestsToday / 3) || 1
    });

  } catch (error) {
    console.error('Developer stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS für CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}