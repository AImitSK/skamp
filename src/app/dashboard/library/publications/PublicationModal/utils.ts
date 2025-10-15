// src/app/dashboard/library/publications/PublicationModal/utils.ts

import type { Publication } from '@/types/library';
import type { MetricsState, IdentifierItem, SocialMediaItem } from './types';

// Helper function to remove undefined values from objects
export const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }

  if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          const cleaned = removeUndefined(value);
          if (cleaned !== undefined && Object.keys(cleaned).length > 0) {
            newObj[key] = cleaned;
          }
        } else if (Array.isArray(value)) {
          const cleaned = removeUndefined(value);
          if (cleaned.length > 0) {
            newObj[key] = cleaned;
          }
        } else {
          newObj[key] = value;
        }
      }
    });
    return newObj;
  }

  return obj;
};

// Helper: Prepare metrics for submission
export const prepareMetrics = (
  metrics: MetricsState,
  format: 'print' | 'online' | 'both' | 'broadcast'
): any => {
  const preparedMetrics: any = {
    frequency: metrics.frequency
  };

  // Nur optionale Felder hinzufügen wenn vorhanden
  if (metrics.targetAudience) {
    preparedMetrics.targetAudience = metrics.targetAudience;
  }
  if (metrics.targetAgeGroup) {
    preparedMetrics.targetAgeGroup = metrics.targetAgeGroup;
  }
  if (metrics.targetGender && metrics.targetGender !== 'all') {
    preparedMetrics.targetGender = metrics.targetGender;
  }

  // Print-Metriken hinzufügen, wenn Format print oder both
  if (format === 'print' || format === 'both') {
    // Prüfe ob IRGENDEIN Print-Feld ausgefüllt ist
    const hasPrintData = metrics.print.circulation || metrics.print.pricePerIssue ||
      metrics.print.subscriptionPriceMonthly || metrics.print.subscriptionPriceAnnual ||
      metrics.print.pageCount || metrics.print.paperFormat;

    if (hasPrintData) {
      preparedMetrics.print = {};

      if (metrics.print.circulation) {
        preparedMetrics.print.circulation = parseInt(metrics.print.circulation);
        preparedMetrics.print.circulationType = metrics.print.circulationType;
      }

      if (metrics.print.pricePerIssue) {
        preparedMetrics.print.pricePerIssue = {
          amount: parseFloat(metrics.print.pricePerIssue),
          currency: 'EUR'
        };
      }

      if (metrics.print.subscriptionPriceMonthly || metrics.print.subscriptionPriceAnnual) {
        preparedMetrics.print.subscriptionPrice = {};
        if (metrics.print.subscriptionPriceMonthly) {
          preparedMetrics.print.subscriptionPrice.monthly = {
            amount: parseFloat(metrics.print.subscriptionPriceMonthly),
            currency: 'EUR'
          };
        }
        if (metrics.print.subscriptionPriceAnnual) {
          preparedMetrics.print.subscriptionPrice.annual = {
            amount: parseFloat(metrics.print.subscriptionPriceAnnual),
            currency: 'EUR'
          };
        }
      }

      if (metrics.print.pageCount) {
        preparedMetrics.print.pageCount = parseInt(metrics.print.pageCount);
      }
      if (metrics.print.paperFormat) {
        preparedMetrics.print.paperFormat = metrics.print.paperFormat;
      }
    }
  }

  // Online-Metriken hinzufügen, wenn Format online oder both
  if (format === 'online' || format === 'both') {
    // Prüfe ob IRGENDEIN Online-Feld ausgefüllt ist
    const hasOnlineData = metrics.online.monthlyUniqueVisitors || metrics.online.monthlyPageViews ||
      metrics.online.avgSessionDuration || metrics.online.bounceRate ||
      metrics.online.registeredUsers || metrics.online.paidSubscribers ||
      metrics.online.newsletterSubscribers || metrics.online.domainAuthority ||
      metrics.online.hasPaywall || metrics.online.hasMobileApp;

    if (hasOnlineData) {
      preparedMetrics.online = {
        hasPaywall: metrics.online.hasPaywall || false,
        hasMobileApp: metrics.online.hasMobileApp || false
      };

      if (metrics.online.monthlyUniqueVisitors) {
        preparedMetrics.online.monthlyUniqueVisitors = parseInt(metrics.online.monthlyUniqueVisitors);
      }
      if (metrics.online.monthlyPageViews) {
        preparedMetrics.online.monthlyPageViews = parseInt(metrics.online.monthlyPageViews);
      }
      if (metrics.online.avgSessionDuration) {
        preparedMetrics.online.avgSessionDuration = parseFloat(metrics.online.avgSessionDuration);
      }
      if (metrics.online.bounceRate) {
        preparedMetrics.online.bounceRate = parseFloat(metrics.online.bounceRate);
      }
      if (metrics.online.registeredUsers) {
        preparedMetrics.online.registeredUsers = parseInt(metrics.online.registeredUsers);
      }
      if (metrics.online.paidSubscribers) {
        preparedMetrics.online.paidSubscribers = parseInt(metrics.online.paidSubscribers);
      }
      if (metrics.online.newsletterSubscribers) {
        preparedMetrics.online.newsletterSubscribers = parseInt(metrics.online.newsletterSubscribers);
      }
      if (metrics.online.domainAuthority) {
        preparedMetrics.online.domainAuthority = parseInt(metrics.online.domainAuthority);
      }
    }
  }

  return preparedMetrics;
};

// Helper: Prepare identifiers for submission
export const prepareIdentifiers = (identifiers: IdentifierItem[]): any[] => {
  return identifiers.filter(id => id.value).map(id => {
    const identifier: any = {
      type: id.type,
      value: id.value
    };
    if (id.description) {
      identifier.description = id.description;
    }
    return identifier;
  });
};

// Helper: Prepare social media URLs for submission
export const prepareSocialMediaUrls = (socialMediaUrls: SocialMediaItem[]): SocialMediaItem[] => {
  return socialMediaUrls.filter(s => s.url);
};
