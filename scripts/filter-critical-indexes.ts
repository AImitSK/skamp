/**
 * Filtert kritische Indexes aus missing-indexes.txt
 */

import { readFileSync, writeFileSync } from 'fs';

// Kritische Collections
const CRITICAL_COLLECTIONS = new Set([
  'team_members',
  'notifications',
  'campaigns',
  'contacts_enhanced',
  'companies_enhanced',
  'projects',
  'publications',
  'email_campaign_sends',
  'media_files',
  'pdf_templates',
  'calendar_events',
  'tasks'
]);

// Pfade die wir überspringen
const SKIP_PATHS = [
  'migrate-campaign-assets',
  'test-',
  '__tests__',
  'scripts/',
  '.test.ts',
  'seed-'
];

function shouldSkip(path: string): boolean {
  return SKIP_PATHS.some(skip => path.includes(skip));
}

function main() {
  const content = readFileSync('./missing-indexes.txt', 'utf-8');

  // Parse Indexes
  const indexPattern = /📄 (.*?):(\d+)\s+Collection: (\w+)\s+Fields: ([^\n]+)\s+Suggested index:\s+(\{[\s\S]*?\})\s*(?=📄|💡|$)/g;
  const matches = [...content.matchAll(indexPattern)];

  const criticalIndexes: any[] = [];

  for (const match of matches) {
    const [_, file, line, collection, fields, jsonStr] = match;

    // Skip unwanted
    if (shouldSkip(file)) continue;
    if (!CRITICAL_COLLECTIONS.has(collection)) continue;

    try {
      const index = JSON.parse(jsonStr.trim());
      criticalIndexes.push({
        file,
        line,
        collection,
        fields: fields.trim(),
        index
      });
    } catch (err) {
      // Ignore
    }
  }

  console.log(`🎯 Found ${criticalIndexes.length} critical production indexes\n`);
  console.log("=" + "=".repeat(80));

  // Gruppiere nach Collection
  const byCollection = new Map<string, any[]>();
  for (const idx of criticalIndexes) {
    if (!byCollection.has(idx.collection)) {
      byCollection.set(idx.collection, []);
    }
    byCollection.get(idx.collection)!.push(idx);
  }

  // Ausgabe gruppiert
  for (const [collection, indexes] of byCollection.entries()) {
    console.log(`\n\n📦 ${collection} (${indexes.length} indexes)`);
    console.log("-".repeat(80));

    for (const idx of indexes) {
      console.log(`\n   📄 ${idx.file}:${idx.line}`);
      console.log(`   Fields: ${idx.fields}`);
    }
  }

  // Save to JSON
  const indexesOnly = criticalIndexes.map(i => i.index);
  writeFileSync('./critical-indexes.json', JSON.stringify(indexesOnly, null, 2));

  console.log(`\n\n✅ Saved ${criticalIndexes.length} indexes to critical-indexes.json`);
  console.log('\n💡 Next steps:');
  console.log('1. Review critical-indexes.json');
  console.log('2. Manually merge into firestore.indexes.json');
  console.log('3. Run: firebase deploy --only firestore:indexes\n');
}

main();
