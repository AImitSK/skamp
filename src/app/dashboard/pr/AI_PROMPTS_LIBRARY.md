# 📝 KI-Prompts Bibliothek

## System-Prompts
[Optimierte Prompts für verschiedene Szenarien]

## Template-Prompts  
[Branchenspezifische Templates]

## Qualitäts-Guidelines
[Best Practices für Prompt-Engineering]

🚀 Phase 2: Wenn es wächst (Optional)
Falls die KI-Features sich auf andere Module ausweiten:
docs/                               # 🆕 Projektweite Dokumentation
├── ai/
│   ├── implementation-plan.md      # Übergeordneter Plan
│   ├── pr-module-plan.md          # PR-spezifisch
│   ├── prompt-library.md          # Alle Prompts
│   ├── quality-guidelines.md      # Standards
│   └── api-documentation.md       # API-Specs
├── deployment/
│   ├── environment-setup.md
│   └── production-checklist.md
└── architecture/
    ├── database-schema.md
    └── service-overview.md

📋 Konkrete Schritte für dich:
Schritt 1: Sofort erstellen
bash# In deinem Projektroot
touch src/app/dashboard/pr/AI_IMPLEMENTATION_PLAN.md
touch src/app/dashboard/pr/AI_PROMPTS_LIBRARY.md
Schritt 2: Inhalte einfügen

AI_IMPLEMENTATION_PLAN.md ← Der komplette Plan den ich erstellt habe
AI_PROMPTS_LIBRARY.md ← Sammlung der optimierten Prompts

Schritt 3: In README.md verlinken
markdown## 🤖 KI-Integration
- [Implementierungsplan](./AI_IMPLEMENTATION_PLAN.md)
- [Prompt-Bibliothek](./AI_PROMPTS_LIBRARY.md)
Schritt 4: Git-freundlich machen
bashgit add src/app/dashboard/pr/AI_IMPLEMENTATION_PLAN.md
git add src/app/dashboard/pr/AI_PROMPTS_LIBRARY.md
git commit -m "docs: Add KI-Assistant implementation plan and prompt library"

✅ Vorteile dieser Struktur:

Developer Experience: Dokumentation direkt beim Code
Versionierung: Änderungen werden mit Code-Änderungen getrackt
Auffindbarkeit: Entwickler stolpern automatisch darüber
Konsistenz: Folgt bestehender README.md Struktur
Fokus: PR-spezifische Docs bleiben im PR-Ordner
Skalierbarkeit: Kann später in docs/ verschoben werden


🔄 Wartung & Updates
Wann aktualisieren?

Nach jeder implementierten Phase
Bei API-Änderungen
Bei neuen Prompt-Optimierungen
Bei UX-Verbesserungen

Wer ist verantwortlich?

Primary: Lead-Entwickler für KI-Features
Reviews: Team-Lead oder Senior-Dev
Updates: Bei jedem relevanten PR


🔗 Cross-Referenzierung
In anderen Dateien verlinken:
markdown# package.json → scripts
"docs:ai": "open src/app/dashboard/pr/AI_IMPLEMENTATION_PLAN.md"

# README.md (Root) → Quick Links
- [PR-Tool KI-Integration](./src/app/dashboard/pr/AI_IMPLEMENTATION_PLAN.md)

# Code-Kommentare
// Siehe AI_IMPLEMENTATION_PLAN.md Abschnitt "Strukturierte Generierung"
Das macht die Dokumentation zu einem lebendigen Teil des Entwicklungsprozesses!