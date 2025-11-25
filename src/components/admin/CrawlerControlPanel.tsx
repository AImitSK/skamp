'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/fieldset';
import { Textarea } from '@/components/ui/textarea';
import { PlayIcon, BoltIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { toDate } from '@/lib/utils/timestamp-utils';

interface CrawlerControlPanelProps {
  cronJobStatus: {
    isEnabled: boolean;
    pausedAt?: any;
    pausedBy?: string;
    reason?: string;
  };
  onPause: (reason: string) => Promise<void>;
  onResume: () => Promise<void>;
  onTriggerAll: () => Promise<void>;
}

export function CrawlerControlPanel({
  cronJobStatus,
  onPause,
  onResume,
  onTriggerAll
}: CrawlerControlPanelProps) {
  const [pauseReason, setPauseReason] = useState('');
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePause = async () => {
    setLoading(true);
    try {
      await onPause(pauseReason);
      setShowPauseDialog(false);
      setPauseReason('');
    } catch (error) {
      console.error('Error pausing crawler:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await onResume();
    } catch (error) {
      console.error('Error resuming crawler:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAll = async () => {
    setLoading(true);
    try {
      await onTriggerAll();
    } catch (error) {
      console.error('Error triggering crawler:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Crawler Control</h3>

      {/* Status Badge */}
      <div className="mb-4">
        <Badge color={cronJobStatus.isEnabled ? 'green' : 'red'} className="text-sm py-1 px-3">
          {cronJobStatus.isEnabled ? '✅ Aktiv' : '⏸️ Pausiert'}
        </Badge>

        {!cronJobStatus.isEnabled && cronJobStatus.pausedBy && (
          <div className="mt-2 space-y-1">
            <Text className="text-sm text-gray-500">
              Pausiert {(() => {
                const date = toDate(cronJobStatus.pausedAt);
                return date ? formatDistanceToNow(date, { addSuffix: true, locale: de }) : '';
              })()}
            </Text>
            {cronJobStatus.reason && (
              <Text className="text-sm text-gray-600">
                Grund: {cronJobStatus.reason}
              </Text>
            )}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {cronJobStatus.isEnabled ? (
          <Button
            color="red"
            onClick={() => setShowPauseDialog(true)}
            disabled={loading}
          >
            ⏸️ Cron Job pausieren
          </Button>
        ) : (
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleResume}
            disabled={loading}
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Cron Job aktivieren
          </Button>
        )}

        <Button
          onClick={handleTriggerAll}
          disabled={!cronJobStatus.isEnabled || loading}
          color="secondary"
        >
          <BoltIcon className="h-4 w-4 mr-2" />
          Manuell starten (alle Orgs)
        </Button>
      </div>

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onClose={() => setShowPauseDialog(false)}>
        <DialogTitle>Cron Job pausieren</DialogTitle>
        <DialogBody>
          <Field>
            <Label>Grund für Pause</Label>
            <Textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="z.B. Wartungsarbeiten, Performance-Probleme..."
              rows={3}
            />
          </Field>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowPauseDialog(false)}>
            Abbrechen
          </Button>
          <Button
            color="red"
            onClick={handlePause}
            disabled={loading || !pauseReason.trim()}
          >
            Pausieren
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
