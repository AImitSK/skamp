/**
 * Firestore Index Checker - V2
 *
 * Verwendet einfacheren Ansatz: Sucht nach where() + orderBy() in der Nähe
 * und prüft ob Composite Index nötig ist
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface QueryPattern {
  file: string;
  line: number;
  collection: string;
  fields: string[];
  context: string;
}

interface FirestoreIndex {
  collectionGroup: string;
  queryScope: string;
  fields: Array<{
    fieldPath: string;
    order?: string;
    arrayConfig?: string;
  }>;
}

/**
 * Scannt Verzeichnis rekursiv
 */
function scanDirectory(dir: string, patterns: QueryPattern[] = []): QueryPattern[] {
  try {
    const files = readdirSync(dir);

    for (const file of files) {
      const path = join(dir, file);

      try {
        const stat = statSync(path);

        if (stat.isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
            scanDirectory(path, patterns);
          }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          analyzeFile(path, patterns);
        }
      } catch (err) {
        // Ignore
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dir}:`, err);
  }

  return patterns;
}

/**
 * Analysiert Datei - Sucht nach Query-Patterns
 */
function analyzeFile(filePath: string, patterns: QueryPattern[]): void {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Finde alle where() und orderBy() Statements
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip Kommentare
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        continue;
      }

      // Suche nach where() oder orderBy()
      if (!line.includes('where(') && !line.includes('orderBy(')) {
        continue;
      }

      // Sammle Context (10 Zeilen vor und nach)
      const contextStart = Math.max(0, i - 10);
      const contextEnd = Math.min(lines.length, i + 10);
      const context = lines.slice(contextStart, contextEnd).join('\n');

      // Extrahiere Collection Name
      let collection = '';

      // Client SDK: collection(db, 'name')
      const clientMatch = context.match(/collection\s*\(\s*\w+\s*,\s*['"]([^'"]+)['"]/);
      if (clientMatch) {
        collection = clientMatch[1];
      }

      // Admin SDK: adminDb.collection('name')
      const adminMatch = context.match(/adminDb\.collection\s*\(\s*['"]([^'"]+)['"]/);
      if (adminMatch) {
        collection = adminMatch[1];
      }

      // Variable: const ref = db.collection('name')
      const varMatch = context.match(/=\s*\w+\.collection\s*\(\s*['"]([^'"]+)['"]/);
      if (varMatch) {
        collection = varMatch[1];
      }

      if (!collection) continue;

      // Extrahiere alle Felder (where + orderBy)
      const fields: string[] = [];

      // where() Felder
      const whereMatches = context.matchAll(/where\s*\(\s*['"]([^'"]+)['"]/g);
      for (const match of whereMatches) {
        fields.push(match[1]);
      }

      // orderBy() Felder
      const orderMatches = context.matchAll(/orderBy\s*\(\s*['"]([^'"]+)['"]/g);
      for (const match of orderMatches) {
        fields.push(match[1]);
      }

      // Nur wenn Composite Query (2+ Felder)
      if (fields.length >= 2) {
        patterns.push({
          file: filePath,
          line: i + 1,
          collection,
          fields,
          context: context.substring(0, 200) // Nur erste 200 Zeichen
        });
      }
    }
  } catch (err) {
    // Ignore
  }
}

/**
 * Lädt Indexes
 */
function loadExistingIndexes(): FirestoreIndex[] {
  try {
    const content = readFileSync('./firestore.indexes.json', 'utf-8');
    const data = JSON.parse(content);
    return data.indexes || [];
  } catch (err) {
    console.error('❌ Fehler beim Laden von firestore.indexes.json:', err);
    return [];
  }
}

/**
 * Prüft ob Index existiert
 */
function hasMatchingIndex(query: QueryPattern, indexes: FirestoreIndex[]): boolean {
  return indexes.some(index => {
    // Collection muss passen
    if (index.collectionGroup !== query.collection) {
      return false;
    }

    // Alle Query-Felder müssen im Index sein
    return query.fields.every(field =>
      index.fields.some(f => f.fieldPath === field)
    );
  });
}

/**
 * Generiert Index-Vorschlag
 */
function generateIndexSuggestion(query: QueryPattern): string {
  const fields = query.fields.map(f => ({
    fieldPath: f,
    order: 'ASCENDING'
  }));

  return JSON.stringify({
    collectionGroup: query.collection,
    queryScope: 'COLLECTION',
    fields
  }, null, 2);
}

/**
 * Main
 */
function main() {
  console.log('🔍 Scanning codebase for Firestore queries...\n');

  // 1. Scanne Code
  const queries = scanDirectory('./src');

  // Dedupliziere (gleiche Collection + gleiche Felder)
  const uniqueQueries: QueryPattern[] = [];
  for (const query of queries) {
    const key = `${query.collection}:${query.fields.sort().join(',')}`;
    if (!uniqueQueries.some(q =>
      `${q.collection}:${q.fields.sort().join(',')}` === key
    )) {
      uniqueQueries.push(query);
    }
  }

  console.log(`✅ Found ${uniqueQueries.length} unique composite queries\n`);

  // 2. Lade Indexes
  const indexes = loadExistingIndexes();
  console.log(`📊 Loaded ${indexes.length} indexes from firestore.indexes.json\n`);

  // 3. Finde fehlende
  const missing: QueryPattern[] = [];

  for (const query of uniqueQueries) {
    if (!hasMatchingIndex(query, indexes)) {
      missing.push(query);
    }
  }

  // 4. Ausgabe
  if (missing.length === 0) {
    console.log('✅ All queries have matching indexes!\n');
    process.exit(0);
  }

  console.log(`❌ Found ${missing.length} queries without matching indexes:\n`);

  for (const query of missing) {
    console.log(`📄 ${query.file}:${query.line}`);
    console.log(`   Collection: ${query.collection}`);
    console.log(`   Fields: ${query.fields.join(', ')}`);
    console.log('\n   Suggested index:');
    console.log('   ' + generateIndexSuggestion(query).split('\n').join('\n   '));
    console.log('');
  }

  console.log('\n💡 To fix:');
  console.log('1. Add suggested indexes to firestore.indexes.json');
  console.log('2. Run: firebase deploy --only firestore:indexes');
  console.log('3. Wait for indexes to build in Firebase Console\n');

  process.exit(1);
}

main();
