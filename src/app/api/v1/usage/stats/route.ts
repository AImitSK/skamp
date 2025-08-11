// src/app/api/v1/usage/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    
    // Hole Usage-Statistiken für die Organisation
    const stats = await getUsageStats(context.organizationId, context.userId);
    
    return NextResponse.json(stats);
  });
}

async function getUsageStats(organizationId: string, userId: string) {
  // In einer echten Implementierung würden wir diese Daten aus einer Datenbank holen
  // Für jetzt verwenden wir realistische Mock-Daten basierend auf der organisationId
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Simuliere Daten basierend auf organizationId für Konsistenz
  const seed = organizationId.charCodeAt(0) + organizationId.length;
  
  const requestsToday = Math.floor(Math.sin(seed) * 1000) + 1500;
  const requestsMonth = Math.floor(Math.cos(seed) * 10000) + 15000;
  const errorRate = Math.max(0.1, Math.min(2.0, (Math.sin(seed * 2) + 1) * 0.5));
  const avgLatency = Math.floor(Math.abs(Math.sin(seed * 3)) * 100) + 45;

  return {
    requests_today: requestsToday,
    requests_month: requestsMonth,
    requests_total: requestsMonth + Math.floor(Math.random() * 50000),
    rate_limit: '1000/hour',
    quota_limit: 100000,
    quota_used: requestsMonth + requestsToday,
    error_rate: parseFloat(errorRate.toFixed(2)),
    avg_latency: avgLatency,
    last_request: new Date(now.getTime() - Math.random() * 3600000).toISOString(),
    top_endpoints: [
      { path: '/contacts', requests: Math.floor(requestsToday * 0.4) },
      { path: '/companies', requests: Math.floor(requestsToday * 0.3) },
      { path: '/search', requests: Math.floor(requestsToday * 0.2) },
      { path: '/publications', requests: Math.floor(requestsToday * 0.1) }
    ],
    daily_breakdown: generateDailyBreakdown(7, seed),
    hourly_breakdown: generateHourlyBreakdown(24, seed)
  };
}

function generateDailyBreakdown(days: number, seed: number) {
  const breakdown = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const requests = Math.floor(Math.abs(Math.sin(seed + i)) * 2000) + 500;
    
    breakdown.push({
      date: date.toISOString().split('T')[0],
      requests,
      errors: Math.floor(requests * 0.02),
      unique_ips: Math.floor(requests * 0.15)
    });
  }
  return breakdown;
}

function generateHourlyBreakdown(hours: number, seed: number) {
  const breakdown = [];
  for (let i = hours - 1; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    
    // Simuliere realistisches Tagesmuster
    const hourOfDay = hour.getHours();
    let multiplier = 1;
    
    // Weniger Traffic nachts (0-6), mehr am Tag (9-17)
    if (hourOfDay >= 0 && hourOfDay <= 6) multiplier = 0.3;
    else if (hourOfDay >= 7 && hourOfDay <= 8) multiplier = 0.6;
    else if (hourOfDay >= 9 && hourOfDay <= 17) multiplier = 1.2;
    else if (hourOfDay >= 18 && hourOfDay <= 22) multiplier = 0.8;
    else multiplier = 0.5;

    const baseRequests = Math.abs(Math.sin(seed + i)) * 100;
    const requests = Math.floor(baseRequests * multiplier) + 10;
    
    breakdown.push({
      hour: hour.getHours(),
      timestamp: hour.toISOString(),
      requests,
      errors: Math.floor(requests * 0.015),
      avg_latency: Math.floor(Math.abs(Math.cos(seed + i)) * 50) + 45
    });
  }
  return breakdown;
}