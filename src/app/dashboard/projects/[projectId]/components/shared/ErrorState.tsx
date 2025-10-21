'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

/**
 * ErrorState Props
 */
interface ErrorStateProps {
  message?: string;
}

/**
 * ErrorState Component
 *
 * Zeigt eine Error-Message mit Zurück-Button
 */
export function ErrorState({ message = 'Projekt nicht gefunden' }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-red-600 mb-4">
        <DocumentTextIcon className="h-12 w-12 mx-auto" />
      </div>
      <Heading>{message}</Heading>
      <div className="mt-6">
        <Link href="/dashboard/projects">
          <Button>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Zurück zur Projektübersicht
          </Button>
        </Link>
      </div>
    </div>
  );
}
