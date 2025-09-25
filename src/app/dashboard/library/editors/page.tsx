"use client";

import { Heading, Subheading } from "@/components/ui/heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import Link from "next/link";

export default function EditorsPage() {
  const [activeTab, setActiveTab] = useState<"editors" | "publications">("editors");

  // Beispiel-Daten für Redakteure
  const editors = [
    {
      id: 1,
      name: "Max Mustermann",
      email: "max@beispiel.de",
      publication: "Tech Weekly",
      role: "Chefredakteur",
      status: "aktiv"
    },
    {
      id: 2,
      name: "Anna Schmidt",
      email: "anna@beispiel.de",
      publication: "Digital Today",
      role: "Redakteur",
      status: "aktiv"
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <Heading>Redakteure</Heading>
          <Subheading>
            Verwalte Redakteure und ihre Zuordnungen zu Publikationen
          </Subheading>
        </div>
        <Button>
          <PlusIcon className="-ml-0.5 h-4 w-4" />
          Redakteur hinzufügen
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-700 mb-6">
        <nav className="-mb-px flex gap-x-6">
          <button
            onClick={() => setActiveTab("editors")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "editors"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <UserGroupIcon className="h-4 w-4" />
              Redakteure
            </span>
          </button>
          <Link
            href="/dashboard/library/publications"
            className="py-2 px-1 border-b-2 border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-medium text-sm"
          >
            Publikationen
          </Link>
        </nav>
      </div>

      {/* Content */}
      {activeTab === "editors" && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>E-Mail</TableHeader>
                <TableHeader>Publikation</TableHeader>
                <TableHeader>Rolle</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {editors.map((editor) => (
                <TableRow key={editor.id}>
                  <TableCell className="font-medium">{editor.name}</TableCell>
                  <TableCell>{editor.email}</TableCell>
                  <TableCell>{editor.publication}</TableCell>
                  <TableCell>{editor.role}</TableCell>
                  <TableCell>
                    <Badge color={editor.status === "aktiv" ? "green" : "zinc"}>
                      {editor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Bearbeiten
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}