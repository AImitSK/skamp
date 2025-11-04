// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/LoadingState.tsx
import React from 'react';

export default function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-600">Kampagne wird geladen...</p>
      </div>
    </div>
  );
}
