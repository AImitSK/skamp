#!/usr/bin/env python3
"""
Filtert kritische Indexes aus missing-indexes.txt
Kriterien: Production API Routes, häufig genutzte Collections
"""

import json
import re

# Kritische Collections (oft genutzt in Production)
CRITICAL_COLLECTIONS = {
    'team_members',
    'notifications',
    'campaigns',
    'contacts_enhanced',
    'companies_enhanced',
    'projects',
    'publications',
    'email_campaign_sends',
    'media_files',
    'pdf_templates'
}

# Pfade die wir NICHT wollen (Migrations, Tests, etc.)
SKIP_PATHS = [
    'migrate-campaign-assets',
    'test-',
    '__tests__',
    'scripts/',
    '.test.ts'
]

def should_skip(file_path):
    """Prüft ob Pfad übersprungen werden soll"""
    return any(skip in file_path for skip in SKIP_PATHS)

def is_critical_collection(collection):
    """Prüft ob Collection kritisch ist"""
    return collection in CRITICAL_COLLECTIONS

def parse_missing_indexes(filename):
    """Parse missing-indexes.txt"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Finde alle Index-Blöcke
    pattern = r'📄 (.*?):(\d+)\s+Collection: (\w+)\s+Fields: (.*?)\n\s+Suggested index:\s+(.*?)(?=📄|\n\n💡|$)'
    matches = re.findall(pattern, content, re.DOTALL)

    critical_indexes = []

    for file_path, line, collection, fields, suggested_json in matches:
        # Skip unwanted paths
        if should_skip(file_path):
            continue

        # Nur kritische Collections
        if not is_critical_collection(collection):
            continue

        # Parse JSON
        try:
            index_json = json.loads(suggested_json.strip())
            critical_indexes.append({
                'file': file_path,
                'line': line,
                'collection': collection,
                'fields': fields.strip(),
                'index': index_json
            })
        except:
            pass

    return critical_indexes

def main():
    indexes = parse_missing_indexes('missing-indexes.txt')

    print(f"🎯 Found {len(indexes)} critical indexes\n")
    print("=" * 80)

    for idx in indexes:
        print(f"\n📄 {idx['file']}:{idx['line']}")
        print(f"   Collection: {idx['collection']}")
        print(f"   Fields: {idx['fields']}")
        print(f"\n   Index JSON:")
        print("   " + json.dumps(idx['index'], indent=2).replace('\n', '\n   '))

    # Save to JSON for easy import
    with open('critical-indexes.json', 'w') as f:
        json.dump([idx['index'] for idx in indexes], f, indent=2)

    print(f"\n\n✅ Saved {len(indexes)} indexes to critical-indexes.json")
    print("💡 Add these to firestore.indexes.json manually")

if __name__ == '__main__':
    main()
