// src/components/journalist/JournalistImportDialog.tsx
"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import {
  UserIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/outline";
import { referenceService } from "@/lib/firebase/reference-service";
import { useAuth } from "@/context/AuthContext";

interface JournalistImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  journalist: any | null; // Globaler Journalist
  organizationId: string;
  onSuccess: () => void;
}

/**
 * Vereinfachter Import-Dialog für das Reference-System
 *
 * Dieser Dialog erstellt VERWEISE auf globale Journalisten,
 * KEINE Kopien der Daten!
 */
export function JournalistImportDialog({
  isOpen,
  onClose,
  journalist,
  organizationId,
  onSuccess
}: JournalistImportDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localNotes, setLocalNotes] = useState("");

  const handleImport = useCallback(async () => {
    if (!journalist || !user) return;

    setLoading(true);
    try {
      // Erstelle Reference (Verweis, keine Kopie!)
      await referenceService.createReference(
        journalist.id,
        organizationId,
        user.uid,
        localNotes || `Als Verweis hinzugefügt am ${new Date().toLocaleDateString('de-DE')}`
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Fehler beim Erstellen der Reference:', error);
      // Error handling würde hier implementiert
    } finally {
      setLoading(false);
    }
  }, [journalist, organizationId, user, localNotes, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    setLocalNotes("");
    onClose();
  }, [onClose]);

  if (!journalist) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <DialogTitle>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ArrowUpTrayIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Als Verweis hinzufügen
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Globaler Journalist wird als Verweis importiert
            </p>
          </div>
        </div>
      </DialogTitle>

      <DialogBody>
        <div className="space-y-6">
          {/* Journalist Info */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-medium text-zinc-900 dark:text-white">
                {journalist.personalData?.displayName || journalist.displayName}
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {journalist.professionalData?.employment?.position || journalist.position}
                {" bei "}
                {journalist.professionalData?.employment?.company?.name || journalist.companyName}
              </p>
              <div className="mt-2">
                <Badge color="blue" className="text-xs">
                  🌐 Globaler Journalist
                </Badge>
              </div>
            </div>
          </div>

          {/* Was passiert Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Was ist ein Verweis?
                </h5>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                  <div>✅ Journalist erscheint in Ihrer Kontakte-Liste</div>
                  <div>✅ Daten bleiben immer aktuell (vom SuperAdmin gepflegt)</div>
                  <div>✅ Sie können lokale Notizen und Tags hinzufügen</div>
                  <div>✅ Nutzbar für Verteilerlisten und Kampagnen</div>
                  <div>❌ Globale Daten können nicht bearbeitet werden</div>
                </div>
              </div>
            </div>
          </div>

          {/* Lokale Notizen */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Lokale Notizen (optional)
            </label>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Persönliche Notizen zu diesem Journalisten..."
              rows={3}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white resize-none"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Diese Notizen sind nur für Ihre Organisation sichtbar.
            </p>
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={loading}
        >
          Abbrechen
        </Button>
        <Button
          onClick={handleImport}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Erstelle Verweis...
            </>
          ) : (
            <>
              <CheckIcon className="h-4 w-4 mr-2" />
              Als Verweis hinzufügen
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}