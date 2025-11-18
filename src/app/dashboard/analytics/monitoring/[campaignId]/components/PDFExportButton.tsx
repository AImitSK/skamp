'use client';

import { Button } from '@/components/ui/button';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useMonitoring } from '../context/MonitoringContext';
import { useAuth } from '@/context/AuthContext';

export function PDFExportButton() {
  const { user } = useAuth();
  const { handlePDFExport, isPDFGenerating } = useMonitoring();

  const handleClick = () => {
    if (!user) return;
    handlePDFExport(user.uid);
  };

  return (
    <Button
      onClick={handleClick}
      color="secondary"
      disabled={isPDFGenerating}
    >
      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
      {isPDFGenerating ? 'Generiere PDF...' : 'PDF-Report'}
    </Button>
  );
}
