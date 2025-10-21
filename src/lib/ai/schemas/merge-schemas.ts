// src/lib/ai/schemas/merge-schemas.ts
// Zod Schemas für KI-Daten-Merge

import { z } from 'zod';

/**
 * Email Schema
 */
export const EmailSchema = z.object({
  email: z.string().email(),
  type: z.enum(['business', 'private', 'other']),
  isPrimary: z.boolean().optional(),
  isVerified: z.boolean().optional()
});

/**
 * Phone Schema
 */
export const PhoneSchema = z.object({
  number: z.string(),
  type: z.enum(['business', 'mobile', 'private', 'other']),
  isPrimary: z.boolean().optional()
});

/**
 * Social Profile Schema
 */
export const SocialProfileSchema = z.object({
  platform: z.string(),
  url: z.string().url(),
  handle: z.string().optional()
});

/**
 * Name Schema
 */
export const NameSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  title: z.string().optional(),
  suffix: z.string().optional()
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
  phones: z.array(PhoneSchema).optional(),

  // Geschäftliche Zuordnung
  position: z.string().optional(),
  department: z.string().optional(),
  companyName: z.string().optional(),
  companyId: z.string().optional(),

  // Media-Profil
  hasMediaProfile: z.boolean(),
  beats: z.array(z.string()).optional(),
  mediaTypes: z.array(z.enum(['print', 'online', 'tv', 'radio', 'podcast'])).optional(),
  publications: z.array(z.string()).optional(),

  // Social Media
  socialProfiles: z.array(SocialProfileSchema).optional(),

  // Qualitäts-Indikatoren
  photoUrl: z.string().url().optional(),
  website: z.string().url().optional()
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
    phones: z.array(PhoneSchema).optional(),
    position: z.string().optional(),
    department: z.string().optional(),
    companyName: z.string().optional(),
    companyId: z.string().optional(),
    hasMediaProfile: z.boolean(),
    beats: z.array(z.string()).optional(),
    mediaTypes: z.array(z.enum(['print', 'online', 'tv', 'radio', 'podcast'])).optional(),
    publications: z.array(z.string()).optional(),
    socialProfiles: z.array(SocialProfileSchema).optional(),
    photoUrl: z.string().optional(),
    website: z.string().optional()
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
