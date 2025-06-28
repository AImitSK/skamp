// src/app/api/ai/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Health check requested');
  
  // Prüfe ob GEMINI_API_KEY existiert
  const isConfigured = !!process.env.GEMINI_API_KEY;
  
  return NextResponse.json({
    status: isConfigured ? 'healthy' : 'not_configured',
    timestamp: new Date().toISOString(),
    service: 'SKAMP Gemini AI Assistant',
    version: '1.0.0',
    configured: isConfigured
  });
}