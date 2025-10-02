// API Route für massives Test-Daten Seeding

import { NextRequest, NextResponse } from 'next/server';
import { seedMassiveTestData, cleanupMassiveTestData } from '@/lib/matching/seed-massive-test-data';

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Starting massive test data seed...');

    const result = await seedMassiveTestData();

    return NextResponse.json({
      success: true,
      message: 'Massive test data seeded successfully',
      ...result
    });

  } catch (error) {
    console.error('API Error seeding massive test data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed massive test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('📡 API: Starting massive test data cleanup...');

    const result = await cleanupMassiveTestData();

    return NextResponse.json({
      success: true,
      message: 'Massive test data cleaned up successfully',
      ...result
    });

  } catch (error) {
    console.error('API Error cleaning up massive test data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup massive test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}