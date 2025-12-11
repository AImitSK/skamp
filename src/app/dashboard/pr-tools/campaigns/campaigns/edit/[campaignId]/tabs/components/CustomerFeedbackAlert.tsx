// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/CustomerFeedbackAlert.tsx
"use client";

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface Feedback {
  author: string;
  comment: string;
  requestedAt?: {
    toDate: () => Date;
  };
}

interface CustomerFeedbackAlertProps {
  feedback: Feedback[];
}

export function CustomerFeedbackAlert({ feedback }: CustomerFeedbackAlertProps) {
  const t = useTranslations('campaigns.edit.feedback');

  if (!feedback || feedback.length === 0) {
    return null;
  }

  const lastCustomerFeedback = [...feedback]
    .reverse()
    .find(f => f.author === 'Kunde');

  if (!lastCustomerFeedback) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">
            {t('alert.title')}
          </h4>
          <p className="text-sm text-yellow-800">
            {lastCustomerFeedback.comment}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            {lastCustomerFeedback.requestedAt?.toDate ?
              new Date(lastCustomerFeedback.requestedAt.toDate()).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) :
              ''
            }
          </p>
        </div>
      </div>
    </div>
  );
}
