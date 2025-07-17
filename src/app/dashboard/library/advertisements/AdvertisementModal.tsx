// src/app/dashboard/library/advertisements/AdvertisementModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { advertisementService } from "@/lib/firebase/library-service";
import type { Advertisement, AdvertisementType, Publication, PriceModel } from "@/types/library";
import type { BaseEntity } from "@/types/international";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { 
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon
} from "@heroicons/react/20/solid";

interface AdvertisementModalProps {
  isOpen: boolean;
  onClose: () => void;
  advertisement?: Advertisement | null;
  publications: Publication[];
  onSuccess: () => void;
}

const advertisementTypes = [
  { value: 'display_banner', label: 'Display Banner' },
  { value: 'native_ad', label: 'Native Advertising' },
  { value: 'video_ad', label: 'Video-Werbung' },
  { value: 'print_ad', label: 'Print-Anzeige' },
  { value: 'audio_spot', label: 'Audio-Spot' },
  { value: 'newsletter_ad', label: 'Newsletter-Werbung' },
  { value: 'social_media_ad', label: 'Social Media Ad' },
  { value: 'advertorial', label: 'Advertorial' },
  { value: 'event_sponsoring', label: 'Event-Sponsoring' },
  { value: 'content_partnership', label: 'Content-Partnerschaft' },
  { value: 'custom', label: 'Individuell' }
];

const priceModels = [
  { value: 'cpm', label: 'TKP (Tausend-Kontakt-Preis)' },
  { value: 'cpc', label: 'CPC (Cost-per-Click)' },
  { value: 'cpa', label: 'CPA (Cost-per-Action)' },
  { value: 'flat', label: 'Pauschalpreis' },
  { value: 'negotiable', label: 'Verhandelbar' }
];

const statusOptions = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'active', label: 'Aktiv' },
  { value: 'paused', label: 'Pausiert' },
  { value: 'discontinued', label: 'Eingestellt' }
];

const currencies = [
  { value: 'EUR', label: '€ EUR' },
  { value: 'USD', label: '$ USD' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'CHF', label: 'CHF' }
];

// Vorschläge für Preiseinheiten basierend auf Preismodell
const priceUnitSuggestions: Record<string, string[]> = {
  cpm: ['1000 Impressions', '1000 Kontakte'],
  cpc: ['Klick', 'Click'],
  cpa: ['Conversion', 'Lead', 'Sale'],
  flat: ['Tag', 'Woche', 'Monat', 'Ausgabe', 'Kampagne'],
  negotiable: ['Nach Vereinbarung']
};

