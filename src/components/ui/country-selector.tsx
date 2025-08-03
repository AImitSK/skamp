// src/components/country-selector.tsx
'use client'

import { forwardRef, useMemo, useState } from 'react'
import { Combobox, ComboboxOption, ComboboxLabel } from './combobox'
import { Checkbox } from './checkbox'
import { isValidCountryCode, getCountryNameDe } from '@/lib/validators/iso-validators'
import type { CountryCode } from '@/types/international'
import clsx from 'clsx'

// Liste der gängigsten Länder (kann erweitert werden)
const COMMON_COUNTRIES: CountryCode[] = [
  'DE', 'AT', 'CH', 'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'BE', 
  'LU', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'PT', 'GR',
  'IE', 'CA', 'AU', 'JP', 'CN', 'IN', 'BR', 'MX', 'RU', 'TR'
]

// Alle Länder für erweiterte Ansicht
const ALL_COUNTRIES: CountryCode[] = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
  'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
  'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
  'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
  'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
  'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
  'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
  'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
  'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
  'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
  'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
  'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
  'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
]

interface CountryOption {
  code: CountryCode
  name: string
}

// Props für Single Select
interface CountrySelectorSingleProps {
  value?: CountryCode | null
  onChange: (value: CountryCode | null) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  showCommonOnly?: boolean
  className?: string
  'aria-label'?: string
}

// Props für Multi Select
interface CountrySelectorMultiProps {
  value?: CountryCode[]
  onChange: (value: CountryCode[]) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  showCommonOnly?: boolean
  multiple: true
  className?: string
  'aria-label'?: string
}

// Single Select Component
export const CountrySelector = forwardRef<HTMLInputElement, CountrySelectorSingleProps>(
  function CountrySelector(
    { 
      value, 
      onChange, 
      placeholder = "Land auswählen...", 
      disabled,
      required,
      showCommonOnly = true,
      className,
      'aria-label': ariaLabel = 'Land auswählen'
    },
    ref
  ) {
    const [showAll, setShowAll] = useState(false)
    
    const countries = useMemo(() => {
      const countryList = showCommonOnly && !showAll ? COMMON_COUNTRIES : ALL_COUNTRIES
      return countryList.map(code => ({
        code,
        name: getCountryNameDe(code) || code
      }))
    }, [showCommonOnly, showAll])

    const selectedCountry = useMemo(() => 
      value ? { code: value, name: getCountryNameDe(value) || value } : null,
      [value]
    )

    return (
      <div className={className}>
        <Combobox
          value={selectedCountry}
          onChange={(country: CountryOption | null) => onChange(country?.code || null)}
          disabled={disabled}
          aria-label={ariaLabel}
          placeholder={placeholder}
          options={countries}
          displayValue={(country) => country?.name || ''}
          filter={(country, query) => {
            if (!country) return false;
            // Suche nach Name oder Code
            return country.name.toLowerCase().includes(query.toLowerCase()) ||
                   country.code.toLowerCase().includes(query.toLowerCase())
          }}
        >
          {(country) => country && (
            <ComboboxOption value={country}>
              <span className={`fi fi-${country.code.toLowerCase()} mr-2`} />
              <ComboboxLabel>{country.name}</ComboboxLabel>
              <span className="ml-auto text-xs text-zinc-500">{country.code}</span>
            </ComboboxOption>
          )}
        </Combobox>
        
        {showCommonOnly && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Alle Länder anzeigen
          </button>
        )}
      </div>
    )
  }
)

// Multi Select Component
export function CountrySelectorMulti({
  value = [],
  onChange,
  placeholder = "Länder auswählen...",
  disabled,
  required,
  showCommonOnly = true,
  className,
  'aria-label': ariaLabel = 'Länder auswählen'
}: CountrySelectorMultiProps) {
  const [showAll, setShowAll] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const countries = useMemo(() => {
    const countryList = showCommonOnly && !showAll ? COMMON_COUNTRIES : ALL_COUNTRIES
    return countryList.map(code => ({
      code,
      name: getCountryNameDe(code) || code
    }))
  }, [showCommonOnly, showAll])

  const toggleCountry = (countryCode: CountryCode) => {
    if (value.includes(countryCode)) {
      onChange(value.filter(c => c !== countryCode))
    } else {
      onChange([...value, countryCode])
    }
  }

  const selectedCountryNames = value.map(code => getCountryNameDe(code) || code).join(', ')

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
            {value.length === 0 ? placeholder : selectedCountryNames}
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
                {countries.map((country) => (
                  <label
                    key={country.code}
                    className="flex cursor-pointer items-center rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    <Checkbox
                      checked={value.includes(country.code)}
                      onChange={() => toggleCountry(country.code)}
                      className="mr-2"
                    />
                    <span className={`fi fi-${country.code.toLowerCase()} mr-2`} />
                    <span className="flex-1">{country.name}</span>
                    <span className="text-xs text-zinc-500">{country.code}</span>
                  </label>
                ))}
                
                {showCommonOnly && !showAll && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAll(true)
                    }}
                    className="mt-2 w-full rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Alle Länder anzeigen
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {value.map(code => (
            <span
              key={code}
              className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
            >
              <span className={`fi fi-${code.toLowerCase()} mr-1`} />
              {code}
              <button
                type="button"
                onClick={() => toggleCountry(code)}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}