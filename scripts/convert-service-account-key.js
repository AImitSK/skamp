/**
 * Konvertiert Firebase Service Account Key JSON zu .env Format
 *
 * Usage:
 *   node scripts/convert-service-account-key.js path/to/service-account.json
 *
 * Output wird zur Zwischenablage kopiert (Windows) oder als Datei gespeichert
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('❌ Fehler: Bitte Service Account JSON Datei angeben');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/convert-service-account-key.js path/to/service-account.json');
  console.log('');
  console.log('Beispiel:');
  console.log('  node scripts/convert-service-account-key.js skamp-prod-firebase-adminsdk.json');
  process.exit(1);
}

const jsonFilePath = args[0];

if (!fs.existsSync(jsonFilePath)) {
  console.log(`❌ Fehler: Datei nicht gefunden: ${jsonFilePath}`);
  process.exit(1);
}

try {
  // Lese JSON
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
  const serviceAccount = JSON.parse(jsonContent);

  // Validiere erforderliche Felder
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter(field => !serviceAccount[field]);

  if (missingFields.length > 0) {
    console.log(`❌ Fehler: Erforderliche Felder fehlen: ${missingFields.join(', ')}`);
    process.exit(1);
  }

  console.log('✅ Service Account JSON geladen');
  console.log(`   Project ID: ${serviceAccount.project_id}`);
  console.log(`   Client Email: ${serviceAccount.client_email}`);
  console.log('');

  // Konvertiere zu einzeiligem String (escape newlines in private key)
  const envValue = JSON.stringify(serviceAccount);

  // Erstelle .env Format
  const envLine = `FIREBASE_ADMIN_SERVICE_ACCOUNT='${envValue}'`;

  console.log('📋 Kopiere diese Zeile in deine .env.local:');
  console.log('');
  console.log('─'.repeat(80));
  console.log(envLine);
  console.log('─'.repeat(80));
  console.log('');

  // Speichere als .txt Datei
  const outputPath = path.join(__dirname, '..', 'firebase-admin-env.txt');
  fs.writeFileSync(outputPath, envLine);
  console.log(`✅ Gespeichert als: ${outputPath}`);
  console.log('');

  // Versuche in Zwischenablage zu kopieren (Windows)
  try {
    const { execSync } = require('child_process');
    execSync(`echo ${envLine} | clip`, { encoding: 'utf8' });
    console.log('📋 In Zwischenablage kopiert (Windows)');
  } catch (e) {
    console.log('ℹ️  Konnte nicht in Zwischenablage kopieren (nur Windows)');
  }

  console.log('');
  console.log('🔒 WICHTIG:');
  console.log('   - Füge firebase-admin-env.txt zu .gitignore hinzu');
  console.log('   - Teile diesen Key NIEMALS öffentlich');
  console.log('   - Lösche firebase-admin-env.txt nach dem Kopieren');

} catch (error) {
  console.log('❌ Fehler beim Verarbeiten:', error.message);
  process.exit(1);
}
