# Projekt-Erweiterung: Freigabe-Workflow für PR-Kampagnen

Dieses Dokument beschreibt den Plan zur Implementierung eines professionellen Freigabe-Workflows in die PR-Toolbox. Ziel ist es, die Zusammenarbeit zwischen PR-Agenturen und ihren Kunden zu vereinfachen, zu professionalisieren und zu beschleunigen.

## Kernaussage

Wir führen einen neuen **Freigabe-Workflow** ein, der durch eine Checkbox bei der Erstellung einer Pressemitteilung ausgelöst wird. Das Kernstück ist eine **öffentliche Freigabe-Seite**, auf der Kunden ohne Login Feedback geben oder die Freigabe erteilen können. Der gesamte Prozess wird in einem neuen Navigationsbereich namens **"Freigaben"** im Dashboard verwaltet.

---

## Implementierungsplan

### Phase 1: Anpassung des Datenmodells & Backends

Das Fundament des neuen Prozesses sind Erweiterungen an den bestehenden Datenmodellen in `src/types/pr.ts` und dem dazugehörigen Backend-Service.

1.  **PR-Kampagnen-Status erweitern:**
    Das `PRCampaignStatus`-Typ-Alias wird um neue Zustände für den Freigabeprozess ergänzt.

    ```typescript
    // src/types/pr.ts
    export type PRCampaignStatus =
      | 'draft'               // Entwurf (aktuell)
      | 'in_review'           // NEU: Warten auf Kunden-Feedback
      | 'changes_requested'   // NEU: Kunde wünscht Änderungen
      | 'approved'            // NEU: Vom Kunden freigegeben
      | 'scheduled'           // Geplant
      | 'sent'                // Versendet
      | 'archived';           // Archiviert
    ```

2.  **`PRCampaign`-Interface erweitern:**
    Die Kampagne selbst erhält neue Felder zur Steuerung und Protokollierung des Freigabeprozesses.

    ```typescript
    // src/types/pr.ts
    export interface PRCampaign {
      // ... bestehende Felder ...

      // NEU: Freigabe-Management
      approvalRequired: boolean; // Steuert, ob der Workflow aktiv ist
      approvalData?: {
        shareId: string;       // Eindeutige, öffentliche ID für den Freigabe-Link
        status: 'pending' | 'viewed' | 'commented' | 'approved';
        feedbackHistory: Array<{
          comment: string;
          requestedAt: Timestamp;
          author: string; // z.B. "Kunde"
        }>;
        approvedAt?: Timestamp;
      };
    }
    ```

3.  **Backend-Service anpassen (`pr-service.ts`):**
    Der `pr-service` in `src/lib/firebase/pr-service.ts` wird um drei zentrale Funktionen erweitert:
    * `requestApproval(campaignId)`: Setzt Status auf `in_review` und erzeugt die `shareId`.
    * `submitFeedback(shareId, feedback)`: Speichert Kunden-Feedback und setzt Status auf `changes_requested`.
    * `approveCampaign(shareId)`: Setzt Status auf `approved` und speichert den Freigabezeitpunkt.

---

### Phase 2: Die öffentliche Freigabe-Seite

Diese Seite ist das Kernstück der Kundeninteraktion und wird unter `src/app/freigabe/[shareId]/page.tsx` erstellt. Sie erfordert keinen Login.

* **Aufbau:**
    * **Header:** Titel der Pressemitteilung und Name des Kunden.
    * **Inhalts-Anzeige:** Schreibgeschützte Ansicht des `contentHtml` der Kampagne.
    * **Status-Anzeige:** Eine klare visuelle Kennzeichnung des aktuellen Status (`In Prüfung`, `Freigegeben`).
    * **Aktions-Buttons:**
        * `Freigabe erteilen`: Ruft `approveCampaign()` auf.
        * `Änderungen anfordern`: Blendet ein Textfeld für Feedback ein.
    * **Feedback-Formular:** Ein `<textarea>`, um Kommentare zu senden, die an `submitFeedback()` übergeben werden.

---

### Phase 3: Integration in den bestehenden PR-Workflow

Die neuen Funktionen werden nahtlos in die bestehende Benutzeroberfläche integriert.

1.  **Kampagnen-Erstellung (`.../pr/campaigns/new/page.tsx`):**
    * Eine neue Checkbox **"Freigabe vom Kunden erforderlich"** wird hinzugefügt.
    * Ist die Checkbox aktiv, ändert sich der "Speichern"-Button zu **"Freigabe anfordern"**. Dieser Button triggert den `requestApproval`-Prozess und zeigt der Agentur den generierten Freigabe-Link an.

2.  **Versand-Sperre (`EmailSendModal.tsx`):**
    * Der Versand einer Pressemitteilung wird blockiert, solange eine erforderliche Freigabe (`approvalRequired: true`) nicht den Status `approved` hat.

---

### Phase 4: Der neue "Freigaben"-Bereich im Dashboard

Ein zentraler Ort für Agenturen, um den Überblick über alle Freigabeprozesse zu behalten.

1.  **Navigation (`.../dashboard/layout.tsx`):**
    * Ein neuer Menüpunkt **"Freigaben"** wird in der Sidebar hinzugefügt, der auf `/dashboard/freigaben` verweist.

2.  **Freigaben-Center (`.../dashboard/freigaben/page.tsx`):**
    * Eine tabellarische Übersicht aller Kampagnen, die eine Freigabe benötigen.
    * **Filterbare Ansicht** nach Status (`Warten auf Feedback`, `Änderungen erbeten`, `Freigegeben`).
    * **Tabellenspalten:** Kampagnentitel, Kunde, Status (als farbige Badge), Datum der letzten Aktivität und ein direkter Link zur öffentlichen Freigabe-Seite.

## Vorteile dieser Architektur

* **Klarer Prozess:** Eindeutige Status-Definitionen verhindern Missverständnisse.
* **Effizienz:** Zentrales Feedback- und Freigabe-Management ersetzt unübersichtlichen E-Mail-Verkehr.
* **Professionalität:** Kunden interagieren über eine saubere, gebrandete und einfach zu bedienende Oberfläche.
* **Lückenlose Dokumentation:** Alle Korrekturschleifen und die finale Freigabe werden automatisch und nachvollziehbar protokolliert.
* **Skalierbarkeit:** Die Architektur ist leicht auf andere Freigabe-Workflows (z.B. für Designs, Newsletter) übertragbar.