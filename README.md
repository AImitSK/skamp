# skamp - Marketing Tool Suite

Willkommen bei skamp, einer umfassenden All-in-One Marketing-Tool-Suite, die als moderne Webanwendung entwickelt wird.

## Projektbeschreibung

Das Ziel dieses Projekts ist die Schaffung einer zentralen Plattform für Marketing-Aktivitäten. Die Anwendung wird modular aufgebaut sein und schrittweise um neue Funktionen erweitert.

Die erste und grundlegende Kernfunktion ist eine robuste **Kontaktverwaltung (CRM)**. Auf dieser Basis werden zukünftige Tools wie Kampagnen-Management, E-Mail-Marketing und Analysen aufbauen.

Die Architektur trennt klar zwischen einem öffentlichen Bereich (zur Vorstellung und zum Verkauf der Software) und einem geschützten Mitgliederbereich, in dem die eigentlichen Tools zur Verfügung stehen.

## Technologie-Stack

Dieses Projekt wird mit einem modernen und skalierbaren Technologie-Stack umgesetzt:

-   **Framework:** [Next.js](https://nextjs.org/) (mit React 18)
-   **Sprache:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Backend-as-a-Service (BaaS):** [Google Firebase](https://firebase.google.com/) für Authentifizierung, Datenbank (Firestore) und weitere Dienste.
-   **UI-Komponenten (geplant):** [Catalyst UI Kit](https://catalyst.tailwindui.com/) für den geschützten Anwendungsbereich.

## Projektstruktur

Das Projekt verwendet den Next.js App Router und ist wie folgt strukturiert:

-   **`src/app/`**: Das Herzstück der Anwendung. Jeder Ordner hier definiert eine Route.
    -   `page.tsx`: Die öffentliche Start- und Login-Seite.
    -   `layout.tsx`: Das Hauptlayout der gesamten Anwendung.
-   **`src/context/`**: Beinhaltet React Context-Provider.
    -   `AuthContext.tsx`: Stellt den globalen Anmeldestatus des Benutzers in der gesamten App zur Verfügung.
-   **`src/lib/firebase/`**: Kapselt die Firebase-Logik.
    -   `config.ts`: Liest die geheimen Schlüssel aus der `.env.local`-Datei.
    -   `client-init.ts`: Initialisiert Firebase sicher für die Verwendung im Browser.

## Installation und Lokaler Start

Um das Projekt lokal auszuführen, folgen Sie diesen Schritten:

1.  **Repository klonen:**
    ```bash
    git clone [https://github.com/AImitSK/skamp.git](https://github.com/AImitSK/skamp.git)
    cd skamp
    ```

2.  **Abhängigkeiten installieren:**
    ```bash
    npm install
    ```

3.  **Umgebungsvariablen einrichten:**
    -   Erstellen Sie im Hauptverzeichnis eine Datei namens `.env.local`.
    -   Fügen Sie Ihre Firebase-Projekt-Schlüssel in diese Datei ein. Eine Vorlage finden Sie in der Dokumentation oder nach dem Anlegen eines neuen Firebase-Projekts.
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY="IHR_WERT"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="IHR_WERT"
    # ... und so weiter für alle benötigten Schlüssel
    ```

4.  **Entwicklungsserver starten:**
    ```bash
    npm run dev
    ```

Die Anwendung ist nun unter `http://localhost:3000` erreichbar.