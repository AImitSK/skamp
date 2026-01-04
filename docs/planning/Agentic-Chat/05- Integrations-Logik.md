CeleroPress: Integrations-Logik & Datenformate

Dieses Dokument definiert das "Bindegewebe" zwischen dem Orchestrator und den Spezialisten sowie die exakten Datenstrukturen für die Tool-Calls.

1. Der Handoff-Mechanismus (Skill Orchestration)

Wenn der Orchestrator entscheidet, einen Spezialisten zu aktivieren, nutzt er den Skill skill_handoff.

skill_handoff(agentId: string, context: object)

agentId: z.B. swot_specialist, briefing_specialist.

context: Enthält relevante Daten aus dem bisherigen Chat, damit der neue Agent nicht bei Null anfängt.

Logik:

Orchestrator erkennt den User-Wunsch: "Lass uns die SWOT machen."

Orchestrator ruft skill_handoff auf.

Das System wechselt den System-Prompt zum gewählten Agenten.

Der neue Agent begrüßt den User und nutzt skill_roadmap, um den Fokus zu setzen.

2. Datenformate (JSON Schemas)

Damit das Frontend die Toolbox-Elemente korrekt rendern kann, müssen die Agenten folgende Strukturen liefern:

A. Roadmap-Payload (skill_roadmap)

{
  "phases": ["Fakten", "Analyse", "Ziele", "Strategie"],
  "currentPhaseIndex": 0
}


B. ToDo-Payload (skill_todos)

Wird nach jeder Interaktion gesendet, um die Kreise (○), (◐), (●) zu steuern.

{
  "items": [
    { "id": "t1", "label": "Branche klären", "status": "done", "value": "SaaS" },
    { "id": "t2", "label": "Zielgruppen", "status": "partial", "value": "PR-Agenturen..." },
    { "id": "t3", "label": "Wettbewerber", "status": "open" }
  ]
}


C. Confirmation-Payload (skill_confirm)

{
  "title": "Zusammenfassung Phase 1",
  "summary": {
    "Unternehmen": "CeleroPress",
    "Branche": "PR-Software",
    "Fokus": "KI-Automatisierung"
  }
}


3. State Management & Status-Transition

Der Status eines Dokuments wird im Lebenszyklus eines Chats strikt verwaltet, um die Konsistenz zwischen UI und Datenbank (Firestore) zu wahren.

Von "Entwurf" (draft) zu "Vollständig" (completed)

Initialer Status: Sobald ein Spezialist geladen wird, befindet sich das Dokument im Status draft.

Live-Updates: Der Agent nutzt skill_sidebar.updateDraft(), um den Inhalt in der Sidebar während des Chats zu aktualisieren. Der Status bleibt draft.

Abschluss-Trigger: Sobald alle Aufgaben in skill_todos auf done stehen, muss der Agent zwingend skill_confirm.requestApproval() aufrufen.

Nutzer-Bestätigung:

Klickt der User auf [Anpassen], bleibt der Agent im Chat-Modus (Status draft).

Klickt der User auf [Ja], triggert das Frontend den Skill skill_sidebar.finalizeDocument().

Finalisierung: finalizeDocument() speichert den endgültigen Content und setzt das Status-Feld in Firestore permanent auf completed.

4. Trigger für die 🧪 DNA-Synthese

Die DNA-Synthese ist kein Chat-Prozess, sondern eine Batch-Aktion.

Trigger: Der Orchestrator prüft den Status aller 6 Dokumente.

Aktion: Wenn alle 6 Dokumente completed sind (nach erfolgreichem Handoff und Finalisierung), bietet der Orchestrator via skill_suggestions den Button [🧬 DNA synthetisieren] an.

Prozess: Ein interner Call liest alle 6 Dokumente, schickt sie an den synthesis_flow und speichert das Ergebnis im dna_vault.

5. Fehlerbehandlung & Fallbacks

Crawler-Fehler: Wenn skill_url_crawler fehlschlägt, muss der Agent dies dem User mitteilen: "Ich konnte die URL nicht lesen. Kannst du mir die wichtigsten Infos hier reinkopieren?"

Tool-Mismatch: Falls ein Agent ein Tool aufruft, das er nicht besitzt, fängt der Orchestrator den Fehler ab und leitet zurück.