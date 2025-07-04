// src\app\dashboard\communication\notifications\page.tsx
"use client";

import { Heading } from "@/components/heading";
import { Button } from "@/components/button";
import { PencilIcon, RocketLaunchIcon } from "@heroicons/react/20/solid";

export default function PlaceholderPage() {
  return (
    <div className="md:flex md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <Heading>Headline</Heading>
      </div>
      <div className="mt-4 flex md:mt-0 md:ml-4">
        <Button plain>
          <PencilIcon className="size-4" />
          Bearbeiten
        </Button>
        <button
          type="button"
          className="ml-3 inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]"
        >
          <RocketLaunchIcon className="size-4" />
          Veröffentlichen
        </button>
      </div>
    </div>
  );
}