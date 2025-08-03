# ADR-0007: TipTap als Rich-Text Editor

**Status:** Accepted  
**Datum:** 2024-12-22  
**Entscheider:** Development Team / Claude AI Empfehlung  

## Kontext

SKAMP benötigt einen Rich-Text Editor für die Erstellung von Pressemeldungen. Der Editor muss:
- Moderne, professionelle Formatierungen unterstützen
- Erweiterbar sein für zukünftige Features
- Gut mit React/Next.js integrierbar sein
- Eine gute Developer Experience bieten
- Zuverlässig und performant sein

Aktuell fehlen noch wichtige Features wie Farben, Links, Überschriften und ein größeres Bearbeitungsfenster.

## Entscheidung

Wir verwenden TipTap als Rich-Text Editor für SKAMP.

## Alternativen

### Option 1: TipTap ✅
- **Vorteile:**
  - Basiert auf ProseMirror (sehr robust)
  - Headless - volle Kontrolle über UI
  - Exzellente React-Integration
  - Modular und erweiterbar
  - TypeScript Support
  - Aktive Entwicklung
  - Kann Schritt für Schritt ausgebaut werden
- **Nachteile:**
  - Mehr Implementierungsaufwand für UI
  - Kostenpflichtige Pro-Features
  - Lernkurve für ProseMirror-Konzepte

### Option 2: Quill
- **Vorteile:**
  - Fertige UI out-of-the-box
  - Große Community
  - Viele Themes verfügbar
- **Nachteile:**
  - Schwerer anzupassen
  - Weniger moderne Architektur
  - React-Integration nicht optimal

### Option 3: Slate
- **Vorteile:**
  - Sehr flexibel
  - React-first Design
  - Gute Plugin-Architektur
- **Nachteile:**
  - Noch mehr Low-Level als TipTap
  - Kleinere Community
  - Mehr Bugs

### Option 4: CKEditor 5
- **Vorteile:**
  - Sehr feature-reich
  - Professionelle Lösung
  - Guter Support
- **Nachteile:**
  - Heavyweight
  - Lizenzkosten
  - Overkill für Pressemeldungen

### Option 5: Markdown Editor (z.B. MDX)
- **Vorteile:**
  - Einfach
  - Entwicklerfreundlich
  - Versionskontrolle-freundlich
- **Nachteile:**
  - Nicht nutzerfreundlich für Nicht-Techniker
  - Limitierte Formatierungen
  - Keine WYSIWYG-Erfahrung

## Begründung

TipTap wurde gewählt (auf Empfehlung von Claude AI), weil:
1. **Flexibilität**: Als Headless-Editor können wir die UI perfekt an SKAMP anpassen
2. **Erweiterbarkeit**: Neue Features (Farben, Links, etc.) können schrittweise hinzugefügt werden
3. **Performance**: Basiert auf ProseMirror, einem der robustesten Editor-Frameworks
4. **Zukunftssicher**: Aktive Entwicklung und moderne Architektur
5. **Developer Experience**: Exzellente TypeScript-Integration

## Konsequenzen

### Positive
- Volle Kontrolle über das Aussehen und Verhalten
- Kann mit den Anforderungen wachsen
- Professionelle Editor-Features möglich
- Gute Performance auch bei langen Texten

### Negative
- Mehr Entwicklungsaufwand für UI-Komponenten
- Muss selbst um Features erweitert werden
- Pro-Features könnten später Kosten verursachen

### Neutral
- Editor-Toolbar muss selbst implementiert werden
- Erweiterungen müssen konfiguriert werden
- Styling muss angepasst werden

## Notizen

### Geplante Erweiterungen
1. **Phase 1** (Sofort):
   - Überschriften (H1, H2, H3)
   - Links mit Target-Optionen
   - Fett, Kursiv, Unterstrichen
   - Listen (Nummeriert, Aufzählung)

2. **Phase 2** (Nächste Iteration):
   - Textfarben und Hintergrundfarben
   - Textausrichtung
   - Größeres Bearbeitungsfenster (Fullscreen-Modus)
   - Tabellen

3. **Phase 3** (Zukunft):
   - Bild-Upload direkt im Editor
   - Vorlagen-System
   - Kommentare/Kollaboration
   - Versionsverlauf

### Implementierungshinweise
```typescript
// Beispiel für Erweiterungen
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Heading from '@tiptap/extension-heading'

const editor = useEditor({
  extensions: [
    StarterKit,
    Link.configure({ openOnClick: false }),
    Color,
    TextStyle,
    Heading.configure({ levels: [1, 2, 3] })
  ]
})
```

## Referenzen

- [TipTap Dokumentation](https://tiptap.dev/docs)
- [TipTap Examples](https://tiptap.dev/examples)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [Issue: Editor-Erweiterungen](https://github.com/skamp/issues/xxx)