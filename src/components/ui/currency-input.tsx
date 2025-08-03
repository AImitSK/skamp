// src/components/currency-input.tsx
'use client'

import { forwardRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Input } from './input'
import { Select } from './select'
import { 
  isValidCurrencyCode, 
  getCurrencyInfo, 
  formatAmount,
  toSmallestUnit,
  fromSmallestUnit,
  getAvailableCurrencies 
} from '@/lib/validators/iso-validators'
import type { CurrencyCode } from '@/types/international'
import clsx from 'clsx'

interface CurrencyInputProps {
  value?: number | null // Value in main units (e.g., EUR not cents)
  onChange: (value: number | null) => void
  currency: CurrencyCode
  onCurrencyChange?: (currency: CurrencyCode) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  min?: number
  max?: number
  allowNegative?: boolean
  showCurrencySelect?: boolean
  currencyPosition?: 'left' | 'right'
  className?: string
  inputClassName?: string
  'aria-label'?: string
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      value,
      onChange,
      currency,
      onCurrencyChange,
      placeholder,
      disabled,
      required,
      min,
      max,
      allowNegative = false,
      showCurrencySelect = false,
      currencyPosition = 'left',
      className,
      inputClassName,
      'aria-label': ariaLabel = 'Betrag'
    },
    ref
  ) {
    const [inputValue, setInputValue] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    
    // Get currency info
    const currencyInfo = useMemo(() => {
      return getCurrencyInfo(currency) || {
        code: currency,
        name: currency,
        symbol: currency,
        decimals: 2,
        countries: []
      }
    }, [currency])

    // Available currencies for select
    const availableCurrencies = useMemo(() => getAvailableCurrencies(), [])

    // Format value for display
    useEffect(() => {
      if (!isFocused) {
        if (value === null || value === undefined) {
          setInputValue('')
        } else {
          // Format with thousands separator when not focused
          const formatted = formatAmount(value, currency, 'de-DE')
          setInputValue(formatted)
        }
      }
    }, [value, currency, isFocused])

    // Parse user input to number
    const parseInput = useCallback((input: string): number | null => {
      if (!input || input.trim() === '') return null
      
      // Remove thousands separators and normalize decimal separator
      const normalized = input
        .replace(/\./g, '') // Remove thousand separators
        .replace(',', '.') // Convert comma to dot for parsing
        .replace(/[^\d\-\.]/g, '') // Remove non-numeric chars except minus and dot
      
      const parsed = parseFloat(normalized)
      
      if (isNaN(parsed)) return null
      
      // Apply constraints
      if (!allowNegative && parsed < 0) return 0
      if (min !== undefined && parsed < min) return min
      if (max !== undefined && parsed > max) return max
      
      // Round to currency decimals
      const factor = Math.pow(10, currencyInfo.decimals)
      return Math.round(parsed * factor) / factor
    }, [allowNegative, min, max, currencyInfo.decimals])

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value
      
      // Allow empty input
      if (input === '') {
        setInputValue('')
        onChange(null)
        return
      }
      
      // Basic validation: allow numbers, comma, dot, and optionally minus
      const regex = allowNegative 
        ? /^-?\d*[,.]?\d*$/ 
        : /^\d*[,.]?\d*$/
      
      if (regex.test(input)) {
        setInputValue(input)
        
        // Parse and update value
        const parsed = parseInput(input)
        if (parsed !== null) {
          onChange(parsed)
        }
      }
    }

    // Handle focus
    const handleFocus = () => {
      setIsFocused(true)
      
      // Show raw number when focused
      if (value !== null && value !== undefined) {
        // Use dot as decimal separator for editing
        const raw = value.toString().replace('.', ',')
        setInputValue(raw)
      }
    }

    // Handle blur
    const handleBlur = () => {
      setIsFocused(false)
      
      // Reformat on blur
      const parsed = parseInput(inputValue)
      onChange(parsed)
    }

    // Handle currency change
    const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCurrency = e.target.value as CurrencyCode
      if (isValidCurrencyCode(newCurrency) && onCurrencyChange) {
        onCurrencyChange(newCurrency)
      }
    }

    // Currency symbol component
    const CurrencySymbol = () => (
      <span className="text-zinc-500 dark:text-zinc-400 select-none">
        {currencyInfo.symbol}
      </span>
    )

    // Currency select component
    const CurrencySelect = () => (
      <Select
        value={currency}
        onChange={handleCurrencyChange}
        disabled={disabled || !onCurrencyChange}
        className="w-24"
        aria-label="Währung"
      >
        {availableCurrencies.map(curr => (
          <option key={curr.code} value={curr.code}>
            {curr.code}
          </option>
        ))}
      </Select>
    )

    return (
      <div className={clsx('flex items-center mt-4', showCurrencySelect ? 'gap-2' : '', className)}>
        {showCurrencySelect && currencyPosition === 'left' && <CurrencySelect />}
        {!showCurrencySelect && currencyPosition === 'left' && <CurrencySymbol />}
        
        <div className="relative flex-1">
          <Input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder || `0${currencyInfo.decimals > 0 ? ',00' : ''}`}
            disabled={disabled}
            required={required}
            className={clsx(
              inputClassName,
              currencyPosition === 'right' && !showCurrencySelect && 'pr-12'
            )}
            aria-label={ariaLabel}
          />
          
          {!showCurrencySelect && currencyPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <CurrencySymbol />
            </div>
          )}
        </div>
        
        {showCurrencySelect && currencyPosition === 'right' && <CurrencySelect />}
      </div>
    )
  }
)