export function AdvertisementModal({ 
  isOpen, 
  onClose, 
  advertisement, 
  publications,
  onSuccess 
}: AdvertisementModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'specifications' | 'pricing' | 'availability'>('basic');
  
  // Form State - Basic
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    type: 'display_banner' as AdvertisementType,
    status: 'draft' as Advertisement['status'],
    publicationIds: [] as string[],
    publicNotes: '',
    internalNotes: ''
  });

  // Specifications State
  const [format, setFormat] = useState('');
  const [position, setPosition] = useState<string[]>([]);
  const [customSpecs, setCustomSpecs] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);

  // Print Specifications
  const [printSpecs, setPrintSpecs] = useState({
    dimensions: '',
    bleed: '',
    colorSpace: 'CMYK' as 'CMYK' | 'RGB' | 'SW',
    resolution: '300dpi',
    fileFormats: [] as string[],
    maxInkCoverage: 0
  });

  // Digital Specifications
  const [digitalSpecs, setDigitalSpecs] = useState({
    dimensions: [] as string[],
    maxFileSize: '',
    fileFormats: [] as string[],
    animated: false,
    maxAnimationLength: 0,
    clickTracking: true,
    thirdPartyTracking: false
  });

  // Video Specifications
  const [videoSpecs, setVideoSpecs] = useState({
    length: [] as number[],
    resolution: [] as string[],
    fileFormats: [] as string[],
    maxFileSize: '',
    aspectRatio: '16:9',
    audioCodec: ''
  });

  // Pricing State
  const [pricing, setPricing] = useState({
    listPrice: { amount: 0, currency: 'EUR' },
    priceModel: 'flat' as PriceModel,
    priceUnit: '',
    minimumOrder: { quantity: 0, unit: '' },
    agencyDiscount: 0,
    earlyBooking: { daysInAdvance: 0, discountPercent: 0 }
  });

  // Volume Discounts
  const [volumeDiscounts, setVolumeDiscounts] = useState<Array<{
    threshold: number;
    unit: string;
    discountPercent: number;
  }>>([]);

  // Surcharges
  const [surcharges, setSurcharges] = useState<Array<{
    type: string;
    amount: number;
    isPercentage: boolean;
    description: string;
  }>>([]);

  // Availability State
  const [availability, setAvailability] = useState({
    bookingDeadlineDays: 3,
    bookingDeadlineType: 'business_days' as 'business_days' | 'calendar_days',
    bookingDeadlineTime: '',
    bookingDeadlineNotes: ''
  });

  // Position options based on type
  const getPositionOptions = (type: AdvertisementType): string[] => {
    switch (type) {
      case 'display_banner':
      case 'native_ad':
        return ['Above the fold', 'Sidebar', 'In-Content', 'Footer'];
      case 'print_ad':
        return ['U2', 'U3', 'U4', 'Inhaltsseite', 'Titelseite'];
      case 'newsletter_ad':
        return ['Header', 'Middle', 'Footer'];
      default:
        return [];
    }
  };

  useEffect(() => {
    if (advertisement) {
      // Lade bestehende Werbemittel-Daten
      setFormData({
        name: advertisement.name,
        displayName: advertisement.displayName || '',
        description: advertisement.description || '',
        type: advertisement.type,
        status: advertisement.status,
        publicationIds: advertisement.publicationIds,
        publicNotes: advertisement.publicNotes || '',
        internalNotes: advertisement.internalNotes || ''
      });

      // Specifications
      setFormat(advertisement.specifications?.format || '');
      setPosition(advertisement.specifications?.position || []);
      
      if (advertisement.specifications?.printSpecs) {
        setPrintSpecs({
          dimensions: advertisement.specifications.printSpecs.dimensions || '',
          bleed: advertisement.specifications.printSpecs.bleed || '',
          colorSpace: advertisement.specifications.printSpecs.colorSpace || 'CMYK',
          resolution: advertisement.specifications.printSpecs.resolution || '300dpi',
          fileFormats: advertisement.specifications.printSpecs.fileFormats || [],
          maxInkCoverage: advertisement.specifications.printSpecs.maxInkCoverage || 0
        });
      }
      
      if (advertisement.specifications?.digitalSpecs) {
        setDigitalSpecs({
          dimensions: advertisement.specifications.digitalSpecs.dimensions || [],
          maxFileSize: advertisement.specifications.digitalSpecs.maxFileSize || '',
          fileFormats: advertisement.specifications.digitalSpecs.fileFormats || [],
          animated: advertisement.specifications.digitalSpecs.animated || false,
          maxAnimationLength: advertisement.specifications.digitalSpecs.maxAnimationLength || 0,
          clickTracking: advertisement.specifications.digitalSpecs.clickTracking !== false,
          thirdPartyTracking: advertisement.specifications.digitalSpecs.thirdPartyTracking || false
        });
      }
      
      if (advertisement.specifications?.videoSpecs) {
        setVideoSpecs({
          ...videoSpecs,
          ...advertisement.specifications.videoSpecs
        });
      }

      // Custom Specs
      if (advertisement.specifications?.customSpecs) {
        const entries = Object.entries(advertisement.specifications.customSpecs).map(([key, value]) => ({
          key,
          value: String(value)
        }));
        setCustomSpecs(entries.length > 0 ? entries : [{ key: '', value: '' }]);
      }

      // Pricing
      setPricing({
        listPrice: advertisement.pricing.listPrice,
        priceModel: advertisement.pricing.priceModel,
        priceUnit: advertisement.pricing.priceUnit || '',
        minimumOrder: advertisement.pricing.minimumOrder || { quantity: 0, unit: '' },
        agencyDiscount: advertisement.pricing.discounts?.agency || 0,
        earlyBooking: advertisement.pricing.discounts?.earlyBooking || { daysInAdvance: 0, discountPercent: 0 }
      });

      // Volume Discounts
      if (advertisement.pricing.discounts?.volume) {
        setVolumeDiscounts(advertisement.pricing.discounts.volume);
      }

      // Surcharges
      if (advertisement.pricing.surcharges) {
        setSurcharges(advertisement.pricing.surcharges.map(s => ({
          type: s.type,
          amount: typeof s.amount === 'number' ? s.amount : s.amount.amount,
          isPercentage: typeof s.amount === 'number',
          description: s.description || ''
        })));
      }

      // Availability
      if (advertisement.availability.bookingDeadline) {
        setAvailability({
          bookingDeadlineDays: advertisement.availability.bookingDeadline.days,
          bookingDeadlineType: advertisement.availability.bookingDeadline.type,
          bookingDeadlineTime: advertisement.availability.bookingDeadline.time || '',
          bookingDeadlineNotes: advertisement.availability.bookingDeadline.notes || ''
        });
      }
    }
  }, [advertisement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Bereite Daten vor
      const advertisementData: Omit<Advertisement, keyof BaseEntity | 'organizationId'> = {
        ...formData,
        publicationNames: formData.publicationIds.map(id => 
          publications.find(p => p.id === id)?.title || ''
        ).filter(Boolean),
        specifications: {
          format,
          position: position.length > 0 ? position : undefined,
          printSpecs: formData.type === 'print_ad' ? {
            dimensions: printSpecs.dimensions || undefined,
            bleed: printSpecs.bleed || undefined,
            colorSpace: printSpecs.colorSpace,
            resolution: printSpecs.resolution || undefined,
            fileFormats: printSpecs.fileFormats.length > 0 ? printSpecs.fileFormats : undefined,
            maxInkCoverage: printSpecs.maxInkCoverage > 0 ? printSpecs.maxInkCoverage : undefined
          } : undefined,
          digitalSpecs: ['display_banner', 'native_ad', 'newsletter_ad', 'social_media_ad'].includes(formData.type) 
            ? {
                dimensions: digitalSpecs.dimensions.length > 0 ? digitalSpecs.dimensions : undefined,
                maxFileSize: digitalSpecs.maxFileSize || undefined,
                fileFormats: digitalSpecs.fileFormats.length > 0 ? digitalSpecs.fileFormats : undefined,
                animated: digitalSpecs.animated,
                maxAnimationLength: digitalSpecs.maxAnimationLength > 0 ? digitalSpecs.maxAnimationLength : undefined,
                clickTracking: digitalSpecs.clickTracking,
                thirdPartyTracking: digitalSpecs.thirdPartyTracking
              } : undefined,
          videoSpecs: formData.type === 'video_ad' ? videoSpecs : undefined,
          customSpecs: customSpecs
            .filter(s => s.key && s.value)
            .reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
        },
        pricing: {
          listPrice: pricing.listPrice,
          priceModel: pricing.priceModel,
          priceUnit: pricing.priceUnit || undefined,
          minimumOrder: pricing.minimumOrder.quantity > 0 ? pricing.minimumOrder : undefined,
          discounts: {
            volume: volumeDiscounts.length > 0 ? volumeDiscounts : undefined,
            agency: pricing.agencyDiscount > 0 ? pricing.agencyDiscount : undefined,
            earlyBooking: pricing.earlyBooking.daysInAdvance > 0 ? pricing.earlyBooking : undefined
          },
          surcharges: surcharges
            .filter(s => s.type && s.amount > 0)
            .map(s => ({
              type: s.type,
              amount: s.isPercentage ? s.amount : { amount: s.amount, currency: pricing.listPrice.currency },
              description: s.description || undefined
            }))
        },
        availability: {
          bookingDeadline: {
            days: availability.bookingDeadlineDays,
            type: availability.bookingDeadlineType,
            time: availability.bookingDeadlineTime || undefined,
            notes: availability.bookingDeadlineNotes || undefined
          }
        },
        materials: {},
        primaryContactId: undefined,
        salesContactIds: undefined
      };

      if (advertisement?.id) {
        // Update
        await advertisementService.update(advertisement.id, advertisementData as any, {
          organizationId: user.uid,
          userId: user.uid
        });
      } else {
        // Create
        await advertisementService.create(advertisementData as any, {
          organizationId: user.uid,
          userId: user.uid
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving advertisement:", error);
      alert("Fehler beim Speichern des Werbemittels");
    } finally {
      setLoading(false);
    }
  };

  const addCustomSpec = () => {
    setCustomSpecs([...customSpecs, { key: '', value: '' }]);
  };

  const removeCustomSpec = (index: number) => {
    setCustomSpecs(customSpecs.filter((_, i) => i !== index));
  };

  const addVolumeDiscount = () => {
    setVolumeDiscounts([...volumeDiscounts, { threshold: 0, unit: '', discountPercent: 0 }]);
  };

  const removeVolumeDiscount = (index: number) => {
    setVolumeDiscounts(volumeDiscounts.filter((_, i) => i !== index));
  };

  const addSurcharge = () => {
    setSurcharges([...surcharges, { type: '', amount: 0, isPercentage: false, description: '' }]);
  };

  const removeSurcharge = (index: number) => {
    setSurcharges(surcharges.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="sm:max-w-4xl">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {advertisement ? 'Werbemittel bearbeiten' : 'Neues Werbemittel'}
        </h3>
        <button
          onClick={onClose}
          className="rounded-md text-gray-400 hover:text-gray-500"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`${
              activeTab === 'basic' 
                ? 'border-[#005fab] text-[#005fab]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Grunddaten
          </button>
          <button
            onClick={() => setActiveTab('specifications')}
            className={`${
              activeTab === 'specifications' 
                ? 'border-[#005fab] text-[#005fab]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Spezifikationen
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`${
              activeTab === 'pricing' 
                ? 'border-[#005fab] text-[#005fab]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Preisgestaltung
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`${
              activeTab === 'availability' 
                ? 'border-[#005fab] text-[#005fab]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Verfügbarkeit
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Grunddaten Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interner Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="z.B. Banner_Homepage_Top"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anzeigename
                </label>
                <Input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="z.B. Premium Banner Homepage"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Kurze Beschreibung des Werbemittels..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ *
                </label>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  {advertisementTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publikationen *
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {publications.map(pub => (
                  <label key={pub.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.publicationIds.includes(pub.id!)}
                      onChange={(checked) => {
                        if (checked) {
                          setFormData({ 
                            ...formData, 
                            publicationIds: [...formData.publicationIds, pub.id!] 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            publicationIds: formData.publicationIds.filter(id => id !== pub.id) 
                          });
                        }
                      }}
                    />
                    <span className="text-sm">{pub.title}</span>
                    {pub.type && (
                      <Badge color="zinc" className="text-xs">{pub.type}</Badge>
                    )}
                  </label>
                ))}
              </div>
              {publications.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  Keine Publikationen vorhanden. Bitte erst Publikationen anlegen.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Öffentliche Notizen
              </label>
              <Textarea
                value={formData.publicNotes}
                onChange={(e) => setFormData({ ...formData, publicNotes: e.target.value })}
                rows={2}
                placeholder="Notizen für Kunden/Media Kit..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interne Notizen
              </label>
              <Textarea
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                rows={2}
                placeholder="Interne Notizen (nicht öffentlich)..."
              />
            </div>
          </div>
        )}

        {/* Spezifikationen Tab */}
        {activeTab === 'specifications' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Format
              </label>
              <Input
                type="text"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder={
                  formData.type === 'display_banner' ? 'z.B. Rectangle, Skyscraper' :
                  formData.type === 'print_ad' ? 'z.B. 1/1 Seite, 1/2 Seite' :
                  'z.B. Format eingeben...'
                }
              />
            </div>

            {getPositionOptions(formData.type).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position(en)
                </label>
                <div className="space-y-2">
                  {getPositionOptions(formData.type).map(pos => (
                    <label key={pos} className="flex items-center space-x-2">
                      <Checkbox
                        checked={position.includes(pos)}
                        onChange={(checked) => {
                          if (checked) {
                            setPosition([...position, pos]);
                          } else {
                            setPosition(position.filter(p => p !== pos));
                          }
                        }}
                      />
                      <span className="text-sm">{pos}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Print Specifications */}
            {formData.type === 'print_ad' && (
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Print-Spezifikationen</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Abmessungen
                    </label>
                    <Input
                      type="text"
                      value={printSpecs.dimensions}
                      onChange={(e) => setPrintSpecs({ ...printSpecs, dimensions: e.target.value })}
                      placeholder="z.B. 210x280mm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anschnitt
                    </label>
                    <Input
                      type="text"
                      value={printSpecs.bleed}
                      onChange={(e) => setPrintSpecs({ ...printSpecs, bleed: e.target.value })}
                      placeholder="z.B. 3mm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Farbraum
                    </label>
                    <Select
                      value={printSpecs.colorSpace}
                      onChange={(e) => setPrintSpecs({ ...printSpecs, colorSpace: e.target.value as any })}
                    >
                      <option value="CMYK">CMYK</option>
                      <option value="RGB">RGB</option>
                      <option value="SW">Schwarz-Weiß</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auflösung
                    </label>
                    <Input
                      type="text"
                      value={printSpecs.resolution}
                      onChange={(e) => setPrintSpecs({ ...printSpecs, resolution: e.target.value })}
                      placeholder="z.B. 300dpi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max. Farbauftrag (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="400"
                      value={printSpecs.maxInkCoverage}
                      onChange={(e) => setPrintSpecs({ ...printSpecs, maxInkCoverage: parseInt(e.target.value) || 0 })}
                      placeholder="z.B. 300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dateiformate
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['PDF/X-4', 'PDF/X-1a', 'EPS', 'TIFF', 'JPEG'].map(format => (
                      <label key={format} className="flex items-center space-x-1">
                        <Checkbox
                          checked={printSpecs.fileFormats.includes(format)}
                          onChange={(checked) => {
                            if (checked) {
                              setPrintSpecs({ 
                                ...printSpecs, 
                                fileFormats: [...printSpecs.fileFormats, format] 
                              });
                            } else {
                              setPrintSpecs({ 
                                ...printSpecs, 
                                fileFormats: printSpecs.fileFormats.filter(f => f !== format) 
                              });
                            }
                          }}
                        />
                        <span className="text-sm">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Digital Specifications */}
            {['display_banner', 'native_ad', 'newsletter_ad', 'social_media_ad'].includes(formData.type) && (
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Digital-Spezifikationen</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Abmessungen
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['728x90', '300x250', '320x50', '300x600', '970x250', '320x100'].map(dim => (
                      <label key={dim} className="flex items-center space-x-1">
                        <Checkbox
                          checked={digitalSpecs.dimensions.includes(dim)}
                          onChange={(checked) => {
                            if (checked) {
                              setDigitalSpecs({ 
                                ...digitalSpecs, 
                                dimensions: [...digitalSpecs.dimensions, dim] 
                              });
                            } else {
                              setDigitalSpecs({ 
                                ...digitalSpecs, 
                                dimensions: digitalSpecs.dimensions.filter(d => d !== dim) 
                              });
                            }
                          }}
                        />
                        <span className="text-sm">{dim}px</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max. Dateigröße
                    </label>
                    <Input
                      type="text"
                      value={digitalSpecs.maxFileSize}
                      onChange={(e) => setDigitalSpecs({ ...digitalSpecs, maxFileSize: e.target.value })}
                      placeholder="z.B. 150KB"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max. Animationslänge (Sek.)
                    </label>
                    <Input
                      type="number"
                      value={digitalSpecs.maxAnimationLength}
                      onChange={(e) => setDigitalSpecs({ ...digitalSpecs, maxAnimationLength: parseInt(e.target.value) || 0 })}
                      placeholder="z.B. 30"
                      disabled={!digitalSpecs.animated}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dateiformate
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['JPG', 'PNG', 'GIF', 'HTML5', 'MP4'].map(format => (
                      <label key={format} className="flex items-center space-x-1">
                        <Checkbox
                          checked={digitalSpecs.fileFormats.includes(format)}
                          onChange={(checked) => {
                            if (checked) {
                              setDigitalSpecs({ 
                                ...digitalSpecs, 
                                fileFormats: [...digitalSpecs.fileFormats, format] 
                              });
                            } else {
                              setDigitalSpecs({ 
                                ...digitalSpecs, 
                                fileFormats: digitalSpecs.fileFormats.filter(f => f !== format) 
                              });
                            }
                          }}
                        />
                        <span className="text-sm">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={digitalSpecs.animated}
                      onChange={(checked) => setDigitalSpecs({ ...digitalSpecs, animated: checked })}
                    />
                    <span className="text-sm">Animation erlaubt</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={digitalSpecs.clickTracking}
                      onChange={(checked) => setDigitalSpecs({ ...digitalSpecs, clickTracking: checked })}
                    />
                    <span className="text-sm">Click-Tracking</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={digitalSpecs.thirdPartyTracking}
                      onChange={(checked) => setDigitalSpecs({ ...digitalSpecs, thirdPartyTracking: checked })}
                    />
                    <span className="text-sm">Third-Party Tracking erlaubt</span>
                  </label>
                </div>
              </div>
            )}

            {/* Custom Specifications */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Weitere Spezifikationen
                </label>
                <Button type="button" plain onClick={addCustomSpec} className="text-sm">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Hinzufügen
                </Button>
              </div>
              <div className="space-y-2">
                {customSpecs.map((spec, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      value={spec.key}
                      onChange={(e) => {
                        const updated = [...customSpecs];
                        updated[index].key = e.target.value;
                        setCustomSpecs(updated);
                      }}
                      placeholder="Eigenschaft"
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      value={spec.value}
                      onChange={(e) => {
                        const updated = [...customSpecs];
                        updated[index].value = e.target.value;
                        setCustomSpecs(updated);
                      }}
                      placeholder="Wert"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      plain
                      onClick={() => removeCustomSpec(index)}
                      disabled={customSpecs.length === 1}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preisgestaltung Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Listenpreis *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={pricing.listPrice.amount}
                  onChange={(e) => setPricing({
                    ...pricing,
                    listPrice: { ...pricing.listPrice, amount: parseFloat(e.target.value) || 0 }
                  })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Währung
                </label>
                <Select
                  value={pricing.listPrice.currency}
                  onChange={(e) => setPricing({
                    ...pricing,
                    listPrice: { ...pricing.listPrice, currency: e.target.value }
                  })}
                >
                  {currencies.map(curr => (
                    <option key={curr.value} value={curr.value}>
                      {curr.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preismodell *
                </label>
                <Select
                  value={pricing.priceModel}
                  onChange={(e) => {
                    const model = e.target.value as PriceModel;
                    setPricing({ 
                      ...pricing, 
                      priceModel: model,
                      priceUnit: priceUnitSuggestions[model]?.[0] || ''
                    });
                  }}
                >
                  {priceModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preiseinheit
              </label>
              <Input
                type="text"
                value={pricing.priceUnit}
                onChange={(e) => setPricing({ ...pricing, priceUnit: e.target.value })}
                placeholder={`z.B. ${priceUnitSuggestions[pricing.priceModel]?.join(', ')}`}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900">Mindestbestellung</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menge
                  </label>
                  <Input
                    type="number"
                    value={pricing.minimumOrder.quantity}
                    onChange={(e) => setPricing({
                      ...pricing,
                      minimumOrder: { ...pricing.minimumOrder, quantity: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Einheit
                  </label>
                  <Input
                    type="text"
                    value={pricing.minimumOrder.unit}
                    onChange={(e) => setPricing({
                      ...pricing,
                      minimumOrder: { ...pricing.minimumOrder, unit: e.target.value }
                    })}
                    placeholder="z.B. Impressions, Wochen"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900">Rabatte</h4>
              
              {/* Agency Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agentur-Provision (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={pricing.agencyDiscount}
                  onChange={(e) => setPricing({ ...pricing, agencyDiscount: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Early Booking */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frühbucher - Tage im Voraus
                  </label>
                  <Input
                    type="number"
                    value={pricing.earlyBooking.daysInAdvance}
                    onChange={(e) => setPricing({
                      ...pricing,
                      earlyBooking: { ...pricing.earlyBooking, daysInAdvance: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frühbucher-Rabatt (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={pricing.earlyBooking.discountPercent}
                    onChange={(e) => setPricing({
                      ...pricing,
                      earlyBooking: { ...pricing.earlyBooking, discountPercent: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>

              {/* Volume Discounts */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Mengenrabatte
                  </label>
                  <Button type="button" plain onClick={addVolumeDiscount} className="text-sm">
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Hinzufügen
                  </Button>
                </div>
                <div className="space-y-2">
                  {volumeDiscounts.map((discount, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="number"
                        value={discount.threshold}
                        onChange={(e) => {
                          const updated = [...volumeDiscounts];
                          updated[index].threshold = parseInt(e.target.value) || 0;
                          setVolumeDiscounts(updated);
                        }}
                        placeholder="Ab Menge"
                        className="w-32"
                      />
                      <Input
                        type="text"
                        value={discount.unit}
                        onChange={(e) => {
                          const updated = [...volumeDiscounts];
                          updated[index].unit = e.target.value;
                          setVolumeDiscounts(updated);
                        }}
                        placeholder="Einheit"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={discount.discountPercent}
                        onChange={(e) => {
                          const updated = [...volumeDiscounts];
                          updated[index].discountPercent = parseInt(e.target.value) || 0;
                          setVolumeDiscounts(updated);
                        }}
                        placeholder="%"
                        className="w-20"
                      />
                      <Button
                        type="button"
                        plain
                        onClick={() => removeVolumeDiscount(index)}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Surcharges */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Aufpreise
                </label>
                <Button type="button" plain onClick={addSurcharge} className="text-sm">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Hinzufügen
                </Button>
              </div>
              <div className="space-y-2">
                {surcharges.map((surcharge, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      value={surcharge.type}
                      onChange={(e) => {
                        const updated = [...surcharges];
                        updated[index].type = e.target.value;
                        setSurcharges(updated);
                      }}
                      placeholder="Typ (z.B. Platzierung)"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={surcharge.amount}
                      onChange={(e) => {
                        const updated = [...surcharges];
                        updated[index].amount = parseFloat(e.target.value) || 0;
                        setSurcharges(updated);
                      }}
                      placeholder="Betrag"
                      className="w-24"
                    />
                    <Select
                      value={surcharge.isPercentage ? '%' : pricing.listPrice.currency}
                      onChange={(e) => {
                        const updated = [...surcharges];
                        updated[index].isPercentage = e.target.value === '%';
                        setSurcharges(updated);
                      }}
                      className="w-20"
                    >
                      <option value={pricing.listPrice.currency}>{pricing.listPrice.currency}</option>
                      <option value="%">%</option>
                    </Select>
                    <Button
                      type="button"
                      plain
                      onClick={() => removeSurcharge(index)}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Verfügbarkeit Tab */}
        {activeTab === 'availability' && (
          <div className="space-y-6">
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900">Buchungs-Deadline</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorlaufzeit *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={availability.bookingDeadlineDays}
                    onChange={(e) => setAvailability({ 
                      ...availability, 
                      bookingDeadlineDays: parseInt(e.target.value) || 0 
                    })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zeittyp
                  </label>
                  <Select
                    value={availability.bookingDeadlineType}
                    onChange={(e) => setAvailability({ 
                      ...availability, 
                      bookingDeadlineType: e.target.value as any 
                    })}
                  >
                    <option value="business_days">Werktage</option>
                    <option value="calendar_days">Kalendertage</option>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uhrzeit
                </label>
                <Input
                  type="time"
                  value={availability.bookingDeadlineTime}
                  onChange={(e) => setAvailability({ 
                    ...availability, 
                    bookingDeadlineTime: e.target.value 
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hinweise zur Deadline
                </label>
                <Textarea
                  value={availability.bookingDeadlineNotes}
                  onChange={(e) => setAvailability({ 
                    ...availability, 
                    bookingDeadlineNotes: e.target.value 
                  })}
                  rows={2}
                  placeholder="z.B. Für Farbänderungen 2 Tage extra"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Erweiterte Verfügbarkeitsoptionen
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Weitere Optionen wie Blackout-Dates, Saisonalität und Inventar-Management
                      können in einer zukünftigen Version hinzugefügt werden.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button plain onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={loading || formData.publicationIds.length === 0}>
            {loading ? 'Speichern...' : advertisement ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}