// src/components/mediathek/LoadingSpinner.tsx
"use client";

import { Text } from "@/components/ui/text";

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({
  message = "Lädt..."
}: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
        <Text className="mt-4">{message}</Text>
      </div>
    </div>
  );
}
