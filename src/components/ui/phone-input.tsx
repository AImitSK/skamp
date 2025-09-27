// src/components/phone-input.tsx
'use client'

import { forwardRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Input } from './input'
import { Select } from './select'
import { 
  normalizeToE164,
  formatE164Phone,
  detectCountryFromE164,
  parsePhoneNumber,
  getPhoneExamples,
  getPhoneInputConfig
} from '@/lib/validators/phone-validators'
import { getCountryNameDe } from '@/lib/validators/iso-validators'
import type { CountryCode } from '@/types/international'
import clsx from 'clsx'

// Common country calling codes for quick access
const COMMON_COUNTRIES: Array<{ code: CountryCode; callingCode: string; name: string }> = [
  { code: 'DE', callingCode: '+49', name: 'Deutschland' },
  { code: 'AT', callingCode: '+43', name: 'Österreich' },
  { code: 'CH', callingCode: '+41', name: 'Schweiz' },
  { code: 'US', callingCode: '+1', name: 'USA' },
  { code: 'GB', callingCode: '+44', name: 'UK' },
  { code: 'FR', callingCode: '+33', name: 'Frankreich' },
  { code: 'IT', callingCode: '+39', name: 'Italien' },
  { code: 'ES', callingCode: '+34', name: 'Spanien' },
  { code: 'NL', callingCode: '+31', name: 'Niederlande' },
  { code: 'BE', callingCode: '+32', name: 'Belgien' },
  { code: 'PL', callingCode: '+48', name: 'Polen' },
  { code: 'CZ', callingCode: '+420', name: 'Tschechien' },
  { code: 'SE', callingCode: '+46', name: 'Schweden' },
  { code: 'NO', callingCode: '+47', name: 'Norwegen' },
  { code: 'DK', callingCode: '+45', name: 'Dänemark' },
]

interface PhoneInputProps {
  value?: string | null // E.164 format
  onChange: (value: string | null) => void
  defaultCountry?: CountryCode
  placeholder?: string
  disabled?: boolean
  required?: boolean
  showCountrySelect?: boolean
  preferredCountries?: CountryCode[]
  formatOnBlur?: boolean
  className?: string
  inputClassName?: string
  'aria-label'?: string
  'aria-describedby'?: string
  error?: boolean
  helperText?: string
  onValidationError?: (error: string | null) => void
  keepInvalidInput?: boolean
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput(
    {
      value,
      onChange,
      defaultCountry = 'DE',
      placeholder,
      disabled,
      required,
      showCountrySelect = true,
      preferredCountries,
      formatOnBlur = true,
      className,
      inputClassName,
      'aria-label': ariaLabel = 'Telefonnummer',
      'aria-describedby': ariaDescribedBy,
      error,
      helperText,
      onValidationError,
      keepInvalidInput = false
    },
    ref
  ) {
    const [inputValue, setInputValue] = useState('')
    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry)
    const [isFocused, setIsFocused] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)

    // Get countries list
    const countries = useMemo(() => {
      if (preferredCountries && preferredCountries.length > 0) {
        return COMMON_COUNTRIES.filter(c => preferredCountries.includes(c.code))
      }
      return COMMON_COUNTRIES
    }, [preferredCountries])

    // Get phone config for selected country
    const phoneConfig = useMemo(() => {
      return getPhoneInputConfig(selectedCountry) || {
        countryCode: selectedCountry,
        label: 'Telefonnummer',
        placeholder: '+49 ...',
        maxLength: 20,
        example: '',
        format: '',
        help: 'Internationale Telefonnummer'
      }
    }, [selectedCountry])

    // Get example for placeholder
    const exampleNumber = useMemo(() => {
      const examples = getPhoneExamples(selectedCountry)
      return examples?.formatted.national || phoneConfig.placeholder
    }, [selectedCountry, phoneConfig.placeholder])

    // Update input value when value prop changes
    useEffect(() => {
      if (!isFocused && value) {
        const parsed = parsePhoneNumber(value)
        if (parsed.isValid && parsed.e164) {
          // Detect country from number
          const detectedCountry = detectCountryFromE164(parsed.e164)
          if (detectedCountry && detectedCountry !== selectedCountry) {
            setSelectedCountry(detectedCountry as CountryCode)
          }
          
          // Format for display
          const formatted = formatE164Phone(parsed.e164, 'national')
          setInputValue(formatted)
        }
      } else if (!value) {
        setInputValue('')
      }
    }, [value, isFocused, selectedCountry])

    // Handle input change - nur Buchstaben filtern, Leerzeichen entfernen
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value

      // Entferne Buchstaben, behalte nur Ziffern, +, -, (), Leerzeichen
      input = input.replace(/[a-zA-Z]/g, '')

      // Entferne automatisch Leerzeichen
      const cleanedInput = input.replace(/\s/g, '')

      setInputValue(cleanedInput)

      // Keine Validierung - einfach speichern was da ist
      onChange(cleanedInput || null)
      setValidationError(null)
      onValidationError?.(null)
    }

    // Handle country change
    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCountry = e.target.value as CountryCode
      setSelectedCountry(newCountry)

      // Keine Validierung bei Länder-Wechsel - Eingabe bleibt unverändert
      setValidationError(null)
      onValidationError?.(null)
    }

    // Handle focus
    const handleFocus = () => {
      setIsFocused(true)
    }

    // Handle blur - keine Validierung, keine Änderung der Eingabe
    const handleBlur = () => {
      setIsFocused(false)
      // Gar nichts machen - Eingabe bleibt wie sie ist
    }

    // Get current country info
    const currentCountry = countries.find(c => c.code === selectedCountry) || countries[0]

    return (
      <div className={className || 'w-full'}>
        <div className="flex gap-2">
          {showCountrySelect && (
            <Select
              value={selectedCountry}
              onChange={handleCountryChange}
              disabled={disabled}
              className="w-24 shrink-0"
              aria-label="Land"
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.callingCode} {country.code}
                </option>
              ))}
            </Select>
          )}

          <div className="flex-1">
            <Input
              ref={ref}
              type="tel"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder || exampleNumber}
              disabled={disabled}
              required={required}
              className={clsx(
                'w-full',
                inputClassName,
                (error || validationError) && 'border-red-500 focus:ring-red-500'
              )}
              aria-label={ariaLabel}
              aria-describedby={ariaDescribedBy}
              aria-invalid={error || !!validationError}
            />
          </div>
        </div>

        {(helperText || error || validationError) && (
          <p
            className={clsx(
              'mt-1 text-sm',
              (error || validationError) ? 'text-red-600 dark:text-red-400' : 'text-zinc-600 dark:text-zinc-400'
            )}
            id={ariaDescribedBy}
          >
            {validationError || helperText || (error && 'Ungültige Telefonnummer')}
          </p>
        )}
      </div>
    )
  }
)

