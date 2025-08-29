'use client';

/**
 * Animation-Utilities für das Toggle-System
 * Unterstützt CSS-Animationen für Toggle-Übergänge
 */

export const toggleAnimations = {
  /**
   * Standard-Animationsdauern
   */
  durations: {
    fast: 150,
    normal: 200,
    slow: 300,
  },

  /**
   * CSS-Klassen für Animationen
   */
  classes: {
    expand: 'transition-all duration-200 ease-out',
    collapse: 'transition-all duration-150 ease-in',
    fadeIn: 'transition-opacity duration-200 ease-out opacity-0',
    fadeOut: 'transition-opacity duration-150 ease-in opacity-100',
    slideDown: 'transition-transform duration-200 ease-out transform -translate-y-2',
    slideUp: 'transition-transform duration-150 ease-in transform translate-y-0',
  },

  /**
   * Erstellt CSS-Animation-Styles für Toggle-Boxen
   */
  createToggleStyle: (isExpanded: boolean, duration: number = 200): React.CSSProperties => {
    return {
      transition: `all ${duration}ms ease-in-out`,
      opacity: isExpanded ? 1 : 0,
      maxHeight: isExpanded ? '1000px' : '0px',
      overflow: 'hidden',
    };
  },

  /**
   * Erstellt CSS-Animation für Höhenänderungen
   */
  createHeightAnimation: (isExpanded: boolean): React.CSSProperties => {
    return {
      transition: 'max-height 200ms ease-in-out',
      maxHeight: isExpanded ? '1000px' : '0px',
      overflow: 'hidden',
    };
  },

  /**
   * Erstellt CSS-Animation für Opazität
   */
  createFadeAnimation: (isVisible: boolean, duration: number = 200): React.CSSProperties => {
    return {
      transition: `opacity ${duration}ms ease-in-out`,
      opacity: isVisible ? 1 : 0,
    };
  },

  /**
   * Erstellt CSS-Animation für Transform-Effekte
   */
  createTransformAnimation: (isExpanded: boolean): React.CSSProperties => {
    return {
      transition: 'transform 200ms ease-in-out',
      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
    };
  },

  /**
   * Wartet auf das Ende einer Animation
   */
  waitForAnimation: (duration: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  /**
   * Prüft ob CSS-Animationen unterstützt werden
   */
  supportsAnimations: (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const testEl = document.createElement('div');
    const prefixes = ['transition', 'WebkitTransition', 'MozTransition', 'OTransition'];
    
    for (const prefix of prefixes) {
      if (prefix in testEl.style) {
        return true;
      }
    }
    
    return false;
  },

  /**
   * Erstellt eine Spring-Animation für Toggle-Boxen
   */
  createSpringAnimation: (isExpanded: boolean): React.CSSProperties => {
    return {
      transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: isExpanded ? 'scale(1)' : 'scale(0.95)',
      opacity: isExpanded ? 1 : 0,
    };
  },

  /**
   * Erstellt eine Bounce-Animation
   */
  createBounceAnimation: (trigger: boolean): React.CSSProperties => {
    return {
      animation: trigger ? 'bounce 0.5s ease-in-out' : 'none',
    };
  },

  /**
   * Erstellt CSS-Keyframes für benutzerdefinierte Animationen
   */
  injectKeyframes: (): void => {
    if (typeof window === 'undefined') return;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideUp {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-10px);
        }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0, 0, 0);
        }
        40%, 43% {
          transform: translate3d(0, -6px, 0);
        }
        70% {
          transform: translate3d(0, -3px, 0);
        }
        90% {
          transform: translate3d(0, -1px, 0);
        }
      }
      
      .toggle-slide-down {
        animation: slideDown 200ms ease-out;
      }
      
      .toggle-slide-up {
        animation: slideUp 150ms ease-in;
      }
      
      .toggle-bounce {
        animation: bounce 0.5s ease-in-out;
      }
    `;
    
    document.head.appendChild(style);
  }
};

// Keyframes bei Import injizieren
if (typeof window !== 'undefined') {
  toggleAnimations.injectKeyframes();
}

export default toggleAnimations;