'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description
} from '@headlessui/react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ProjectAssignmentMigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  assetCount: number;
  projectName: string;
  isProcessing?: boolean;
}

export function ProjectAssignmentMigrationDialog({
  isOpen,
  onClose,
  onConfirm,
  assetCount,
  projectName,
  isProcessing = false
}: ProjectAssignmentMigrationDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Projektzuweisung bestätigen
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isProcessing || isConfirming}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <Description className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Durch die Zuweisung zum Projekt <span className="font-semibold">{projectName}</span> werden
                    alle verknüpften Medien in die entsprechenden Projekt-Ordner organisiert.
                  </p>

                  <div className="mt-3 bg-white rounded-md p-3 border border-blue-100">
                    <p className="text-sm font-medium text-gray-900">
                      {assetCount} {assetCount === 1 ? 'Datei wird' : 'Dateien werden'} dupliziert:
                    </p>
                    <ul className="mt-2 text-xs text-gray-600 space-y-1">
                      <li>• Key Visuals → Projekt/Medien</li>
                      <li>• Anhänge → Projekt/Medien</li>
                      <li>• PDFs → Projekt/Pressemeldungen</li>
                    </ul>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    <span className="font-medium">Hinweis:</span> Original-Dateien bleiben im Root-Verzeichnis erhalten
                    und können später manuell gelöscht werden.
                  </p>
                </div>
              </div>
            </div>
          </Description>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isProcessing || isConfirming}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Abbrechen
            </button>

            <button
              onClick={handleConfirm}
              disabled={isProcessing || isConfirming || assetCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(isProcessing || isConfirming) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Dateien werden organisiert...</span>
                </>
              ) : (
                <span>
                  {assetCount} {assetCount === 1 ? 'Datei' : 'Dateien'} organisieren
                </span>
              )}
            </button>
          </div>

          {isProcessing && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 text-center">
                Bitte warten Sie, während die Dateien in die Projekt-Struktur organisiert werden...
              </p>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}