// Simple phone display component
interface PhoneDisplayProps {
  value: string | null
  format?: 'international' | 'national' | 'e164'
  className?: string
  showCountry?: boolean
}

export function PhoneDisplay({ 
  value, 
  format = 'international',
  className,
  showCountry = false
}: PhoneDisplayProps) {
  if (!value) return null

  const parsed = parsePhoneNumber(value)
  if (!parsed.isValid || !parsed.e164) return <span className={className}>{value}</span>

  const formatted = format === 'e164' 
    ? parsed.e164 
    : formatE164Phone(parsed.e164, format)

  return (
    <span className={className}>
      {formatted}
      {showCountry && parsed.countryCode && (
        <span className="ml-2 text-zinc-500 dark:text-zinc-400">
          ({getCountryNameDe(parsed.countryCode)})
        </span>
      )}
    </span>
  )
}

// Phone link component for clickable phone numbers
interface PhoneLinkProps {
  value: string | null
  className?: string
  children?: React.ReactNode
}

export function PhoneLink({ value, className, children }: PhoneLinkProps) {
  if (!value) return null

  const parsed = parsePhoneNumber(value)
  if (!parsed.isValid || !parsed.e164) return null

  const formatted = formatE164Phone(parsed.e164, 'international')
  const href = `tel:${parsed.e164}`

  return (
    <a
      href={href}
      className={clsx(
        'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
        className
      )}
    >
      {children || formatted}
    </a>
  )
}

// Validation helper hook
export function usePhoneValidation(defaultCountry: CountryCode = 'DE') {
  const [value, setValue] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback((phone: string | null) => {
    if (!phone) {
      setError(null)
      return true
    }

    const parsed = parsePhoneNumber(phone, defaultCountry)
    if (!parsed.isValid) {
      setError('Ungültige Telefonnummer')
      return false
    }

    setError(null)
    return true
  }, [defaultCountry])

  const handleChange = useCallback((phone: string | null) => {
    setValue(phone)
    validate(phone)
  }, [validate])

  return {
    value,
    error,
    isValid: !error,
    setValue: handleChange,
    validate,
    reset: () => {
      setValue(null)
      setError(null)
    }
  }
}

// Multiple phone numbers component
interface MultiPhoneInputProps {
  value: string[]
  onChange: (value: string[]) => void
  defaultCountry?: CountryCode
  maxNumbers?: number
  className?: string
}

export function MultiPhoneInput({
  value = [],
  onChange,
  defaultCountry = 'DE',
  maxNumbers = 5,
  className
}: MultiPhoneInputProps) {
  const [currentInput, setCurrentInput] = useState<string | null>(null)

  const handleAdd = () => {
    if (currentInput && value.length < maxNumbers) {
      onChange([...value, currentInput])
      setCurrentInput(null)
    }
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {value.map((phone, index) => (
          <div key={index} className="flex items-center gap-2">
            <PhoneDisplay value={phone} className="flex-1" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {value.length < maxNumbers && (
        <div className="mt-3 flex gap-2">
          <PhoneInput
            value={currentInput}
            onChange={setCurrentInput}
            defaultCountry={defaultCountry}
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!currentInput}
            className={clsx(
              'px-3 py-2 rounded-lg font-medium',
              'bg-blue-600 text-white hover:bg-blue-700',
              'disabled:bg-zinc-300 disabled:cursor-not-allowed',
              'dark:bg-blue-500 dark:hover:bg-blue-600',
              'dark:disabled:bg-zinc-700'
            )}
          >
            Hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}