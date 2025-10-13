// src/app/dashboard/contacts/crm/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * CRM Root Redirect Component
 *
 * Redirects to the appropriate CRM sub-route based on URL parameters
 * or defaults to the companies page.
 *
 * Handles legacy URLs with ?tab=contacts or ?tab=companies for backward compatibility.
 *
 * @component
 */
export default function CRMRootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for legacy tab parameter
    const tab = searchParams.get('tab');

    if (tab === 'contacts') {
      router.replace('/dashboard/contacts/crm/contacts');
    } else {
      // Default to companies page
      router.replace('/dashboard/contacts/crm/companies');
    }
  }, [router, searchParams]);

  // Loading state while redirecting
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Weiterleitung...</p>
      </div>
    </div>
  );
}
