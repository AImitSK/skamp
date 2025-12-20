#!/usr/bin/env python3
"""
Script zum Hinzufügen der markenDNA i18n Keys zu den messages/de.json und messages/en.json Dateien.
"""

import json
import sys
from pathlib import Path

# markenDNA Keys für Deutsch
markendna_de = {
    "markenDNA": {
        "title": "Marken DNA",
        "subtitle": "Strategische Positionierung Ihrer Kunden",
        "searchPlaceholder": "Kunden durchsuchen...",
        "results": {
            "customer": "Kunde",
            "customers": "Kunden",
            "found": "gefunden",
            "selected": "ausgewählt"
        },
        "filter": {
            "status": "Status",
            "all": "Alle",
            "complete": "Vollständig",
            "incomplete": "Unvollständig",
            "reset": "Zurücksetzen"
        },
        "table": {
            "name": "Name",
            "status": "Status",
            "updated": "Aktualisiert"
        },
        "actions": {
            "view": "Anzeigen",
            "edit": "Bearbeiten",
            "delete": "Löschen",
            "deleteAll": "Alle Dokumente löschen",
            "save": "Speichern & Schließen",
            "saving": "Speichert...",
            "cancel": "Abbrechen"
        },
        "documents": {
            "briefing": "Briefing-Check",
            "swot": "SWOT-Analyse",
            "audience": "Zielgruppen-Radar",
            "positioning": "Positionierungs-Diamant",
            "goals": "Ziele-Setzer",
            "messages": "Botschaften-Baukasten"
        },
        "modal": {
            "for": "für",
            "aiAssistant": "KI-Assistent",
            "document": "Dokument",
            "messagePlaceholder": "Nachricht eingeben...",
            "chatComingSoon": "KI-Chat wird in Phase 3 implementiert",
            "chatDescription": "Hier können Sie später mit dem KI-Assistenten das {documentType} Dokument erarbeiten.",
            "noContent": "Noch kein Inhalt vorhanden",
            "noContentDescription": "Nutzen Sie den KI-Chat, um das Dokument zu erstellen."
        },
        "confirmDelete": "Möchten Sie wirklich alle Marken-DNA Dokumente für \"{companyName}\" löschen?",
        "confirmBulkDelete": "Möchten Sie wirklich {count} Kunden löschen?"
    }
}

# markenDNA Keys für Englisch
markendna_en = {
    "markenDNA": {
        "title": "Brand DNA",
        "subtitle": "Strategic positioning of your clients",
        "searchPlaceholder": "Search clients...",
        "results": {
            "customer": "Client",
            "customers": "Clients",
            "found": "found",
            "selected": "selected"
        },
        "filter": {
            "status": "Status",
            "all": "All",
            "complete": "Complete",
            "incomplete": "Incomplete",
            "reset": "Reset"
        },
        "table": {
            "name": "Name",
            "status": "Status",
            "updated": "Updated"
        },
        "actions": {
            "view": "View",
            "edit": "Edit",
            "delete": "Delete",
            "deleteAll": "Delete all documents",
            "save": "Save & Close",
            "saving": "Saving...",
            "cancel": "Cancel"
        },
        "documents": {
            "briefing": "Briefing Check",
            "swot": "SWOT Analysis",
            "audience": "Audience Radar",
            "positioning": "Positioning Diamond",
            "goals": "Goal Setter",
            "messages": "Message Builder"
        },
        "modal": {
            "for": "for",
            "aiAssistant": "AI Assistant",
            "document": "Document",
            "messagePlaceholder": "Type a message...",
            "chatComingSoon": "AI Chat will be implemented in Phase 3",
            "chatDescription": "You will be able to work on the {documentType} document with the AI assistant here later.",
            "noContent": "No content yet",
            "noContentDescription": "Use the AI chat to create the document."
        },
        "confirmDelete": "Do you really want to delete all Brand DNA documents for \"{companyName}\"?",
        "confirmBulkDelete": "Do you really want to delete {count} clients?"
    }
}

# Toast Messages für Deutsch
toasts_de = {
    "markenDNA": {
        "documentSaved": "Dokument erfolgreich gespeichert",
        "documentDeleted": "Dokument erfolgreich gelöscht",
        "allDocumentsDeleted": "Alle Dokumente erfolgreich gelöscht",
        "saveError": "Fehler beim Speichern: {message}",
        "deleteError": "Fehler beim Löschen: {message}",
        "loadError": "Dokumente konnten nicht geladen werden"
    }
}

# Toast Messages für Englisch
toasts_en = {
    "markenDNA": {
        "documentSaved": "Document saved successfully",
        "documentDeleted": "Document deleted successfully",
        "allDocumentsDeleted": "All documents deleted successfully",
        "saveError": "Error saving: {message}",
        "deleteError": "Error deleting: {message}",
        "loadError": "Could not load documents"
    }
}

def add_keys_to_json(file_path: Path, new_keys: dict, toast_keys: dict):
    """Fügt die neuen Keys zur JSON-Datei hinzu."""
    print(f"Bearbeite {file_path}...")

    # Lese die Datei
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Füge markenDNA Keys hinzu (falls noch nicht vorhanden)
    if "markenDNA" not in data:
        data["markenDNA"] = new_keys["markenDNA"]
        print(f"  + markenDNA Keys hinzugefuegt")
    else:
        print(f"  ! markenDNA Keys bereits vorhanden - ueberspringe")

    # Füge toasts.markenDNA Keys hinzu
    if "toasts" not in data:
        data["toasts"] = {}

    if "markenDNA" not in data["toasts"]:
        data["toasts"]["markenDNA"] = toast_keys["markenDNA"]
        print(f"  + toasts.markenDNA Keys hinzugefuegt")
    else:
        print(f"  ! toasts.markenDNA Keys bereits vorhanden - ueberspringe")

    # Schreibe die Datei zurück (mit Einrückung für Lesbarkeit)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  + {file_path} aktualisiert\n")

def main():
    # Finde das Projekt-Root-Verzeichnis
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    messages_dir = project_root / "messages"

    # Prüfe, ob messages/ Verzeichnis existiert
    if not messages_dir.exists():
        print(f"[ERROR] {messages_dir} existiert nicht!")
        sys.exit(1)

    # Bearbeite de.json
    de_file = messages_dir / "de.json"
    if de_file.exists():
        add_keys_to_json(de_file, markendna_de, toasts_de)
    else:
        print(f"[ERROR] {de_file} existiert nicht!")
        sys.exit(1)

    # Bearbeite en.json
    en_file = messages_dir / "en.json"
    if en_file.exists():
        add_keys_to_json(en_file, markendna_en, toasts_en)
    else:
        print(f"[ERROR] {en_file} existiert nicht!")
        sys.exit(1)

    print("[SUCCESS] Alle i18n Keys erfolgreich hinzugefuegt!")

if __name__ == "__main__":
    main()
