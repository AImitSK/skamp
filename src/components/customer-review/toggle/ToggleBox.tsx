'use client';

import React, { useState, useCallback, memo } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { ToggleBoxProps } from '@/types/customer-review';

/**
 * Basis-Toggle-Box-Komponente für Customer-Review-System
 * Implementiert CeleroPress Design System v2.0 ohne Shadow-Effekte
 * OPTIMIERT: Mit React.memo für bessere Performance
 */
function ToggleBoxComponent({
  id,
  title,
  subtitle,
  count,
  children,
  defaultOpen = false,
  icon,
  iconColor = 'text-gray-500',
  disabled = false,
  className = '',
  isExpanded,
  onToggle,
}: ToggleBoxProps) {
  const [isOpen, setIsOpen] = useState(isExpanded ?? defaultOpen);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(id);
  }, [isOpen, disabled, onToggle, id]);

  const ChevronIcon = isOpen ? ChevronUpIcon : ChevronDownIcon;

  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}
      data-testid={`toggle-box-${id}`}
    >
      {/* Toggle Header */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full px-6 py-4 text-left transition-colors duration-150
          ${disabled 
            ? 'cursor-not-allowed bg-gray-50' 
            : 'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
          }
        `}
        aria-expanded={isOpen}
        aria-controls={`toggle-content-${id}`}
        data-testid={`toggle-header-${id}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Icon */}
            {icon && React.createElement(icon, {
              className: `h-6 w-6 flex-shrink-0 ${iconColor}`,
              'aria-hidden': true
            })}
            
            {/* Titel und Untertitel */}
            <div className="flex-grow min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {title}
                </h3>
                
                {/* Anzahl-Badge */}
                {count !== undefined && count > 0 && (
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    data-testid={`toggle-count-${id}`}
                  >
                    {count}
                  </span>
                )}
              </div>
              
              {/* Untertitel */}
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Chevron Icon */}
          <ChevronIcon 
            className={`h-5 w-5 text-gray-400 transition-transform duration-150 ${
              disabled ? 'opacity-50' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Toggle Content */}
      {isOpen && (
        <div 
          id={`toggle-content-${id}`}
          className="border-t border-gray-200 px-6 py-4 bg-gray-50"
          data-testid={`toggle-content-${id}`}
          role="region"
          aria-labelledby={`toggle-header-${id}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// PERFORMANCE: Memoized Export mit Custom Equality Check
export const ToggleBox = memo(ToggleBoxComponent, (prevProps, nextProps) => {
  // Custom comparison für optimale Performance
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.count === nextProps.count
  );
});

export default ToggleBox;