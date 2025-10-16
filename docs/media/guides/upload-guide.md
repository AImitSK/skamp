# Upload-Guide

Vollständige Anleitung zum Hochladen von Medien-Dateien.

---

## Single-File Upload

### Mit React Query Hook

```typescript
import { useUploadMediaAsset } from '@/lib/hooks/useMediaData';

function UploadExample() {
  const uploadMutation = useUploadMediaAsset();
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File) => {
    try {
      const asset = await uploadMutation.mutateAsync({
        file,
        organizationId: 'org-123',
        folderId: 'folder-456', // optional
        onProgress: (progress) => setProgress(progress),
      });

      console.log('Upload erfolgreich:', asset);
      // React Query invalidiert automatisch die Asset-Liste
    } catch (error) {
      console.error('Upload fehlgeschlagen:', error);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
      />
      {uploadMutation.isPending && (
        <div>Uploading... {progress}%</div>
      )}
    </div>
  );
}
```

**Features:**
- ✅ Automatisches Retry (3 Versuche)
- ✅ Progress-Tracking
- ✅ Automatische Cache-Invalidierung
- ✅ Error-Handling

---

## Bulk-Upload (Multiple Files)

### Upload-Batching (5 parallel)

```typescript
import { useUploadMediaAsset } from '@/lib/hooks/useMediaData';

function BulkUploadExample() {
  const uploadMutation = useUploadMediaAsset();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleBulkUpload = async (files: File[]) => {
    const BATCH_SIZE = 5; // 5 Dateien parallel

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (file, index) => {
          const fileKey = `${i + index}-${file.name}`;

          try {
            await uploadMutation.mutateAsync({
              file,
              organizationId: 'org-123',
              onProgress: (progress) => {
                setUploadProgress(prev => ({
                  ...prev,
                  [fileKey]: progress
                }));
              },
            });
          } catch (error) {
            console.error(`Upload fehlgeschlagen: ${file.name}`, error);
          }
        })
      );
    }

    console.log('Alle Uploads abgeschlossen');
  };

  return (
    <input
      type="file"
      multiple
      onChange={(e) => e.target.files && handleBulkUpload(Array.from(e.target.files))}
    />
  );
}
```

**Performance:**
- 5 Dateien parallel
- Batch-weise Verarbeitung
- Individual Progress-Tracking
- Error-Handling pro Datei

---

## Drag & Drop Upload

### Mit Drag & Drop Zone

```typescript
function DragDropUpload() {
  const uploadMutation = useUploadMediaAsset();
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);

    for (const file of files) {
      try {
        await uploadMutation.mutateAsync({
          file,
          organizationId: 'org-123',
        });
      } catch (error) {
        console.error('Upload fehlgeschlagen:', file.name);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`border-2 border-dashed p-8 ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <p>Dateien hierher ziehen oder klicken zum Auswählen</p>
    </div>
  );
}
```

**Features:**
- Visual Feedback beim Dragging
- Multi-File Support
- Automatic Upload on Drop

---

## Upload in spezifischen Folder

### Mit Folder-Zuordnung

```typescript
function UploadToFolder({ folderId, folderName }: { folderId: string; folderName: string }) {
  const uploadMutation = useUploadMediaAsset();

  const handleUpload = async (file: File) => {
    await uploadMutation.mutateAsync({
      file,
      organizationId: 'org-123',
      folderId, // ✅ Spezifischer Folder
    });

    // Asset wird automatisch im Folder angezeigt
  };

  return (
    <div>
      <p>Upload nach: {folderName}</p>
      <input
        type="file"
        onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
      />
    </div>
  );
}
```

---

## Upload mit Client-Zuordnung

### Asset automatisch einem Client zuordnen

```typescript
import { mediaService } from '@/lib/firebase/media-service';

