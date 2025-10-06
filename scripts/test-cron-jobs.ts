/**
 * Script zum Testen der Cron Jobs lokal
 *
 * Usage:
 * npm run tsx scripts/test-cron-jobs.ts [scan|auto-import|both]
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET nicht gesetzt!');
  console.log('Setze CRON_SECRET in .env.local');
  process.exit(1);
}

const testType = process.argv[2] || 'both';

async function testScanJob() {
  console.log('\n🔍 ===== TESTE SCAN JOB =====');

  try {
    const response = await fetch(`${BASE_URL}/api/matching/scan?secret=${CRON_SECRET}`, {
      method: 'GET'
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Scan erfolgreich!');
      console.log('📊 Ergebnis:', result);
    } else {
      console.error('❌ Scan fehlgeschlagen:', result);
    }
  } catch (error) {
    console.error('❌ Scan Fehler:', error);
  }
}

async function testAutoImportJob() {
  console.log('\n🤖 ===== TESTE AUTO-IMPORT JOB =====');

  try {
    const response = await fetch(`${BASE_URL}/api/matching/auto-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ secret: CRON_SECRET })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Auto-Import erfolgreich!');
      console.log('📊 Ergebnis:', result);
    } else {
      console.error('❌ Auto-Import fehlgeschlagen:', result);
    }
  } catch (error) {
    console.error('❌ Auto-Import Fehler:', error);
  }
}

async function main() {
  console.log('🚀 Teste Cron Jobs...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Secret: ${CRON_SECRET ? '✓ gesetzt' : '✗ fehlt'}`);

  if (testType === 'scan' || testType === 'both') {
    await testScanJob();
  }

  if (testType === 'auto-import' || testType === 'both') {
    await testAutoImportJob();
  }

  console.log('\n✅ Tests abgeschlossen!');
}

main();
