"use client";

import { useState, useEffect } from 'react';
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Label, Description } from "@/components/ui/fieldset";
import { SettingsNav } from '@/components/SettingsNav';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { aveSettingsService } from '@/lib/firebase/ave-settings-service';
import { AVESettings, DEFAULT_AVE_SETTINGS } from '@/types/monitoring';
import { toastService } from '@/lib/utils/toast';

export default function MonitoringSettingsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AVESettings | null>(null);

  const [formData, setFormData] = useState({
    printFactor: DEFAULT_AVE_SETTINGS.factors.print,
    onlineFactor: DEFAULT_AVE_SETTINGS.factors.online,
    broadcastFactor: DEFAULT_AVE_SETTINGS.factors.broadcast,
    audioFactor: DEFAULT_AVE_SETTINGS.factors.audio,
    positiveMultiplier: DEFAULT_AVE_SETTINGS.sentimentMultipliers.positive,
    neutralMultiplier: DEFAULT_AVE_SETTINGS.sentimentMultipliers.neutral,
    negativeMultiplier: DEFAULT_AVE_SETTINGS.sentimentMultipliers.negative,
  });

  useEffect(() => {
    loadSettings();
  }, [currentOrganization?.id]);

  const loadSettings = async () => {
    if (!currentOrganization?.id || !user?.uid) return;

    try {
      setLoading(true);
      const data = await aveSettingsService.getOrCreate(currentOrganization.id, user.uid);
      setSettings(data);
      setFormData({
        printFactor: data.factors.print,
        onlineFactor: data.factors.online,
        broadcastFactor: data.factors.broadcast,
        audioFactor: data.factors.audio,
        positiveMultiplier: data.sentimentMultipliers.positive,
        neutralMultiplier: data.sentimentMultipliers.neutral,
        negativeMultiplier: data.sentimentMultipliers.negative,
      });
    } catch (error) {
      console.error('Fehler beim Laden der AVE-Einstellungen:', error);
      toastService.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.id || !user?.uid) return;

    try {
      setSaving(true);

      await aveSettingsService.update(
        settings.id,
        {
          factors: {
            print: formData.printFactor,
            online: formData.onlineFactor,
            broadcast: formData.broadcastFactor,
            audio: formData.audioFactor,
          },
          sentimentMultipliers: {
            positive: formData.positiveMultiplier,
            neutral: formData.neutralMultiplier,
            negative: formData.negativeMultiplier,
          },
        },
        user.uid
      );

      await loadSettings();
      toastService.success('AVE-Einstellungen gespeichert');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toastService.error(
        error instanceof Error
          ? `Fehler beim Speichern: ${error.message}`
          : 'Fehler beim Speichern der Einstellungen'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      printFactor: DEFAULT_AVE_SETTINGS.factors.print,
      onlineFactor: DEFAULT_AVE_SETTINGS.factors.online,
      broadcastFactor: DEFAULT_AVE_SETTINGS.factors.broadcast,
      audioFactor: DEFAULT_AVE_SETTINGS.factors.audio,
      positiveMultiplier: DEFAULT_AVE_SETTINGS.sentimentMultipliers.positive,
      neutralMultiplier: DEFAULT_AVE_SETTINGS.sentimentMultipliers.neutral,
      negativeMultiplier: DEFAULT_AVE_SETTINGS.sentimentMultipliers.negative,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-10 lg:flex-row">
        <aside className="w-full lg:w-64 lg:flex-shrink-0">
          <SettingsNav />
        </aside>
        <div className="flex-1">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 lg:flex-row">
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <SettingsNav />
      </aside>

      <div className="flex-1">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <Heading level={1}>Monitoring & AVE-Berechnung</Heading>
            <Text className="mt-2 text-gray-600">
              Konfigurieren Sie die AVE-Faktoren (Advertising Value Equivalent) für verschiedene Medientypen
            </Text>
          </div>
        </div>

        <div className="max-w-4xl">
          <form onSubmit={handleSubmit}>
            <div className="bg-white ring-1 ring-gray-900/5 sm:rounded-xl">
              <div className="px-4 py-6 sm:p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">AVE-Faktoren pro Medientyp</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Diese Faktoren werden mit der Reichweite multipliziert. Formel: <code className="bg-gray-100 px-2 py-1 rounded">AVE = Reichweite × Faktor × Sentiment-Multiplikator</code>
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field>
                        <Label>Print (€ pro Reichweite)</Label>
                        <Description>Faktor für Printmedien (Zeitungen, Magazine)</Description>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={formData.printFactor}
                          onChange={(e) => setFormData({ ...formData, printFactor: parseFloat(e.target.value) || 0 })}
                        />
                      </Field>

                      <Field>
                        <Label>Online (€ pro Reichweite)</Label>
                        <Description>Faktor für Online-Medien</Description>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={formData.onlineFactor}
                          onChange={(e) => setFormData({ ...formData, onlineFactor: parseFloat(e.target.value) || 0 })}
                        />
                      </Field>

                      <Field>
                        <Label>Broadcast (€ pro Reichweite)</Label>
                        <Description>Faktor für TV und Radio</Description>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={formData.broadcastFactor}
                          onChange={(e) => setFormData({ ...formData, broadcastFactor: parseFloat(e.target.value) || 0 })}
                        />
                      </Field>

                      <Field>
                        <Label>Audio/Podcast (€ pro Download)</Label>
                        <Description>Faktor für Podcasts (monatliche Downloads)</Description>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={formData.audioFactor}
                          onChange={(e) => setFormData({ ...formData, audioFactor: parseFloat(e.target.value) || 0 })}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Sentiment-Multiplikatoren</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Diese Werte werden je nach Tonalität der Berichterstattung angewendet
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Field>
                        <Label>Positiv</Label>
                        <Description>Faktor für positive Berichterstattung</Description>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={formData.positiveMultiplier}
                          onChange={(e) => setFormData({ ...formData, positiveMultiplier: parseFloat(e.target.value) || 0 })}
                        />
                      </Field>

                      <Field>
                        <Label>Neutral</Label>
                        <Description>Faktor für neutrale Berichterstattung</Description>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={formData.neutralMultiplier}
                          onChange={(e) => setFormData({ ...formData, neutralMultiplier: parseFloat(e.target.value) || 0 })}
                        />
                      </Field>

                      <Field>
                        <Label>Negativ</Label>
                        <Description>Faktor für negative Berichterstattung</Description>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={formData.negativeMultiplier}
                          onChange={(e) => setFormData({ ...formData, negativeMultiplier: parseFloat(e.target.value) || 0 })}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">Berechnungsbeispiel</h4>
                      <p className="text-sm text-blue-800">
                        Ein <strong>positiver Online-Artikel</strong> mit <strong>1.000.000 Reichweite</strong> hätte einen AVE von:<br />
                        <code className="bg-white px-2 py-1 rounded mt-2 inline-block">
                          1.000.000 × {formData.onlineFactor} × {formData.positiveMultiplier} = {(1000000 * formData.onlineFactor * formData.positiveMultiplier).toLocaleString('de-DE')} €
                        </code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
                <Button type="button" plain onClick={handleReset}>
                  Auf Standard zurücksetzen
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Speichern...' : 'Einstellungen speichern'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}