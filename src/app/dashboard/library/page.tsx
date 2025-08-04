// src/app/dashboard/library/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { 
  publicationService, 
  advertisementService
} from "@/lib/firebase/library-service";
import type { Publication, Advertisement } from "@/types/library";
import { 
  BookOpenIcon, 
  NewspaperIcon, 
  GlobeAltIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface LibraryStats {
  publications: {
    total: number;
    byType: Record<string, number>;
    verified: number;
    international: number;
  };
  advertisements: {
    total: number;
    withPricing: number;
    averagePrice: number;
  };
  coverage: {
    countries: string[];
    languages: string[];
    totalReach: number;
  };
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeLabel,
  href 
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: number;
  changeLabel?: string;
  href?: string;
}) {
  const content = (
    <div className="relative overflow-hidden rounded-lg bg-white px-4 py-5 border border-gray-200 sm:px-6 sm:py-6">
      <dt>
        <div className="absolute rounded-md bg-[#005fab] p-3">
          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <p className="ml-16 truncate text-sm font-medium text-gray-500">
          {title}
        </p>
      </dt>
      <dd className="ml-16 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {change !== undefined && (
          <p className={`ml-2 flex items-baseline text-sm font-semibold ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {change >= 0 ? (
              <ArrowUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 flex-shrink-0 self-center" />
            )}
            <span className="ml-1">
              {Math.abs(change)}% {changeLabel}
            </span>
          </p>
        )}
      </dd>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

export default function LibraryDashboard() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentPublications, setRecentPublications] = useState<Publication[]>([]);

  useEffect(() => {
    if (user && currentOrganization?.id) {
      loadStats();
      loadRecentPublications();
    }
  }, [user, currentOrganization?.id]);

  const loadStats = async () => {
    if (!user || !currentOrganization?.id) return;

    try {
      // Publikationen Stats
      const publications = await publicationService.getAll(currentOrganization.id);
      const publicationStats = {
        total: publications.length,
        byType: publications.reduce((acc: Record<string, number>, pub: Publication) => {
          acc[pub.type] = (acc[pub.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        verified: publications.filter((p: Publication) => p.verified).length,
        international: publications.filter((p: Publication) => 
          p.geographicTargets && p.geographicTargets.length > 1
        ).length
      };

      // Werbemittel Stats
      const advertisements = await advertisementService.getAll(currentOrganization.id);
      const adStats = {
        total: advertisements.length,
        withPricing: advertisements.filter((ad: Advertisement) => ad.pricing).length,
        averagePrice: advertisements
          .filter((ad: Advertisement) => ad.pricing?.listPrice)
          .reduce((sum: number, ad: Advertisement) => sum + (ad.pricing?.listPrice.amount || 0), 0) / 
          advertisements.filter((ad: Advertisement) => ad.pricing?.listPrice).length || 0
      };

      // Coverage Stats
      const countries = new Set<string>();
      const languages = new Set<string>();
      let totalReach = 0;

      publications.forEach((pub: Publication) => {
        pub.geographicTargets?.forEach((country: string) => countries.add(country));
        pub.languages?.forEach((lang: string) => languages.add(lang));
        
        if (pub.metrics?.print?.circulation) {
          totalReach += pub.metrics.print.circulation;
        }
        if (pub.metrics?.online?.monthlyUniqueVisitors) {
          totalReach += pub.metrics.online.monthlyUniqueVisitors;
        }
      });

      setStats({
        publications: publicationStats,
        advertisements: adStats,
        coverage: {
          countries: Array.from(countries),
          languages: Array.from(languages),
          totalReach
        }
      });
    } catch (error) {
      // Fehler beim Laden der Statistiken - wird im UI über loading state behandelt
    } finally {
      setLoading(false);
    }
  };

  const loadRecentPublications = async () => {
    if (!user || !currentOrganization?.id) return;

    try {
      const recent = await publicationService.getAll(currentOrganization.id, {
        limit: 5
      });
      // Sortiere manuell nach createdAt
      const sorted = recent.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toDate?.() || a.createdAt;
        const bTime = (b.createdAt as any)?.toDate?.() || b.createdAt;
        return (bTime as Date).getTime() - (aTime as Date).getTime();
      });
      setRecentPublications(sorted.slice(0, 5));
    } catch (error) {
      // Fehler beim Laden der Publikationen - wird im UI über empty state behandelt
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <p className="mt-4 text-gray-500">Lade Bibliothek-Statistiken...</p>
        </div>
      </div>
    );
  }

  const formatReach = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Statistik-Karten */}
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Übersicht
        </h3>
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Publikationen"
            value={stats?.publications.total || 0}
            icon={BookOpenIcon}
            change={12}
            changeLabel="diesen Monat"
            href="/dashboard/library/publications"
          />
          <StatCard
            title="Werbemittel"
            value={stats?.advertisements.total || 0}
            icon={NewspaperIcon}
            href="/dashboard/library/advertisements"
          />
          <StatCard
            title="Gesamtreichweite"
            value={formatReach(stats?.coverage.totalReach || 0)}
            icon={UserGroupIcon}
          />
        </dl>
      </div>

      {/* Geografische Abdeckung */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Internationale Abdeckung
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#005fab] text-white mx-auto">
              <GlobeAltIcon className="h-6 w-6" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {stats?.coverage.countries.length || 0}
            </p>
            <p className="text-sm text-gray-500">Länder</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#005fab] text-white mx-auto">
              <ChartBarIcon className="h-6 w-6" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {stats?.coverage.languages.length || 0}
            </p>
            <p className="text-sm text-gray-500">Sprachen</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#005fab] text-white mx-auto">
              <BookOpenIcon className="h-6 w-6" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {stats?.publications.verified || 0}
            </p>
            <p className="text-sm text-gray-500">Verifizierte Publikationen</p>
          </div>
        </div>
        
        {/* Länder-Badges */}
        {stats && stats.coverage.countries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Abgedeckte Länder:</p>
            <div className="flex flex-wrap gap-2">
              {stats.coverage.countries.slice(0, 10).map(country => (
                <Badge key={country} color="blue">
                  {country}
                </Badge>
              ))}
              {stats.coverage.countries.length > 10 && (
                <Badge color="zinc">
                  +{stats.coverage.countries.length - 10} weitere
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Publikationstypen */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Publikationen nach Typ
        </h3>
        <div className="space-y-3">
          {Object.entries(stats?.publications.byType || {}).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {type}
                </span>
              </div>
              <div className="flex items-center">
                <span className="mr-2 text-sm text-gray-500">{count}</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#005fab] h-2 rounded-full" 
                    style={{ 
                      width: `${(count / (stats?.publications.total || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zuletzt hinzugefügte Publikationen */}
      {recentPublications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Zuletzt hinzugefügte Publikationen
            </h3>
            <Link href="/dashboard/library/publications">
              <Button plain>Alle anzeigen</Button>
            </Link>
          </div>
          <div className="flow-root">
            <ul className="-my-3 divide-y divide-gray-200">
              {recentPublications.map((pub) => (
                <li key={pub.id} className="py-3">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {pub.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {pub.publisherName} • {pub.type}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {pub.verified && (
                        <Badge color="green">Verifiziert</Badge>
                      )}
                      <Badge color="zinc">
                        {pub.geographicTargets?.[0] || 'International'}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}