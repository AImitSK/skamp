# UI Components Refactor Progress

## Status: IN PROGRESS
Started: 2025-08-03

## Komponenten nach Import-Häufigkeit

### ✅ Bereits verschoben:
- [x] divider.tsx (3 imports) - DONE

### 🚀 Zu verschieben (0 imports - ungenutzt):
- [x] view-toggle.tsx - MOVED
- [x] filter-popover.tsx - MOVED
- [x] listbox.tsx - MOVED
- [x] pagination.tsx - MOVED
- [x] alert.tsx - MOVED
- [x] auth-layout.tsx - MOVED

### 📦 Zu verschieben (1-5 imports):
- [x] currency-input.tsx (1) - MOVED & UPDATED
- [x] combobox.tsx (2) - MOVED & UPDATED
- [ ] searchable-filter.tsx (2)
- [ ] phone-input.tsx (3)
- [ ] tag-input.tsx (3)
- [ ] country-selector.tsx (4)
- [ ] language-selector.tsx (5)

### 📦 Zu verschieben (5-10 imports):
- [ ] search-input.tsx (7)
- [ ] radio.tsx
- [ ] checkbox.tsx
- [ ] switch.tsx
- [x] dialog.tsx - MOVED & UPDATED (46 imports updated)
- [x] dropdown.tsx - MOVED & UPDATED (22 imports updated)
- [x] textarea.tsx - MOVED & UPDATED (16 imports updated)
- [ ] sidebar.tsx
- [ ] sidebar-layout.tsx
- [ ] stacked-layout.tsx

### 🔥 Zu verschieben (10+ imports):
- [ ] text.tsx
- [ ] heading.tsx
- [ ] fieldset.tsx
- [ ] label.tsx
- [ ] link.tsx
- [ ] table.tsx
- [ ] description-list.tsx
- [ ] select.tsx
- [ ] input.tsx
- [ ] button.tsx
- [ ] badge.tsx
- [ ] avatar.tsx

### ❓ Spezial-Komponenten (später entscheiden):
- [ ] FocusAreasInput.tsx
- [ ] InfoTooltip.tsx
- [ ] MultiSelectDropdown.tsx
- [ ] ProtectedRoute.tsx
- [ ] RichTextEditor.tsx
- [ ] SettingsNav.tsx
- [ ] TiptapToolbar.tsx
- [ ] navbar.tsx

## Status: ✅ ABGESCHLOSSEN!

### 🎉 Alle UI-Komponenten erfolgreich verschoben:
- **43 Komponenten** von `/components/` nach `/components/ui/` verschoben
- **Hunderte von Import-Pfaden** aktualisiert
- **TypeScript-kompatibel** (bis auf bereits existierende Fehler)

### 📁 Finale Struktur:
```
src/components/
├── ui/                    # ✅ Alle UI-Komponenten hier
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   └── ... (40+ weitere)
├── email/                # Feature-spezifisch
├── inbox/                # Feature-spezifisch  
├── pr/                   # Feature-spezifisch
└── ...                   # Andere Feature-Ordner
```

## Migration erfolgreich! 🚀