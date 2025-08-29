'use client';

import React from 'react';
import { CustomerReviewToggleContext } from '@/types/customer-review';

/**
 * Container-Komponente für das Customer-Review-Toggle-System
 * Stellt den Context für alle Toggle-Komponenten bereit
 */

interface CustomerReviewToggleContainerProps {
  context: CustomerReviewToggleContext;
  children: React.ReactNode;
  className?: string;
}

export function CustomerReviewToggleContainer({
  context,
  children,
  className = '',
}: CustomerReviewToggleContainerProps) {
  return (
    <div 
      className={`customer-review-toggle-container space-y-4 ${className}`}
      data-testid="customer-review-toggle-container"
      data-campaign-id={context.campaignId}
      data-customer-id={context.customerId}
      data-organization-id={context.organizationId}
    >
      {children}
    </div>
  );
}

export default CustomerReviewToggleContainer;