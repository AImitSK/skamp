// src/components/projects/distribution/components/ListPagination.tsx
'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function ListPagination({
  currentPage,
  totalPages,
  onPageChange
}: ListPaginationProps) {
  if (totalPages <= 1) return null;

  // Berechne sichtbare Seiten (max 7)
  const getVisiblePages = () => {
    const pages: number[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Alle Seiten anzeigen
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 4) {
      // Am Anfang
      for (let i = 1; i <= maxVisible; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 3) {
      // Am Ende
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // In der Mitte
      for (let i = currentPage - 3; i <= currentPage + 3; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-between pt-4">
      {/* Previous Button */}
      <Button
        plain
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center text-sm"
      >
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        Zurück
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-2">
        {visiblePages.map((pageNum) => (
          <Button
            key={pageNum}
            plain
            onClick={() => onPageChange(pageNum)}
            className={`px-3 py-1 text-sm ${
              currentPage === pageNum
                ? 'font-semibold text-primary bg-primary/10 rounded'
                : 'text-gray-600'
            }`}
          >
            {pageNum}
          </Button>
        ))}
      </div>

      {/* Next Button */}
      <Button
        plain
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center text-sm"
      >
        Weiter
        <ChevronRightIcon className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
