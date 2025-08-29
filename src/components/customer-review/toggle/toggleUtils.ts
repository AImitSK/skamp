'use client';

/**
 * Utility-Funktionen für das Toggle-System
 */

export const toggleUtils = {
  /**
   * Generiert eine eindeutige Toggle-ID basierend auf Typ und Daten
   */
  generateToggleId: (type: string, data?: any): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}-${timestamp}-${random}`;
  },

  /**
   * Validiert Toggle-IDs
   */
  isValidToggleId: (id: string): boolean => {
    return typeof id === 'string' && id.length > 0;
  },

  /**
   * Formatiert Dateigrößen für die Anzeige
   */
  formatFileSize: (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  },

  /**
   * Formatiert Daten für deutsche Anzeige
   */
  formatDate: (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Ermittelt den MIME-Type-Icon
   */
  getMimeTypeIcon: (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('docx')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('xlsx')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('pptx')) return '📈';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  },

  /**
   * Truncate Text für Anzeige
   */
  truncateText: (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  /**
   * Berechnet den Status-Badge-Style basierend auf dem Status
   */
  getStatusBadgeStyle: (status: string): { bgColor: string; textColor: string; label: string } => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'freigegeben':
        return { bgColor: 'bg-green-100', textColor: 'text-green-800', label: 'Freigegeben' };
      case 'pending':
      case 'wartend':
        return { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', label: 'Wartend' };
      case 'rejected':
      case 'abgelehnt':
        return { bgColor: 'bg-red-100', textColor: 'text-red-800', label: 'Abgelehnt' };
      case 'changes_requested':
      case 'änderungen_angefordert':
        return { bgColor: 'bg-orange-100', textColor: 'text-orange-800', label: 'Änderungen angefordert' };
      default:
        return { bgColor: 'bg-gray-100', textColor: 'text-gray-800', label: status };
    }
  },

  /**
   * Debounce-Funktion für Performance-Optimierung
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle-Funktion für Performance-Optimierung
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

export default toggleUtils;