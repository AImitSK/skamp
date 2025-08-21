// src/utils/dateHelpers.ts

/**
 * Formatiert einen Firebase Timestamp zu einem deutschen Datumsformat
 */
export function formatDate(timestamp: any): string {
  if (!timestamp) return '—';
  
  // Behandle verschiedene Timestamp-Formate
  let date: Date;
  
  // Firebase Timestamp mit toDate() Methode
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  }
  // JavaScript Date Objekt
  else if (timestamp instanceof Date) {
    date = timestamp;
  }
  // Firebase serverTimestamp() Placeholder - diese sollten normalerweise nicht vorkommen
  else if (timestamp._methodName === 'serverTimestamp') {
    return '—'; // Zeige Platzhalter an - Daten noch nicht aus DB geladen
  }
  // Timestamp als Zahl (Unix Timestamp in Millisekunden)
  else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  }
  // Timestamp als String
  else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  }
  else {
    return '—';
  }
  
  // Prüfe ob das Datum gültig ist
  if (isNaN(date.getTime())) {
    return '—';
  }
  
  return date.toLocaleDateString('de-DE', {
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
  if (!timestamp) return '—';
  
  // Behandle verschiedene Timestamp-Formate
  let date: Date;
  
  // Firebase Timestamp mit toDate() Methode
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  }
  // JavaScript Date Objekt
  else if (timestamp instanceof Date) {
    date = timestamp;
  }
  // Firebase serverTimestamp() Placeholder - diese sollten normalerweise nicht vorkommen
  else if (timestamp._methodName === 'serverTimestamp') {
    return '—'; // Zeige Platzhalter an - Daten noch nicht aus DB geladen
  }
  // Timestamp als Zahl (Unix Timestamp in Millisekunden)
  else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  }
  // Timestamp als String
  else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  }
  else {
    return '—';
  }
  
  // Prüfe ob das Datum gültig ist
  if (isNaN(date.getTime())) {
    return '—';
  }
  
  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: isThisYear ? undefined : '2-digit', // Nur Jahr anzeigen wenn nicht aktuelles Jahr
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatiert einen Firebase Timestamp zu einem relativen Zeitformat
 */
export function formatDateRelative(timestamp: any): string {
  if (!timestamp) return '—';
  
  // Behandle verschiedene Timestamp-Formate
  let date: Date;
  
  // Firebase Timestamp mit toDate() Methode
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  }
  // JavaScript Date Objekt
  else if (timestamp instanceof Date) {
    date = timestamp;
  }
  // Firebase serverTimestamp() Placeholder - diese sollten normalerweise nicht vorkommen
  else if (timestamp._methodName === 'serverTimestamp') {
    return '—'; // Zeige Platzhalter an - Daten noch nicht aus DB geladen
  }
  // Timestamp als Zahl (Unix Timestamp in Millisekunden)
  else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  }
  // Timestamp als String
  else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  }
  else {
    return '—';
  }
  
  // Prüfe ob das Datum gültig ist
  if (isNaN(date.getTime())) {
    return '—';
  }
  
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