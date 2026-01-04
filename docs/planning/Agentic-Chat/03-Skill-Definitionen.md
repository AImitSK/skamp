CeleroPress: Skill-Definitionen (Tool-Spezifikationen)

Dieses Dokument definiert die technischen Schnittstellen für die modularen Skills, die von den CeleroPress Spezialisten-Agenten genutzt werden.

1. UI & Prozess-Skills

skill_roadmap

Steuert die horizontale Phasen-Anzeige am Anfang des Chats.

showRoadmap(phases: string[]): Initialisiert die Roadmap mit einer Liste von Phasen-Namen.

completePhase(phaseIndex: number): Markiert eine Phase als abgeschlossen (Häkchen-Symbol).

skill_todos

Verwaltet die vertikale Checkliste innerhalb der aktiven Phase.

updateTodoStatus(items: TodoItem[]): Aktualisiert die Liste der Fragen/Aufgaben.

TodoItem: { id: string, label: string, status: 'open' | 'partial' | 'done', value?: string }

status: 'open' -> (○)

status: 'partial' -> (◐)

status: 'done' -> (●)

skill_suggestions

Aktualisiert die interaktiven Antwort-Vorschläge (Quick-Replies) für den User.

updateSuggestions(prompts: string[]): Ersetzt die aktuellen Action-Bubbles unter dem Input-Feld durch neue Vorschläge.

skill_confirm

Triggert die interaktive Result-Box zur Bestätigung von Zwischenergebnissen.

requestApproval(title: string, summary: Record<string, string>): Zeigt eine Box mit den gesammelten Daten und den Buttons [Ja] und [Anpassen].

2. Recherche & Daten-Skills

skill_url_crawler

Ermöglicht der KI den Zugriff auf externe Webseiten-Inhalte.

analyzeUrl(url: string): Ruft den Inhalt einer URL ab (via Jina AI / Firecrawl) und gibt ein strukturiertes Markdown der Seite zurück.

skill_dna_lookup

Der Zugriff auf das strategische Gedächtnis des Kunden.

fetchDnaContext(companyId: string, docType?: string): Lädt die 🧪 DNA-Synthese oder spezifische Dokumente (SWOT, Briefing etc.) als Kontext.

3. Sidebar & Dokumenten-Management

skill_sidebar

Steuert den Inhalt der Sidebar (Artifact) während und nach dem Chat.

updateDraft(content: string): Aktualisiert den Inhalt in der Sidebar live, ohne den Chat zu unterbrechen. Der User sieht den Fortschritt parallel.

finalizeDocument(content: string): Markiert das Dokument als fertiggestellt, speichert es in der Datenbank und setzt den Status auf completed.

4. Technische Regeln für Tool-Calls

JSON-Format: Alle Parameter müssen als valides JSON übergeben werden.

Keine Tags: Die KI darf keine manuellen UI-Tags ([PROGRESS], [SUGGESTIONS], [DOCUMENT]) mehr generieren.

Zustand: Die UI verwaltet den visuellen Zustand basierend auf den Rückgabewerten dieser Funktionen.