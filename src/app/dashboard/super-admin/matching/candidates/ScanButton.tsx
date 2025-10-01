/**
 * Scan Button Komponente
 *
 * Trigger für manuellen Matching-Scan
 * - Progress-Anzeige
 * - Development-Mode Indikator
 * - Scan-Status
 */

'use client';

import { useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ScanButtonProps {
  onScan: () => Promise<void>;
  scanning: boolean;
  devMode: boolean;
}

export default function ScanButton({
  onScan,
  scanning,
  devMode
}: ScanButtonProps) {
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  /**
   * Führt Scan aus
   */
  const handleScan = async () => {
    setLastScanResult(null);

    try {
      await onScan();

      setLastScanResult({
        success: true,
        message: 'Scan erfolgreich abgeschlossen'
      });

      // Auto-hide nach 5 Sekunden
      setTimeout(() => {
        setLastScanResult(null);
      }, 5000);
    } catch (error) {
      setLastScanResult({
        success: false,
        message: error instanceof Error ? error.message : 'Scan fehlgeschlagen'
      });
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Development Mode Indicator */}
      {devMode && (
        <Badge color="orange" className="px-2 py-1">
          🔧 Dev-Mode
        </Badge>
      )}

      {/* Last Scan Result */}
      {lastScanResult && (
        <div className="flex items-center gap-2">
          {lastScanResult.success ? (
            <CheckCircleIcon className="size-5 text-green-600" />
          ) : (
            <ExclamationCircleIcon className="size-5 text-red-600" />
          )}
          <span className={`text-sm ${lastScanResult.success ? 'text-green-600' : 'text-red-600'}`}>
            {lastScanResult.message}
          </span>
        </div>
      )}

      {/* Scan Button */}
      <Button
        color="blue"
        onClick={handleScan}
        disabled={scanning}
        className="relative"
      >
        {scanning ? (
          <>
            <ArrowPathIcon className="size-5 animate-spin" />
            <span>Scanne...</span>
          </>
        ) : (
          <>
            <ArrowPathIcon className="size-5" />
            <span>Scan starten</span>
          </>
        )}
      </Button>
    </div>
  );
}
