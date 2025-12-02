// src/components/language-selector.tsx
'use client'

import { forwardRef, useMemo, useState } from 'react'
import { Combobox, ComboboxOption, ComboboxLabel } from './combobox'
import { Checkbox } from './checkbox'
import { isValidLanguageCode, getLanguageInfo } from '@/lib/validators/iso-validators'
import type { LanguageCode } from '@/types/international'
import clsx from 'clsx'

// Gängige Sprachen für Business-Kontext
const COMMON_LANGUAGES: LanguageCode[] = [
  'de', 'en', 'fr', 'it', 'es', 'pt', 'nl', 'pl', 'cs', 'hu',
  'ro', 'bg', 'hr', 'sk', 'sl', 'da', 'sv', 'no', 'fi', 'et',
  'lv', 'lt', 'el', 'ru', 'uk', 'tr', 'ar', 'he', 'zh', 'ja',
  'ko', 'hi', 'th'
]

interface LanguageOption {
  code: LanguageCode
  name: string
  nativeName: string
  displayName: string
}

// Props für Single Select
interface LanguageSelectorSingleProps {
  value?: LanguageCode | null
  onChange: (value: LanguageCode | null) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  showNative?: boolean
  className?: string
  'aria-label'?: string
}

// Props für Multi Select
interface LanguageSelectorMultiProps {
  value?: LanguageCode[]
  onChange: (value: LanguageCode[]) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  showNative?: boolean
  multiple: true
  className?: string
  'aria-label'?: string
}

// Single Select Component
export const LanguageSelector = forwardRef<HTMLInputElement, LanguageSelectorSingleProps>(
  function LanguageSelector(
    { 
      value, 
      onChange, 
      placeholder = "Sprache auswählen...", 
      disabled,
      required,
      showNative = true,
      className,
      'aria-label': ariaLabel = 'Sprache auswählen'
    },
    ref
  ) {
    const languages = useMemo(() => {
      return COMMON_LANGUAGES.map(code => {
        const info = getLanguageInfo(code)
        if (!info) return null
        return {
          code: info.code as LanguageCode,
          name: info.name,
          nativeName: info.nativeName,
          displayName: showNative ? `${info.name} (${info.nativeName})` : info.name
        }
      }).filter((lang): lang is LanguageOption => lang !== null)
    }, [showNative])

    const selectedLanguage = useMemo(() => {
      if (!value) return null
      const info = getLanguageInfo(value)
      if (!info) return null
      return {
        code: info.code as LanguageCode,
        name: info.name,
        nativeName: info.nativeName,
        displayName: showNative ? `${info.name} (${info.nativeName})` : info.name
      }
    }, [value, showNative])

    return (
      <div className={className}>
        <Combobox
          value={selectedLanguage ?? undefined}
          onChange={(language: LanguageOption | null) => onChange(language?.code ?? null)}
          disabled={disabled}
          aria-label={ariaLabel}
          placeholder={placeholder}
          options={languages}
          displayValue={(language) => language?.displayName || ''}
          filter={(language, query) => {
            if (!language) return false
            // Suche nach Name, nativem Namen oder Code
            return language.name.toLowerCase().includes(query.toLowerCase()) ||
                   language.nativeName.toLowerCase().includes(query.toLowerCase()) ||
                   language.code.toLowerCase().includes(query.toLowerCase())
          }}
        >
          {(language) => language && (
            <ComboboxOption value={language}>
              <ComboboxLabel>
                <span className="font-medium">{language.name}</span>
                {showNative && (
                  <span className="ml-2 text-zinc-500">{language.nativeName}</span>
                )}
              </ComboboxLabel>
              <span className="ml-auto text-xs text-zinc-500">{language.code}</span>
            </ComboboxOption>
          )}
        </Combobox>
      </div>
    )
  }
)

// Multi Select Component
export function LanguageSelectorMulti({
  value = [],
  onChange,
  placeholder = "Sprachen auswählen...",
  disabled,
  required,
  showNative = true,
  className,
  'aria-label': ariaLabel = 'Sprachen auswählen'
}: LanguageSelectorMultiProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const languages = useMemo(() => {
    return COMMON_LANGUAGES.map(code => {
      const info = getLanguageInfo(code)
      if (!info) return null
      return {
        code: info.code as LanguageCode,
        name: info.name,
        nativeName: info.nativeName,
        displayName: showNative ? `${info.name} (${info.nativeName})` : info.name
      }
    }).filter((lang): lang is LanguageOption => lang !== null)
  }, [showNative])

  const toggleLanguage = (languageCode: LanguageCode) => {
    if (value.includes(languageCode)) {
      onChange(value.filter(c => c !== languageCode))
    } else {
      onChange([...value, languageCode])
    }
  }

  const selectedLanguageNames = value.map(code => {
    const info = getLanguageInfo(code)
    return info ? info.name : code
  }).join(', ')

  return (
    <div className={className}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={clsx(
            'relative block w-full appearance-none rounded-lg border px-3 py-2 text-left',
            'text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white',
            'border-zinc-950/10 hover:border-zinc-950/20 dark:border-white/10 dark:hover:border-white/20',
            'bg-white/95 dark:bg-white/5',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'pr-8'
          )}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={value.length === 0 ? 'text-zinc-500' : ''}>
            {value.length === 0 ? placeholder : selectedLanguageNames}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </span>
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-zinc-800">
              <div className="p-2">
                {languages.map((language) => (
                  <label
                    key={language.code}
                    className="flex cursor-pointer items-center rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    <Checkbox
                      checked={value.includes(language.code)}
                      onChange={() => toggleLanguage(language.code)}
                      className="mr-2"
                    />
                    <span className="flex-1">
                      <span className="font-medium">{language.name}</span>
                      {showNative && (
                        <span className="ml-2 text-sm text-zinc-500">{language.nativeName}</span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-500">{language.code}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {value.map(code => {
            const info = getLanguageInfo(code)
            return (
              <span
                key={code}
                className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              >
                {info ? info.name : code} ({code})
                <button
                  type="button"
                  onClick={() => toggleLanguage(code)}
                  className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Helper component for RTL language warning
export function LanguageRTLWarning({ languageCode }: { languageCode: LanguageCode | null }) {
  if (!languageCode) return null
  
  const info = getLanguageInfo(languageCode)
  if (!info || !info.rtl) return null
  
  return (
    <div className="mt-2 rounded-md bg-amber-50 p-3 dark:bg-amber-900/20">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{info.name}</strong> ist eine RTL-Sprache (von rechts nach links).
            Stellen Sie sicher, dass Ihre Inhalte korrekt formatiert sind.
          </p>
        </div>
      </div>
    </div>
  )
}