// src/components/mediathek/Pagination.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisible?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 7
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    onPageChange(Math.max(1, currentPage - 1));
  };

  const handleNext = () => {
    onPageChange(Math.min(totalPages, currentPage + 1));
  };

  const renderPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 3);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          plain
          onClick={() => onPageChange(i)}
          className={currentPage === i ? 'font-semibold text-[#005fab]' : ''}
        >
          {i}
        </Button>
      );
    }

    return pages;
  };

  return (
    <nav className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 pt-4">
      <div className="-mt-px flex w-0 flex-1">
        <Button
          plain
          onClick={handlePrevious}
          disabled={currentPage === 1}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Zurück
        </Button>
      </div>
      <div className="hidden md:-mt-px md:flex">
        {renderPageNumbers()}
      </div>
      <div className="-mt-px flex w-0 flex-1 justify-end">
        <Button
          plain
          onClick={handleNext}
          disabled={currentPage === totalPages}
        >
          Weiter
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
