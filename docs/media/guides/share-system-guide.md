# Share-System-Guide

Vollständige Anleitung zum Erstellen und Verwalten von Share-Links.

---

## Share-Link erstellen

### Basic Share-Link (ohne Passwort)

```typescript
import { useCreateShareLink } from '@/lib/hooks/useMediaData';

function ShareExample({ asset }: { asset: MediaAsset }) {
  const createShareMutation = useCreateShareLink();

  const handleShare = async () => {
    try {
      const shareLink = await createShareMutation.mutateAsync({
        shareLink: {
          targetId: asset.id,
          type: 'file', // 'file' | 'folder' | 'campaign'
          title: asset.fileName,
          description: 'Öffentliche Freigabe',
          settings: {
            downloadAllowed: true,
            passwordRequired: null,
            showFileList: false,
            expiresAt: null,
            watermarkEnabled: false,
          },
        },
        context: {
          organizationId: 'org-123',
          userId: 'user-456',
        },
      });

      // Share-URL generieren
      const shareUrl = `${window.location.origin}/share/${shareLink.shareId}`;

      // Zur Zwischenablage kopieren
      await navigator.clipboard.writeText(shareUrl);

      alert(`Share-Link kopiert: ${shareUrl}`);
    } catch (error) {
      console.error('Fehler beim Erstellen:', error);
    }
  };

  return (
    <button onClick={handleShare}>Teilen</button>
  );
}
```

---

## Share-Link mit Passwort-Schutz

### Passwort-geschützter Share

```typescript
const handleSecureShare = async () => {
  const password = 'my-secure-password';

  const shareLink = await createShareMutation.mutateAsync({
    shareLink: {
      targetId: asset.id,
      type: 'file',
      title: asset.fileName,
      settings: {
        downloadAllowed: true,
        passwordRequired: password, // ✅ Passwort wird server-side mit bcrypt gehashed
        showFileList: false,
        expiresAt: null,
        watermarkEnabled: false,
      },
    },
    context: {
      organizationId: 'org-123',
      userId: 'user-456',
    },
  });

  const shareUrl = `${window.location.origin}/share/${shareLink.shareId}`;

  // WICHTIG: Passwort separat kommunizieren!
  alert(`Share-Link: ${shareUrl}\nPasswort: ${password}`);
};
```

**Security:**
- Passwort wird mit bcrypt gehashed (Server-Side)
- Niemals Passwort in URL
- Passwort separat kommunizieren (E-Mail, Chat, etc.)

---

## Share-Link mit Ablaufdatum

### Zeitlich begrenzter Share

```typescript
const handleTemporaryShare = async () => {
  // Ablaufdatum: In 7 Tagen
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const shareLink = await createShareMutation.mutateAsync({
    shareLink: {
      targetId: asset.id,
      type: 'file',
      title: asset.fileName,
      settings: {
        downloadAllowed: true,
        passwordRequired: null,
        showFileList: false,
        expiresAt, // ✅ Share läuft nach 7 Tagen ab
        watermarkEnabled: false,
      },
    },
    context: {
      organizationId: 'org-123',
      userId: 'user-456',
    },
  });

  console.log(`Share-Link läuft ab am: ${expiresAt.toLocaleDateString()}`);
};
```

---

## Folder-Share (Multiple Assets)

### Ganzen Folder teilen

```typescript
const handleFolderShare = async (folder: MediaFolder) => {
  const shareLink = await createShareMutation.mutateAsync({
    shareLink: {
      targetId: folder.id,
      type: 'folder', // ✅ Folder-Share
      title: `Ordner: ${folder.name}`,
      description: `Alle Dateien in ${folder.name}`,
      settings: {
        downloadAllowed: true,
        passwordRequired: null,
        showFileList: true, // ✅ Datei-Liste anzeigen
        expiresAt: null,
        watermarkEnabled: false,
      },
    },
    context: {
      organizationId: 'org-123',
      userId: 'user-456',
    },
  });

  // Empfänger sieht alle Dateien im Folder
  const shareUrl = `${window.location.origin}/share/${shareLink.shareId}`;
  return shareUrl;
};
```

---

## Campaign-Share

### Kampagnen-Medien teilen

```typescript
const handleCampaignShare = async (campaignId: string, campaignName: string) => {
  const shareLink = await createShareMutation.mutateAsync({
    shareLink: {
      targetId: campaignId,
      type: 'campaign', // ✅ Campaign-Share
      title: `Kampagne: ${campaignName}`,
      description: 'Medien-Assets der Kampagne',
      settings: {
        downloadAllowed: true,
        passwordRequired: null,
        showFileList: true,
        expiresAt: null,
        watermarkEnabled: false,
      },
      context: {
        campaignId,
        campaignName,
      },
    },
    context: {
      organizationId: 'org-123',
      userId: 'user-456',
    },
  });

  return shareLink;
};
```

**Campaign-Share Features:**
- KEIN Branding (minimales Design)
- Alle Campaign-Media-Assets
- Spezieller Layout für Kampagnen

---

## Share-Link deaktivieren

### Share-Link beenden

```typescript
import { useUpdateShareLink } from '@/lib/hooks/useMediaData';

function DeactivateShare({ shareLink }: { shareLink: ShareLink }) {
  const updateMutation = useUpdateShareLink();

  const handleDeactivate = async () => {
    await updateMutation.mutateAsync({
      shareId: shareLink.id,
      updates: {
        active: false, // ✅ Deaktiviert
      },
      organizationId: 'org-123',
    });

    alert('Share-Link wurde deaktiviert');
  };

  return (
    <button onClick={handleDeactivate}>
      Share-Link deaktivieren
    </button>
  );
}
```

