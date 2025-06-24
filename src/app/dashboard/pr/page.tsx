// src/app/dashboard/pr/page.tsx
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import Link from 'next/link';
import { PlusIcon } from "@heroicons/react/20/solid";

export default function PRDashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>PR-Dashboard</Heading>
          <Text className="mt-1">
            Verwalte deine Pressemitteilungen und Kampagnen.
          </Text>
        </div>
        {/* KORRIGIERT: <Button> ist jetzt innerhalb von <Link> */}
        <Link href="/dashboard/pr/campaigns/new">
          <Button>
            <PlusIcon className="size-4 mr-2" />
            Neue Kampagne
          </Button>
        </Link>
      </div>
      <div className="border rounded-lg p-12 text-center bg-white">
        <h3 className="text-lg font-medium">Willkommen im PR-Bereich</h3>
        <p className="mt-2 text-zinc-500">
          Hier werden bald deine laufenden Kampagnen und deren Statistiken angezeigt.
        </p>
      </div>
    </div>
  );
}