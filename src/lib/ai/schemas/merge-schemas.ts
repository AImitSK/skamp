// src/lib/ai/schemas/merge-schemas.ts
// Zod Schemas für KI-Daten-Merge

import { z } from 'zod';

/**
 * Email Schema
 */
export const EmailSchema = z.object({
  email: z.string().email(),
  type: z.enum(['business', 'private', 'other']),
  isPrimary: z.boolean().nullish(),
  isVerified: z.boolean().nullish()
});

/**
 * Phone Schema
 */
export const PhoneSchema = z.object({
  number: z.string(),
  type: z.enum(['business', 'mobile', 'private', 'other']),
  isPrimary: z.boolean().nullish()
});

/**
 * Social Profile Schema
 */
export const SocialProfileSchema = z.object({
  platform: z.string(),
  url: z.string().url(),
  handle: z.string().nullish()
});

/**
 * Name Schema
 */
export const NameSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  title: z.string().nullish(), // Erlaubt null + undefined
  suffix: z.string().nullish() // Erlaubt null + undefined
});

/**
 * Merged Contact Data Schema
 *
 * Output-Schema für den KI-Merge von Varianten
 */
export const MergedContactSchema = z.object({
  // Basis-Identifikation
  name: NameSchema,
  displayName: z.string(),

  // Kontakt-Informationen (dedupliziert)
  emails: z.array(EmailSchema).min(1, 'Mindestens eine E-Mail erforderlich'),
  phones: z.array(PhoneSchema).nullish(),

  // Geschäftliche Zuordnung
  position: z.string().nullish(),
  department: z.string().nullish(),
  companyName: z.string().nullish(),
  companyId: z.string().nullish(),

  // Media-Profil
  hasMediaProfile: z.boolean(),
  beats: z.array(z.string()).nullish(),
  mediaTypes: z.array(z.enum(['print', 'online', 'tv', 'radio', 'podcast'])).nullish(),
  publications: z.array(z.string()).nullish(),

  // Social Media
  socialProfiles: z.array(SocialProfileSchema).nullish(),

  // Qualitäts-Indikatoren
  photoUrl: z.string().url().nullish(),
  website: z.string().url().nullish()
});

/**
 * Varianten Input Schema (vereinfacht)
 */
export const VariantSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  contactId: z.string(),
  contactData: z.object({
    name: NameSchema,
    displayName: z.string(),
    emails: z.array(EmailSchema),
    phones: z.array(PhoneSchema).nullish(),
    position: z.string().nullish(),
    department: z.string().nullish(),
    companyName: z.string().nullish(),
    companyId: z.string().nullish(),
    hasMediaProfile: z.boolean(),
    beats: z.array(z.string()).nullish(),
    mediaTypes: z.array(z.enum(['print', 'online', 'tv', 'radio', 'podcast'])).nullish(),
    publications: z.array(z.string()).nullish(),
    socialProfiles: z.array(SocialProfileSchema).nullish(),
    photoUrl: z.string().nullish(),
    website: z.string().nullish()
  })
});

/**
 * Input Schema für mergeVariants Flow
 */
export const MergeVariantsInputSchema = z.object({
  variants: z.array(VariantSchema).min(1, 'Mindestens eine Variante erforderlich')
});

// Type Exports für TypeScript
export type MergedContact = z.infer<typeof MergedContactSchema>;
export type Variant = z.infer<typeof VariantSchema>;
export type MergeVariantsInput = z.infer<typeof MergeVariantsInputSchema>;