async function uploadWithClient(file: File, clientId: string) {
  // 1. Upload Asset
  const asset = await mediaService.uploadMedia(
    file,
    'org-123',
    undefined, // root folder
    undefined, // no progress callback
    3, // retry count
    {
      userId: 'user-456',
      clientId, // ✅ Client-Kontext
    }
  );

  // 2. Update Asset mit clientId (falls nicht automatisch gesetzt)
  if (!asset.clientId) {
    await mediaService.updateAsset(asset.id, {
      clientId,
    });
  }

  return asset;
}
```

**Client-Vererbung:**
- Wenn Asset in Folder mit `clientId` hochgeladen → Automatische Vererbung
- Wenn Asset direkt hochgeladen → Manuell `clientId` setzen

---

## Upload mit Metadaten

### Custom Metadata hinzufügen

```typescript
async function uploadWithMetadata(file: File) {
  // 1. Upload Asset
  const asset = await mediaService.uploadMedia(file, 'org-123');

  // 2. Update mit Custom Metadata
  await mediaService.updateAsset(asset.id, {
    description: 'Marketing Material Q1',
    tags: ['marketing', 'q1-2025', 'hero-image'],
    clientId: 'client-123',
    metadata: {
      campaign: 'Q1 Launch',
      author: 'Max Mustermann',
      copyright: '© 2025 Company',
    },
  });

  return asset;
}
```

---

## Error-Handling

### Häufige Upload-Fehler

```typescript
async function uploadWithErrorHandling(file: File) {
  try {
    await uploadMutation.mutateAsync({
      file,
      organizationId: 'org-123',
    });
  } catch (error: any) {
    // Storage Errors
    if (error.code === 'storage/unauthorized') {
      alert('Keine Berechtigung zum Hochladen');
    } else if (error.code === 'storage/quota-exceeded') {
      alert('Storage-Quota überschritten');
    } else if (error.code === 'storage/canceled') {
      alert('Upload abgebrochen');
    }

    // File Errors
    else if (error.message.includes('File too large')) {
      alert('Datei zu groß (Max 10MB)');
    } else if (error.message.includes('Invalid file type')) {
      alert('Dateityp nicht erlaubt');
    }

    // Network Errors
    else if (error.message.includes('network')) {
      alert('Netzwerk-Fehler. Bitte erneut versuchen');
    }

    // Generic Error
    else {
      alert('Upload fehlgeschlagen: ' + error.message);
    }
  }
}
```

---

## Upload-Validierung

### Datei-Validierung vor Upload

```typescript
function validateFile(file: File): string | null {
  // 1. File Size (Max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return 'Datei zu groß (Max 10MB)';
  }

  // 2. File Type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type)) {
    return 'Dateityp nicht erlaubt';
  }

  // 3. File Name
  if (file.name.length > 255) {
    return 'Dateiname zu lang (Max 255 Zeichen)';
  }

  return null; // Valid
}

// Usage
function handleUpload(file: File) {
  const error = validateFile(file);
  if (error) {
    alert(error);
    return;
  }

  // Upload...
}
```

---

## Upload-Warteschlange

### Upload-Queue mit Status-Tracking

```typescript
interface UploadItem {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

function UploadQueue() {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const uploadMutation = useUploadMediaAsset();

  const addToQueue = (files: File[]) => {
    const newItems: UploadItem[] = files.map(file => ({
      file,
      status: 'pending',
      progress: 0,
    }));

    setQueue(prev => [...prev, ...newItems]);
  };

  const processQueue = async () => {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];

      if (item.status === 'completed') continue;

      // Update status to uploading
      setQueue(prev =>
        prev.map((q, idx) =>
          idx === i ? { ...q, status: 'uploading' } : q
        )
      );

      try {
        await uploadMutation.mutateAsync({
          file: item.file,
          organizationId: 'org-123',
          onProgress: (progress) => {
            setQueue(prev =>
              prev.map((q, idx) =>
                idx === i ? { ...q, progress } : q
              )
            );
          },
        });

        // Mark as completed
        setQueue(prev =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: 'completed', progress: 100 } : q
          )
        );
      } catch (error: any) {
        // Mark as error
        setQueue(prev =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: 'error', error: error.message } : q
          )
        );
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => e.target.files && addToQueue(Array.from(e.target.files))}
      />

      <button onClick={processQueue}>
        Upload starten
      </button>

      <div className="mt-4">
        {queue.map((item, idx) => (
          <div key={idx} className="border p-2 mb-2">
            <div>{item.file.name}</div>
            <div>Status: {item.status}</div>
            <div>Progress: {item.progress}%</div>
            {item.error && <div className="text-red-500">{item.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Immer Progress anzeigen

```typescript
// ✅ GUT
await uploadMutation.mutateAsync({
  file,
  organizationId,
  onProgress: (progress) => setUploadProgress(progress),
});

// ❌ SCHLECHT
await uploadMutation.mutateAsync({ file, organizationId });
```

### 2. Error-Handling implementieren

```typescript
// ✅ GUT
try {
  await uploadMutation.mutateAsync({ file, organizationId });
  toast.success('Upload erfolgreich');
} catch (error) {
  toast.error('Upload fehlgeschlagen');
}
```

### 3. Datei-Validierung

```typescript
// ✅ GUT
const error = validateFile(file);
if (error) {
  alert(error);
  return;
}
await uploadMutation.mutateAsync({ file, organizationId });
```

### 4. Batch-Upload für Multiple Files

```typescript
// ✅ GUT - Batch-Upload (5 parallel)
for (let i = 0; i < files.length; i += 5) {
  const batch = files.slice(i, i + 5);
  await Promise.all(batch.map(file => uploadMutation.mutateAsync({ file, organizationId })));
}

// ❌ SCHLECHT - Sequential Upload (langsam)
for (const file of files) {
  await uploadMutation.mutateAsync({ file, organizationId });
}
```

---

## Troubleshooting

### Problem: Upload schlägt fehl nach 30 Sekunden

**Lösung:** Prüfe Firebase Storage Rules und erhöhe Timeout

### Problem: Große Dateien (>10MB) schlagen fehl

**Lösung:** Erhöhe Storage-Limits oder implementiere Chunked-Upload

### Problem: Upload funktioniert lokal, aber nicht in Production

**Lösung:** Prüfe Firebase Credentials und CORS-Einstellungen

---

## Siehe auch

- **[API-Dokumentation](../api/README.md)** - Upload-API Details
- **[Share-System-Guide](./share-system-guide.md)** - Share-Links erstellen

---

**Letztes Update:** 2025-10-16
