// Test-Script für die PDF-Timestamp-Reparatur API
const fetch = require('node-fetch');

async function testFixTimestamps() {
  console.log('🔧 Teste PDF-Timestamp-Reparatur API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/fix-pdf-timestamps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ API-Aufruf erfolgreich');
    console.log('📊 Statistiken:', result.statistics);
    console.log('📄 Ergebnisse:', result.results?.slice(0, 5), '...');
    
    if (result.statistics.fixed > 0) {
      console.log(`🎉 ${result.statistics.fixed} fehlerhafte Timestamps repariert!`);
    } else {
      console.log('✨ Alle Timestamps waren bereits korrekt!');
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    throw error;
  }
}

testFixTimestamps()
  .then(() => console.log('\n✅ Test abgeschlossen'))
  .catch(error => {
    console.error('\n❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });