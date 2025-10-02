// API Route zum Seeden umfangreicher Test-Daten

import { NextRequest, NextResponse } from 'next/server';
import { seedComprehensiveTestData, cleanupTestData } from '@/scripts/seed-matching-comprehensive-test-data';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'cleanup') {
      const result = await cleanupTestData();
      return NextResponse.json(result);
    }

    // Standard: Seed Test-Daten
    const result = await seedComprehensiveTestData();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Seed comprehensive test data error:', error);
    return NextResponse.json(
      { error: 'Failed to seed comprehensive test data', details: error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await cleanupTestData();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Cleanup test data error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup test data', details: error },
      { status: 500 }
    );
  }
}