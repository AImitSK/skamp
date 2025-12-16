// src/hooks/useListExport.ts
import { useMutation } from '@tanstack/react-query';
import { projectListsService, ProjectDistributionList } from '@/lib/firebase/project-lists-service';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { toastService } from '@/lib/utils/toast';
import { useTranslations } from 'next-intl';
import Papa from 'papaparse';

// Helper: Kontaktname formatieren
function formatContactName(contact: ContactEnhanced): string {
  if ('name' in contact && typeof contact.name === 'object') {
    const parts = [];
    if (contact.name.firstName) parts.push(contact.name.firstName);
    if (contact.name.lastName) parts.push(contact.name.lastName);
    return parts.join(' ') || 'Unbekannt';
  }
  if ('firstName' in contact || 'lastName' in contact) {
    return `${(contact as any).firstName || ''} ${(contact as any).lastName || ''}`.trim() || 'Unbekannt';
  }
  return 'Unbekannt';
}

// Hook: Liste als CSV exportieren
export function useExportList() {
  const tToast = useTranslations('toasts');

  return useMutation({
    mutationFn: async (data: {
      projectList: ProjectDistributionList;
    }) => {
      const { projectList } = data;

      if (!projectList.id) {
        throw new Error('Listen-ID fehlt');
      }

      // Kontakte abrufen
      const contacts = await projectListsService.getProjectListContacts(projectList.id);

      // Export-Daten vorbereiten
      const exportData = contacts.map(contact => ({
        Name: formatContactName(contact),
        Position: contact.position || '',
        Firma: contact.companyName || '',
        'E-Mail': contact.emails?.[0]?.email || '',
        Telefon: contact.phones?.[0]?.number || ''
      }));

      // CSV generieren
      const csv = Papa.unparse(exportData);

      // BOM für UTF-8 (Excel-Kompatibilität)
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });

      // Download erstellen
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);

      // Dateiname generieren
      const fileName = projectList.name || projectList.masterListId || 'liste';
      const sanitizedFileName = fileName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      link.setAttribute('download', `${sanitizedFileName}-export.csv`);

      // Download ausführen
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // URL freigeben
      URL.revokeObjectURL(link.href);

      return { success: true, contactCount: contacts.length };
    },
    onSuccess: (result) => {
      toastService.success(tToast('listExportSuccess', { count: result.contactCount }));
    },
    onError: (error: Error) => {
      toastService.error(error.message || tToast('listExportError'));
    },
  });
}
