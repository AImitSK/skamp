// src/app/dashboard/contacts/crm/components/modals/CompanyModal/MediaSection.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { InfoTooltip } from "@/components/InfoTooltip";
import { BookOpenIcon, PlusIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { publicationService, advertisementService } from "@/lib/firebase/library-service";
import { Publication, Advertisement } from "@/types/library";
import { CompanyModalSectionProps } from "./types";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MediaSectionProps extends CompanyModalSectionProps {
  companyId?: string;
  userId: string;
}

// Alert Component
function Alert({
  type = 'info',
  title,
  message
}: {
  type?: 'info' | 'error';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700'
  };

  const Icon = InformationCircleIcon;

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

/**
 * Media Section für CompanyModal
 *
 * Zeigt verknüpfte Publikationen für Medienunternehmen (nur für publisher, media_house, agency)
 */
export function MediaSection({ formData, companyId, userId }: MediaSectionProps) {
  const router = useRouter();
  const [linkedPublications, setLinkedPublications] = useState<Publication[]>([]);
  const [linkedAdvertisements, setLinkedAdvertisements] = useState<Advertisement[]>([]);
  const [loadingLibraryData, setLoadingLibraryData] = useState(false);

  const loadLibraryData = useCallback(async (id: string) => {
    if (!userId) return;

    setLoadingLibraryData(true);
    try {
      // Load publications
      const publications = await publicationService.getByPublisherId(id, userId);
      setLinkedPublications(publications);

      // Load advertisements (filter by publications of this company)
      if (publications.length > 0) {
        const publicationIds = publications.map(p => p.id!).filter(Boolean);
        const allAds = await advertisementService.getAll(userId);
        const companyAds = allAds.filter(ad =>
          ad.publicationIds.some(pubId => publicationIds.includes(pubId))
        );
        setLinkedAdvertisements(companyAds);
      } else {
        setLinkedAdvertisements([]);
      }
    } catch (error) {
      // Error loading library data
    } finally {
      setLoadingLibraryData(false);
    }
  }, [userId]);

  useEffect(() => {
    if (companyId) {
      loadLibraryData(companyId);
    }
  }, [companyId, loadLibraryData]);

  const isMediaCompany = ['publisher', 'media_house', 'agency'].includes(formData.type!);

  if (!isMediaCompany) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert
        type="info"
        title="Medien-Verwaltung"
        message="Publikationen werden jetzt zentral im Bibliotheks-Bereich verwaltet. Hier sehen Sie alle verknüpften Publikationen."
      />

      {/* Publikationen */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5 text-gray-400" />
            <div className="text-sm font-medium text-gray-900">
              Publikationen
              <InfoTooltip content="Alle Publikationen dieses Verlags/Medienhauses" className="ml-1.5 inline-flex align-text-top" />
            </div>
          </div>
          <Button
            type="button"
            plain
            onClick={() => {
              const publisherId = companyId;
              router.push(`/dashboard/library/publications/new${publisherId ? `?publisherId=${publisherId}` : ''}`);
            }}
            className="text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            Neue Publikation
          </Button>
        </div>

        {loadingLibraryData ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : linkedPublications.length > 0 ? (
          <div className="space-y-2">
            {linkedPublications.map((pub) => {
              // Count advertisements for this publication
              const adCount = linkedAdvertisements.filter(ad =>
                ad.publicationIds.includes(pub.id!)
              ).length;

              return (
                <div key={pub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{pub.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color="zinc" className="text-xs">
                        {pub.type === 'magazine' ? 'Magazin' :
                         pub.type === 'newspaper' ? 'Zeitung' :
                         pub.type === 'website' ? 'Website' :
                         pub.type === 'blog' ? 'Blog' :
                         pub.type === 'newsletter' ? 'Newsletter' :
                         pub.type === 'podcast' ? 'Podcast' :
                         pub.type === 'tv' ? 'TV' :
                         pub.type === 'radio' ? 'Radio' :
                         pub.type === 'trade_journal' ? 'Fachzeitschrift' :
                         pub.type === 'press_agency' ? 'Nachrichtenagentur' :
                         pub.type === 'social_media' ? 'Social Media' :
                         pub.type}
                      </Badge>
                      {pub.verified && (
                        <Badge color="green" className="text-xs">
                          Verifiziert
                        </Badge>
                      )}
                      {adCount > 0 && (
                        <Badge color="blue" className="text-xs">
                          {adCount} {adCount === 1 ? 'Werbemittel' : 'Werbemittel'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/library/publications/${pub.id}`}
                    className="text-sm text-primary hover:text-primary-hover ml-4"
                  >
                    Anzeigen
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <Text className="text-sm text-gray-500 text-center py-4">
            Noch keine Publikationen verknüpft
          </Text>
        )}
      </div>
    </div>
  );
}
