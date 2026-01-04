CeleroPress: Modulare Agentic-Architektur

1. Vision

Ein hochgradig modulares System aus Spezialisten-Agenten, die über dedizierte Prompts gesteuert werden und auf einen globalen Satz von Skills zugreifen. Ziel ist maximale Wartbarkeit und Stabilität durch "Separation of Concerns".

2. Modulare Hierarchie

Das System ist in vier Ebenen unterteilt:

Orchestrator: Steuert den Übergang zwischen den Dokumenten.

Spezialisten (Agents): KI-Einheiten für spezifische Aufgaben (z.B. SWOT-Experte).

Prompts: Die individuellen "Gehirne" der Spezialisten (System-Anweisungen).

Skills (Tools): Die "Hände" der Agenten (Funktionen wie Crawler, UI-Updates).

3. Spezialisten-Verzeichnis (/.celero/agents/)

Jedes der 7 Dokumente erhält einen eigenen Spezialisten-Agenten:

Marken-DNA Spezialisten

briefing_specialist: Fokus auf Faktenextraktion und Validierung.

swot_specialist: Analytisches Denken, "Advocatus Diaboli" Rolle.

audience_specialist: Empathie-Mapping und Zielgruppen-Segmentierung.

positioning_specialist: Kreative Nischenfindung und Tonalitäts-Design.

goals_specialist: Ergebnisorientierung, SMART-Kriterien Experte.

messages_specialist: Rhetorik-Experte für Kern, Beweis, Nutzen.

Operative Spezialisten

project_wizard: Verknüpft DNA-Synthese mit tagesaktuellen News-Hooks.

4. Skill-Verzeichnis (/.celero/skills/)

Skills sind unabhängig von den Agenten und können modular geladen werden.

UI & Prozess-Skills

skill_roadmap: Steuert die visuelle Phasen-Anzeige (showRoadmap, completePhase).

skill_todos: Verwaltet die vertikale Checkliste innerhalb einer Phase (updateTodoStatus).

skill_confirm: Triggert die Result-Box für User-Freigaben (requestApproval).

Recherche & Daten-Skills

skill_url_crawler: Analysiert Webseiten via Jina AI/Firecrawl für das Briefing.

skill_dna_lookup: Ermöglicht Spezialisten den Lesezugriff auf bereits fertige DNA-Dokumente.

skill_doc_generator: Finalisiert den Plain-Text in das [DOCUMENT] Format für die Sidebar.

5. Workflow: Der agentische Loop

Der Prozess wird nicht mehr durch "Frage-Antwort-Text" gesteuert, sondern durch Zustandsänderungen:

Setup: Orchestrator lädt den passenden Spezialisten (z.B. swot_specialist).

Context: Spezialist lädt skill_dna_lookup (Ebene 1 Kontext).

Action: Spezialist ruft skill_roadmap auf, um den Prozess zu visualisieren.

Interaction:

User postet URL -> Spezialist nutzt skill_url_crawler.

Spezialist erkennt Info-Lücken -> Ruft skill_todos auf, um ToDos abzuhaken.

Validation: Sobald alle ToDos in skill_todos auf (●) stehen, ruft der Spezialist skill_confirm auf.

Handover: Nach User-Bestätigung speichert der Spezialist das Ergebnis und gibt an den Orchestrator zurück.

6. Vorteile der Modularität

Isolation: Ein Fehler im SWOT-Prompt beeinträchtigt nicht das Briefing.

Testbarkeit: Jeder Skill (z.B. Crawler) kann isoliert getestet werden.

Skalierbarkeit: Neue Dokumenttypen brauchen nur einen neuen Prompt und nutzen bestehende Skills.

Token-Effizienz: Spezialisten laden nur die Tools und Prompt-Teile, die sie wirklich benötigen.