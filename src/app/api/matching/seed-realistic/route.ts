/**
 * API Endpoint für realistischen Test-Daten Generator
 *
 * POST /api/matching/seed-realistic - Erstellt realistische Test-Daten
 * DELETE /api/matching/seed-realistic - Löscht alle Test-Daten
 */

import { NextResponse } from 'next/server';
import { seedRealisticTestDataSimple, cleanupRealisticTestDataSimple } from '@/lib/matching/seed-realistic-test-data-simple';

export async function POST() {
  try {
    console.log('🚀 API: Starte vereinfachten realistischen Test-Daten Generator...');

    const stats = await seedRealisticTestDataSimple();

    return NextResponse.json({
      success: true,
      message: 'Realistische Test-Daten erfolgreich erstellt',
      stats,
    });
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der realistischen Test-Daten:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🧹 API: Starte Cleanup von realistischen Test-Daten...');

    await cleanupRealisticTestDataSimple();

    return NextResponse.json({
      success: true,
      message: 'Realistische Test-Daten erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('❌ Fehler beim Löschen der realistischen Test-Daten:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
