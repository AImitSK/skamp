# Branding-Guide

Anleitung zum Anpassen des Brandings für Share-Links.

---

## Branding-Einstellungen

Branding-Settings werden pro User in Firestore gespeichert:

```typescript
interface BrandingSettings {
  userId: string;
  companyName: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: {
    street: string;
    postalCode: string;
    city: string;
  };
  showCopyright: boolean;
}
```

---

## Logo hochladen

### Logo in Branding-Settings speichern

```typescript
import { brandingService } from '@/lib/firebase/branding-service';

async function uploadLogo(file: File, userId: string) {
  // 1. Upload Logo zu Storage
  const logoUrl = await uploadLogoToStorage(file, userId);

  // 2. Branding-Settings aktualisieren
  await brandingService.updateBrandingSettings(userId, {
    logoUrl,
  });

  return logoUrl;
}
```

**Logo-Anforderungen:**
- Format: PNG oder SVG (transparenter Hintergrund empfohlen)
- Größe: Max 500KB
- Dimensionen: 200x80px optimal

---

## Kontakt-Informationen

### Firmen-Daten hinterlegen

```typescript
await brandingService.updateBrandingSettings(userId, {
  companyName: 'Max Mustermann GmbH',
  phone: '+49 123 456789',
  email: 'info@example.com',
  website: 'https://example.com',
  address: {
    street: 'Musterstraße 123',
    postalCode: '12345',
    city: 'Musterstadt',
  },
  showCopyright: true,
});
```

---

## Share Page mit Branding

### Automatisches Branding auf Share Pages

```typescript
// src/app/share/[shareId]/page.tsx

export default function SharePage() {
  const { shareId } = useParams();
  const { data: shareLink } = useShareLink(shareId);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);

  useEffect(() => {
    async function loadBranding() {
      if (!shareLink) return;

      // ✅ Branding NUR für File/Folder Shares, NICHT für Campaign-Shares
      if (shareLink.type !== 'campaign' && shareLink.userId) {
        const settings = await brandingService.getBrandingSettings(shareLink.userId);
        setBranding(settings);
      }
    }

    loadBranding();
  }, [shareLink]);

  // Branding wird automatisch im Header und Footer angezeigt
}
```

---

## Branding-Komponenten

### Header mit Logo

```typescript
<div className="bg-white border-b">
  <div className="max-w-7xl mx-auto px-4 py-6">
    <div className="flex items-center justify-between">
      <div>
        <h1>{shareLink.title}</h1>
      </div>

      {/* Logo */}
      <div>
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.companyName}
            className="h-12 w-auto"
          />
        ) : (
          <div className="text-sm text-gray-400">
            <div>Freigabe-System</div>
            <div className="font-medium text-primary">Media Share</div>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
```

### Footer mit Kontakt-Informationen

```typescript
<div className="bg-white border-t mt-16">
  <div className="max-w-7xl mx-auto px-4 py-6">
    {branding ? (
      <div className="space-y-3">
        {/* Firmen-Info */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">
          {branding.companyName && (
            <span className="font-medium">{branding.companyName}</span>
          )}

          {branding.address && (
            <>
              <span className="text-gray-400">|</span>
              <span>
                {branding.address.street}, {branding.address.postalCode} {branding.address.city}
              </span>
            </>
          )}

          {branding.phone && (
            <>
              <span className="text-gray-400">|</span>
              <span>{branding.phone}</span>
            </>
          )}

          {branding.email && (
            <>
              <span className="text-gray-400">|</span>
              <span>{branding.email}</span>
            </>
          )}

          {branding.website && (
            <>
              <span className="text-gray-400">|</span>
              <a
                href={branding.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {branding.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </>
          )}
        </div>

        {/* Copyright */}
        {branding.showCopyright && (
          <div className="text-center text-xs text-gray-500">
            <p>Copyright © {new Date().getFullYear()} {branding.companyName}. Alle Rechte vorbehalten.</p>
          </div>
        )}
      </div>
    ) : (
      <div className="text-center text-sm text-gray-500">
        <p>Geteilt über Media Share System</p>
      </div>
    )}
  </div>
</div>
```

---

## Campaign-Shares ohne Branding

Campaign-Shares haben KEIN Branding (minimales Design):

```typescript
if (shareLink.type === 'campaign') {
  // KEIN Logo im Header
  <div className="text-xs text-gray-400">
    Medien-Freigabe
  </div>

  // Minimaler Footer
  <div className="text-center text-xs text-gray-400">
    <p>© {new Date().getFullYear()} Alle Rechte vorbehalten.</p>
  </div>
}
```

**Warum kein Branding für Campaigns?**
- Fokus auf Content, nicht auf Branding
- Schnellere Ladezeit
- Minimales Design für Journalisten/Partner

---

## Branding-Fallbacks

### Wenn kein Branding vorhanden

```typescript
{branding?.logoUrl ? (
  <img src={branding.logoUrl} alt="Logo" />
) : (
  <div>
    <div className="text-xs text-gray-400">Freigabe-System</div>
    <div className="text-sm font-medium text-primary">Media Share</div>
  </div>
)}
```

---

## Best Practices

### 1. Logo optimieren

- **Format:** PNG mit transparentem Hintergrund
- **Größe:** < 500KB
- **Dimensionen:** 200x80px
- **Auflösung:** 2x für Retina-Displays

### 2. Kontakt-Informationen vollständig

```typescript
// ✅ GUT - Vollständige Kontakt-Informationen
{
  companyName: 'Firma GmbH',
  phone: '+49 123 456789',
  email: 'info@firma.de',
  website: 'https://firma.de',
  address: { /* ... */ },
}

// ❌ SCHLECHT - Unvollständig
{
  companyName: 'Firma',
}
```

### 3. Copyright-Hinweis

```typescript
// ✅ GUT - Copyright aktiviert
showCopyright: true

// ⚠️ OK - Ohne Copyright (nur für Public Content)
showCopyright: false
```

---

## Troubleshooting

### Problem: Logo wird nicht angezeigt

**Lösungen:**
1. Prüfe `logoUrl` in Branding-Settings
2. Prüfe CORS-Einstellungen für Logo-URL
3. Prüfe Datei-Format (PNG/SVG)

### Problem: Branding fehlt komplett

**Lösungen:**
1. Prüfe ob Campaign-Share (kein Branding)
2. Prüfe `userId` in ShareLink
3. Prüfe `brandingService.getBrandingSettings(userId)`

---

## Siehe auch

- **[Share-System-Guide](./share-system-guide.md)** - Share-Links erstellen
- **[API-Dokumentation](../api/README.md)** - API Details

---

**Letztes Update:** 2025-10-16
