// src/app/dashboard/library/publications/PublicationModal/MetricsSection.tsx
"use client";

import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { PublicationFormData, MetricsState } from './types';
import { frequencies, circulationTypes } from './types';
import type { PublicationFrequency } from '@/types/library';

interface MetricsSectionProps {
  formData: PublicationFormData;
  metrics: MetricsState;
  setMetrics: (metrics: MetricsState) => void;
}

export const MetricsSection = memo(function MetricsSection({ formData, metrics, setMetrics }: MetricsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Erscheinungsfrequenz
          </label>
          <Select
            value={metrics.frequency}
            onChange={(e) => setMetrics({ ...metrics, frequency: e.target.value as PublicationFrequency })}
          >
            {frequencies.map(freq => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Zielgruppe
          </label>
          <Input
            type="text"
            value={metrics.targetAudience}
            onChange={(e) => setMetrics({ ...metrics, targetAudience: e.target.value })}
            placeholder="z.B. Entscheider, Fachpublikum..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Altersgruppe
          </label>
          <Input
            type="text"
            value={metrics.targetAgeGroup}
            onChange={(e) => setMetrics({ ...metrics, targetAgeGroup: e.target.value })}
            placeholder="z.B. 25-49, 50+"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Geschlechterverteilung
          </label>
          <Select
            value={metrics.targetGender}
            onChange={(e) => setMetrics({ ...metrics, targetGender: e.target.value as any })}
          >
            <option value="all">Ausgeglichen</option>
            <option value="predominantly_male">Überwiegend männlich</option>
            <option value="predominantly_female">Überwiegend weiblich</option>
          </Select>
        </div>
      </div>

      {/* Print Metriken */}
      {(formData.format === 'print' || formData.format === 'both') && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-zinc-900">Print-Metriken</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                Auflage
                <span className="text-red-500">*</span>
                <InfoTooltip content="Dieses Feld wird für die AVE-Berechnung verwendet" />
              </label>
              <Input
                type="number"
                value={metrics.print.circulation}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, circulation: e.target.value }
                })}
                placeholder="50000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Auflagentyp
              </label>
              <Select
                value={metrics.print.circulationType}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, circulationType: e.target.value as any }
                })}
              >
                {circulationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Preis pro Ausgabe (€)
              </label>
              <Input
                type="number"
                step="0.01"
                value={metrics.print.pricePerIssue}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, pricePerIssue: e.target.value }
                })}
                placeholder="3.50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Abo-Preis Monat (€)
              </label>
              <Input
                type="number"
                step="0.01"
                value={metrics.print.subscriptionPriceMonthly}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, subscriptionPriceMonthly: e.target.value }
                })}
                placeholder="29.90"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Format
              </label>
              <Input
                type="text"
                value={metrics.print.paperFormat}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, paperFormat: e.target.value }
                })}
                placeholder="z.B. A4, Tabloid"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Seitenanzahl
              </label>
              <Input
                type="number"
                value={metrics.print.pageCount}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, pageCount: e.target.value }
                })}
                placeholder="64"
              />
            </div>
          </div>
        </div>
      )}

      {/* Online Metriken */}
      {(formData.format === 'online' || formData.format === 'both') && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-zinc-900">Online-Metriken</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Monatliche Unique Visitors
              </label>
              <Input
                type="number"
                value={metrics.online.monthlyUniqueVisitors}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, monthlyUniqueVisitors: e.target.value }
                })}
                placeholder="100000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                Monatliche Page Views
                <span className="text-red-500">*</span>
                <InfoTooltip content="Dieses Feld wird für die AVE-Berechnung verwendet" />
              </label>
              <Input
                type="number"
                value={metrics.online.monthlyPageViews}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, monthlyPageViews: e.target.value }
                })}
                placeholder="500000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Ø Sitzungsdauer (Minuten)
              </label>
              <Input
                type="number"
                step="0.1"
                value={metrics.online.avgSessionDuration}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, avgSessionDuration: e.target.value }
                })}
                placeholder="3.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Bounce Rate (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={metrics.online.bounceRate}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, bounceRate: e.target.value }
                })}
                placeholder="45.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Registrierte Nutzer
              </label>
              <Input
                type="number"
                value={metrics.online.registeredUsers}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, registeredUsers: e.target.value }
                })}
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Newsletter-Abonnenten
              </label>
              <Input
                type="number"
                value={metrics.online.newsletterSubscribers}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, newsletterSubscribers: e.target.value }
                })}
                placeholder="25000"
              />
            </div>
          </div>
          <div className="flex items-center space-x-6 pt-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={metrics.online.hasPaywall}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, hasPaywall: e.target.checked }
                })}
                className="h-4 w-4 text-primary focus:ring-primary border-zinc-300 rounded"
              />
              <span className="ml-2 text-sm">Hat Paywall</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={metrics.online.hasMobileApp}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, hasMobileApp: e.target.checked }
                })}
                className="h-4 w-4 text-primary focus:ring-primary border-zinc-300 rounded"
              />
              <span className="ml-2 text-sm">Hat Mobile App</span>
            </label>
          </div>
        </div>
      )}

      {/* Broadcast Metriken (TV/Radio) */}
      {formData.format === 'broadcast' && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-zinc-900">Broadcast-Metriken (TV/Radio)</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                Zuschauer/Hörer (Durchschnitt)
                <span className="text-red-500">*</span>
                <InfoTooltip content="Dieses Feld wird für die AVE-Berechnung verwendet" />
              </label>
              <Input
                type="number"
                value={metrics.broadcast.viewership}
                onChange={(e) => setMetrics({
                  ...metrics,
                  broadcast: { ...metrics.broadcast, viewership: e.target.value }
                })}
                placeholder="500000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Marktanteil (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={metrics.broadcast.marketShare}
                onChange={(e) => setMetrics({
                  ...metrics,
                  broadcast: { ...metrics.broadcast, marketShare: e.target.value }
                })}
                placeholder="15.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Sendegebiet
              </label>
              <Input
                type="text"
                value={metrics.broadcast.broadcastArea}
                onChange={(e) => setMetrics({
                  ...metrics,
                  broadcast: { ...metrics.broadcast, broadcastArea: e.target.value }
                })}
                placeholder="z.B. National, Regional Bayern"
              />
            </div>
          </div>
        </div>
      )}

      {/* Audio Metriken (Podcast) */}
      {formData.format === 'audio' && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-zinc-900">Audio-Metriken (Podcast)</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                Monatliche Downloads
                <span className="text-red-500">*</span>
                <InfoTooltip content="Dieses Feld wird für die AVE-Berechnung verwendet" />
              </label>
              <Input
                type="number"
                value={metrics.audio.monthlyDownloads}
                onChange={(e) => setMetrics({
                  ...metrics,
                  audio: { ...metrics.audio, monthlyDownloads: e.target.value }
                })}
                placeholder="50000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Monatliche Hörer (optional)
              </label>
              <Input
                type="number"
                value={metrics.audio.monthlyListeners}
                onChange={(e) => setMetrics({
                  ...metrics,
                  audio: { ...metrics.audio, monthlyListeners: e.target.value }
                })}
                placeholder="25000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Anzahl Episoden
              </label>
              <Input
                type="number"
                value={metrics.audio.episodeCount}
                onChange={(e) => setMetrics({
                  ...metrics,
                  audio: { ...metrics.audio, episodeCount: e.target.value }
                })}
                placeholder="120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Ø Episode-Länge (Minuten)
              </label>
              <Input
                type="number"
                step="0.1"
                value={metrics.audio.avgEpisodeDuration}
                onChange={(e) => setMetrics({
                  ...metrics,
                  audio: { ...metrics.audio, avgEpisodeDuration: e.target.value }
                })}
                placeholder="45.0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
