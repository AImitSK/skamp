// src/utils/dateHelpers.ts

/**
 * Formatiert einen Firebase Timestamp zu einem deutschen Datumsformat
 */
export function formatDate(timestamp: any): string {
  if (!timestamp || !timestamp.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatiert einen Firebase Timestamp zu einem kurzen deutschen Datumsformat
 */
export function formatDateShort(timestamp: any): string {
  if (!timestamp || !timestamp.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatiert einen Firebase Timestamp zu einem relativen Zeitformat
 */
export function formatDateRelative(timestamp: any): string {
  if (!timestamp || !timestamp.toDate) return '—';
  
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Heute';
  } else if (diffDays === 1) {
    return 'Gestern';
  } else if (diffDays < 7) {
    return `Vor ${diffDays} Tagen`;
  } else {
    return formatDateShort(timestamp);
  }
}