// Compact version without currency selector
export const CurrencyDisplay = forwardRef<HTMLInputElement, Omit<CurrencyInputProps, 'showCurrencySelect' | 'onCurrencyChange'>>(
  function CurrencyDisplay(props, ref) {
    return <CurrencyInput {...props} ref={ref} showCurrencySelect={false} />
  }
)

// Helper component for currency conversion display
interface CurrencyConversionProps {
  amount: number
  fromCurrency: CurrencyCode
  toCurrency: CurrencyCode
  rate: number
  className?: string
}

export function CurrencyConversion({ 
  amount, 
  fromCurrency, 
  toCurrency, 
  rate, 
  className 
}: CurrencyConversionProps) {
  const convertedAmount = amount * rate
  
  return (
    <div className={clsx('text-sm text-zinc-600 dark:text-zinc-400', className)}>
      {formatAmount(amount, fromCurrency, 'de-DE')} {fromCurrency} = {formatAmount(convertedAmount, toCurrency, 'de-DE')} {toCurrency}
      <span className="text-xs ml-1">(1 {fromCurrency} = {rate} {toCurrency})</span>
    </div>
  )
}

// Helper hook for managing currency amounts
export function useCurrencyAmount(initialValue?: number, initialCurrency: CurrencyCode = 'EUR') {
  const [amount, setAmount] = useState<number | null>(initialValue ?? null)
  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency)
  
  const formatted = useMemo(() => {
    if (amount === null) return ''
    return formatAmount(amount, currency, 'de-DE')
  }, [amount, currency])
  
  const formattedWithSymbol = useMemo(() => {
    if (amount === null) return ''
    const info = getCurrencyInfo(currency)
    if (!info) return formatted
    return `${info.symbol} ${formatted}`
  }, [amount, currency, formatted])
  
  const inSmallestUnit = useMemo(() => {
    if (amount === null) return 0
    return toSmallestUnit(amount, currency)
  }, [amount, currency])
  
  return {
    amount,
    setAmount,
    currency,
    setCurrency,
    formatted,
    formattedWithSymbol,
    inSmallestUnit,
    reset: () => {
      setAmount(null)
      setCurrency(initialCurrency)
    }
  }
}