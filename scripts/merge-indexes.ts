/**
 * Merged critical-indexes.json in firestore.indexes.json
 */

import { readFileSync, writeFileSync } from 'fs';

const existing = JSON.parse(readFileSync('./firestore.indexes.json', 'utf-8'));
const critical = JSON.parse(readFileSync('./critical-indexes.json', 'utf-8'));

console.log(`📊 Existing indexes: ${existing.indexes.length}`);
console.log(`🎯 Critical indexes: ${critical.length}`);

// Add density to critical indexes
const criticalWithDensity = critical.map((idx: any) => ({
  ...idx,
  density: 'SPARSE_ALL'
}));

// Merge (append to end)
const merged = {
  indexes: [
    ...existing.indexes,
    ...criticalWithDensity
  ],
  fieldOverrides: existing.fieldOverrides || []
};

console.log(`✅ Total indexes: ${merged.indexes.length}`);

// Save
writeFileSync('./firestore.indexes.json', JSON.stringify(merged, null, 2));
console.log('\n✅ Merged! firestore.indexes.json updated');
console.log('\n💡 Next: firebase deploy --only firestore:indexes');