---

## Share-Link löschen

### Share-Link permanent löschen

```typescript
import { useDeleteShareLink } from '@/lib/hooks/useMediaData';

function DeleteShare({ shareLink }: { shareLink: ShareLink }) {
  const deleteMutation = useDeleteShareLink();

  const handleDelete = async () => {
    if (!confirm('Share-Link wirklich löschen?')) return;

    await deleteMutation.mutateAsync({
      shareId: shareLink.id,
      organizationId: 'org-123',
    });

    alert('Share-Link wurde gelöscht');
  };

  return (
    <button onClick={handleDelete} className="text-red-600">
      Share-Link löschen
    </button>
  );
}
```

---

## Share-Analytics

### Zugriffs-Statistiken anzeigen

```typescript
function ShareStats({ shareLink }: { shareLink: ShareLink }) {
  return (
    <div className="border p-4">
      <h3>{shareLink.title}</h3>

      <div className="mt-4 space-y-2">
        <div>
          <span className="font-medium">Zugriffe:</span>{' '}
          {shareLink.accessCount || 0}
        </div>

        <div>
          <span className="font-medium">Erstellt:</span>{' '}
          {new Date(shareLink.createdAt).toLocaleDateString()}
        </div>

        {shareLink.settings.expiresAt && (
          <div>
            <span className="font-medium">Läuft ab:</span>{' '}
            {new Date(shareLink.settings.expiresAt).toLocaleDateString()}
          </div>
        )}

        <div>
          <span className="font-medium">Status:</span>{' '}
          {shareLink.active ? (
            <span className="text-green-600">Aktiv</span>
          ) : (
            <span className="text-red-600">Inaktiv</span>
          )}
        </div>

        <div>
          <span className="font-medium">Passwort-Schutz:</span>{' '}
          {shareLink.settings.passwordRequired ? 'Ja' : 'Nein'}
        </div>

        <div>
          <span className="font-medium">Download erlaubt:</span>{' '}
          {shareLink.settings.downloadAllowed ? 'Ja' : 'Nein'}
        </div>
      </div>
    </div>
  );
}
```

---

## Branding anpassen

### Logo und Farben

Siehe **[Branding-Guide](./branding-guide.md)** für Details.

```typescript
// Branding wird automatisch geladen für Share-Links
// (außer Campaign-Shares)

// Branding-Settings werden pro User in Firestore gespeichert:
// - Logo URL
// - Firmen-Name
// - Kontakt-Informationen
// - Footer-Einstellungen
```

---

## Public Share Page

### Share-Link aufrufen

Wenn ein Empfänger den Share-Link aufruft:

```
https://app.example.com/share/abc123def
```

**Flow:**
1. Share-Link laden (React Query Hook)
2. Passwort-Prompt (falls erforderlich)
3. Branding laden (falls kein Campaign-Share)
4. Content laden (Asset, Folder oder Campaign)
5. Anzeigen mit Download-Button (falls erlaubt)

---

## Best Practices

### 1. Passwort-Schutz für sensible Inhalte

```typescript
// ✅ GUT - Passwort für vertrauliche Dokumente
settings: {
  passwordRequired: 'secure-password',
  downloadAllowed: true,
}

// ❌ SCHLECHT - Kein Passwort für sensible Inhalte
settings: {
  passwordRequired: null,
  downloadAllowed: true,
}
```

### 2. Ablaufdatum setzen

```typescript
// ✅ GUT - Zeitlich begrenzt
const expiresAt = new Date();
expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 Monat

settings: {
  expiresAt,
}

// ⚠️ OK - Unbegrenzt (nur für Public Content)
settings: {
  expiresAt: null,
}
```

### 3. Download kontrollieren

```typescript
// ✅ GUT - Nur Ansehen erlaubt
settings: {
  downloadAllowed: false, // Nur Preview
}

// ✅ GUT - Download erlaubt
settings: {
  downloadAllowed: true, // Preview + Download
}
```

### 4. Share-Link nach Verwendung deaktivieren

```typescript
// Nach Projekt-Abschluss
await updateMutation.mutateAsync({
  shareId: shareLink.id,
  updates: { active: false },
  organizationId,
});
```

---

## Troubleshooting

### Problem: Share-Link funktioniert nicht

**Symptome:**
- 404 beim Öffnen
- "Share-Link nicht gefunden"

**Lösungen:**
1. Prüfe `active: true` Status
2. Prüfe `expiresAt` Datum
3. Prüfe Admin SDK API-Routes

### Problem: Passwort-Validierung schlägt fehl

**Symptome:**
- "Falsches Passwort" trotz korrektem Passwort

**Lösungen:**
1. Prüfe bcrypt-Hashing (Server-Side)
2. Prüfe API-Route `/api/media/share/validate`
3. Prüfe Passwort-Encoding

### Problem: Branding wird nicht angezeigt

**Symptome:**
- Kein Logo auf Share Page
- Fallback-Branding

**Lösungen:**
1. Prüfe `brandingService.getBrandingSettings(userId)`
2. Prüfe Logo-URL
3. Prüfe Share-Type (Campaign-Shares haben KEIN Branding)

---

## Siehe auch

- **[API-Dokumentation](../api/README.md)** - Share-API Details
- **[Branding-Guide](./branding-guide.md)** - Logo und Design anpassen
- **[Upload-Guide](./upload-guide.md)** - Dateien hochladen

---

**Letztes Update:** 2025-10-16
