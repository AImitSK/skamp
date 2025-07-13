# INSTRUCTIONS.MD: Kollaborations-Workflow KI & Entwickler

Dieses Dokument definiert den Prozess und die grundlegenden Regeln für die Zusammenarbeit bei der Implementierung neuer Features.

## 1. Kollaborations-Workflow

Wir verfolgen einen strukturierten, schrittweisen Prozess, um Klarheit und Qualität sicherzustellen. Jeder Schritt erfordert eine explizite Bestätigung, bevor der nächste begonnen wird.

1.  **Problem-Definition**: Das zu lösende Problem oder das zu bauende Feature wird definiert (z.B. "Seite für Versand-Domains erstellen").
2.  **Analyse & Rückfragen**: Ich (die KI) analysiere die Anforderung. Ich fordere die für die Aufgabe relevanten Dateiinhalte an und stelle eventuelle Rückfragen, um das Ziel vollständig zu verstehen.
3.  **Lösungs-Vorschlag**: Bevor Code erstellt wird, beschreibe ich kurz den Lösungsansatz für die jeweilige Datei (z.B. "Ich werde eine neue React-Komponente `DomainPage` in `page.tsx` erstellen...").
4.  **Startschuss**: Du (der Entwickler) prüfst den Vorschlag und gibst den expliziten **Startschuss** (z.B. "Ok, Startschuss").
5.  **Implementierung**: Ich stelle den Code für die vereinbarte Datei bereit. Du implementierst den Code in der Projektumgebung.
6.  **Test & Review**: Du testest die Implementierung auf Funktionalität und mögliche Fehler. Wir besprechen gemeinsam potenzielle Probleme oder notwendige Anpassungen.
7.  **Abschluss & Nächster Schritt**: Erst wenn ein Schritt erfolgreich abgeschlossen und abgenommen ist, gehen wir zur nächsten Datei oder zum nächsten Feature über.

## 2. Grundprinzip der Code-Generierung

**Bevorzuge vollständige Dateien statt Code-Schnipsel.**
Um Integrationsaufwand zu minimieren und Fehler zu vermeiden, ist es grundsätzlich die beste Vorgehensweise, vollständige Dateiinhalte ohne Platzhalter zu erzeugen. Ich (die KI) werde daher, wann immer praktikabel, den gesamten Code für eine Datei bereitstellen. Du (der Entwickler) kannst diesen dann direkt kopieren und einfügen, anstatt einzelne Blöcke manuell zusammensetzen zu müssen.

## 3. Technische & Stilistische Grundlagen

### UI-Komponenten-Bibliothek

Wir verwenden primär die UI-Komponenten aus **Catalyst UI**. Eigene Komponenten werden nur erstellt, wenn es keine passende Catalyst-Komponente gibt.

### Style & Code-Referenzen

Das Design und die technische Umsetzung neuer Seiten und Komponenten sollen sich an den folgenden, bereits existierenden Implementierungen orientieren:

* **Seiten-Layout und Datenanzeige:**
    * `src/app/dashboard/contacts/crm/page.tsx`
    * `src/app/dashboard/contacts/lists/page.tsx`
* **Modal-Implementierungen:**
    * `src/app/dashboard/contacts/crm/ContactModal.tsx`

### Wichtige Hinweise zu spezifischen Komponenten

* **Button & Badge:** Die im Projekt verwendeten `Button`- und `Badge`-Komponenten (`src/components/button.tsx`, `src/components/badge.tsx`) sind angepasst. Bei der Verwendung ist darauf zu achten, dass Texte, die aus mehreren Wörtern bestehen, **nicht umbrechen**. Dies wird in der Regel durch CSS-Klassen wie `whitespace-nowrap` erreicht. Ich werde dies bei Code-Vorschlägen berücksichtigen.