/**
 * Candidate Variant Card Komponente
 *
 * Zeigt eine einzelne Variante eines Kandidaten:
 * - Organisations-Info
 * - Kontakt-Details
 * - Vollständigkeits-Indikatoren
 * - Auswahl-Button
 * - Empfehlungs-Badge
 */

'use client';

import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  BriefcaseIcon,
  NewspaperIcon,
  CheckCircleIcon,
  SparklesIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MatchingCandidateVariant } from '@/types/matching';

interface CandidateVariantCardProps {
  variant: MatchingCandidateVariant;
  index: number;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}

export default function CandidateVariantCard({
  variant,
  index,
  isSelected,
  isRecommended,
  onSelect
}: CandidateVariantCardProps) {
  const data = variant.contactData;

  /**
   * Berechnet Vollständigkeits-Score
   */
  const getCompletenessScore = (): number => {
    let score = 0;
    let total = 0;

    // E-Mail
    total++;
    if (data.emails && data.emails.length > 0) score++;

    // Telefon
    total++;
    if (data.phones && data.phones.length > 0) score++;

    // Position
    total++;
    if (data.position) score++;

    // Firma
    total++;
    if (data.companyName) score++;

    // Media Profile
    total++;
    if (data.hasMediaProfile) score++;

    // Beats
    total++;
    if (data.beats && data.beats.length > 0) score++;

    // Social Media
    total++;
    if (data.socialProfiles && data.socialProfiles.length > 0) score++;

    return Math.round((score / total) * 100);
  };

  const completeness = getCompletenessScore();

  /**
   * Vollständigkeits-Farbe
   */
  const getCompletenessColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div
      className={`
        relative rounded-lg border-2 p-4 transition-all cursor-pointer
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
        }
      `}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Varianten-Nummer */}
          <div className="flex-shrink-0">
            <div className={`
              size-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }
            `}>
              {index + 1}
            </div>
          </div>

          {/* Organisation */}
          <div>
            <div className="flex items-center gap-2">
              <BuildingOfficeIcon className="size-4 text-zinc-400" />
              <span className="font-semibold text-zinc-900 dark:text-white">
                {variant.organizationName}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Variante #{index + 1}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Recommended Badge */}
          {isRecommended && (
            <Badge color="indigo" className="flex items-center gap-1">
              <SparklesIcon className="size-3" />
              <span>Empfohlen</span>
            </Badge>
          )}

          {/* Selected Badge */}
          {isSelected && (
            <Badge color="green" className="flex items-center gap-1">
              <CheckCircleIcon className="size-3" />
              <span>Ausgewählt</span>
            </Badge>
          )}

          {/* Completeness Badge */}
          <Badge color="zinc">
            <span className={getCompletenessColor(completeness)}>
              {`${completeness}%`}
            </span>
          </Badge>
        </div>
      </div>

      {/* Kontakt-Details */}
      <div className="space-y-3">
        {/* Name */}
        <div className="flex items-start gap-2">
          <UserIcon className="size-5 text-zinc-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-zinc-900 dark:text-white">
              {data.name.title && <span className="text-zinc-500">{data.name.title} </span>}
              {`${data.name.firstName || ''} ${data.name.lastName || ''}`.trim()}
              {data.name.suffix && <span className="text-zinc-500">, {data.name.suffix}</span>}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {data.displayName}
            </div>
          </div>
        </div>

        {/* E-Mails */}
        {data.emails && data.emails.length > 0 && (
          <div className="flex items-start gap-2">
            <EnvelopeIcon className="size-5 text-zinc-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {data.emails.map((email, idx) => (
                <div key={idx} className="text-sm">
                  <span className="text-zinc-900 dark:text-white">{email.email}</span>
                  {email.isPrimary && (
                    <Badge color="indigo" className="ml-2 text-xs">Primary</Badge>
                  )}
                  {email.type && <span className="text-zinc-500 ml-2">({email.type})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Telefon */}
        {data.phones && data.phones.length > 0 && (
          <div className="flex items-start gap-2">
            <PhoneIcon className="size-5 text-zinc-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {data.phones.map((phone, idx) => (
                <div key={idx} className="text-sm">
                  <span className="text-zinc-900 dark:text-white">{phone.number}</span>
                  {phone.isPrimary && (
                    <Badge color="indigo" className="ml-2 text-xs">Primary</Badge>
                  )}
                  {phone.type && <span className="text-zinc-500 ml-2">({phone.type})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Position & Firma */}
        {(data.position || data.companyName) && (
          <div className="flex items-start gap-2">
            <BriefcaseIcon className="size-5 text-zinc-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              {data.position && (
                <div className="text-zinc-900 dark:text-white">{data.position}</div>
              )}
              {data.companyName && (
                <div className="text-zinc-600 dark:text-zinc-400">{data.companyName}</div>
              )}
              {data.department && (
                <div className="text-zinc-500 text-xs mt-0.5">{data.department}</div>
              )}
            </div>
          </div>
        )}

        {/* Media Profile */}
        {data.hasMediaProfile && (
          <div className="flex items-start gap-2">
            <NewspaperIcon className="size-5 text-zinc-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                Journalist
              </div>

              {/* Beats */}
              {data.beats && data.beats.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {data.beats.map((beat, idx) => (
                    <Badge key={idx} color="zinc" className="text-xs">
                      {beat}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Media Types */}
              {data.mediaTypes && data.mediaTypes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {data.mediaTypes.map((type, idx) => (
                    <Badge key={idx} color="indigo" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Social Media */}
        {data.socialProfiles && data.socialProfiles.length > 0 && (
          <div className="flex items-start gap-2">
            <GlobeAltIcon className="size-5 text-zinc-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {data.socialProfiles.map((profile, idx) => (
                <div key={idx} className="text-sm">
                  {profile.platform && (
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {profile.platform}:{' '}
                    </span>
                  )}
                  <a
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {profile.handle || profile.url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Select Button */}
      {!isSelected && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            color="zinc"
            onClick={onSelect}
            className="w-full"
          >
            Diese Variante auswählen
          </Button>
        </div>
      )}
    </div>
  );
}
