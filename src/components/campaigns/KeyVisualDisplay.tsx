// src/components/campaigns/KeyVisualDisplay.tsx - Wiederverwendbare Key Visual-Darstellung
"use client";

import { KeyVisualData } from "@/types/pr";
import { PhotoIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";

interface KeyVisualDisplayProps {
  keyVisual: KeyVisualData;
  isReadOnly?: boolean;
  isCustomerView?: boolean;
  showFullWidth?: boolean;
  showPlaceholder?: boolean;
  aspectRatio?: "16/9" | "4/3" | "1/1";
  className?: string;
}

export function KeyVisualDisplay({
  keyVisual,
  isReadOnly = false,
  isCustomerView = false,
  showFullWidth = false,
  showPlaceholder = true,
  aspectRatio = "16/9",
  className = ""
}: KeyVisualDisplayProps) {
  const t = useTranslations("campaigns.keyVisual");

  // Fallback wenn kein Key Visual vorhanden
  if (!keyVisual?.url) {
    if (!showPlaceholder) return null;
    
    return (
      <div className={clsx(
        "border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center",
        className
      )} style={{ aspectRatio }}>
        <div className="text-center">
          <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {isCustomerView ? t("noVisualCustomer") : t("noVisualAgency")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      "relative overflow-hidden rounded-lg",
      isCustomerView && showFullWidth ? "rounded-t-lg" : "rounded-lg",
      className
    )}>
      {/* Key Visual Image */}
      <div
        className="w-full bg-gray-100"
        style={{ aspectRatio }}
      >
        <img
          src={keyVisual.url}
          alt={t("altText")}
          className={clsx(
            "w-full h-full object-cover",
            isCustomerView ? "" : "transition-transform duration-200 hover:scale-105"
          )}
          loading="lazy"
        />
      </div>
      
      {/* Overlay für Agency-View (nur wenn nicht read-only) */}
      {!isReadOnly && !isCustomerView && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
          <div className="text-white text-sm font-medium px-3 py-1 bg-black/50 rounded">
            {t("clickToEdit")}
          </div>
        </div>
      )}
      
      {/* Customer-View Overlay (Info-Badge) */}
      {isCustomerView && (
        <div className="absolute top-4 left-4">
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">
            {t("badge")}
          </div>
        </div>
      )}
    </div>
  );
}