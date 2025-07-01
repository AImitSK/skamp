// src/app/dashboard/freigaben/page.tsx

'use client'; // Wichtig für 'useState'

import { useState } from 'react';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { CheckBadgeIcon } from "@heroicons/react/24/outline";
import { FunnelIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import clsx from 'clsx';

// Die Filter-Tabs für die Freigaben-Ansicht
const approvalTabs = [
    { id: "all", label: "Alle" },
    { id: "in_review", label: "In Prüfung" },
    { id: "changes_requested", label: "Änderung erbeten" },
    { id: "approved", label: "Freigegeben" },
];

export default function ApprovalsPage() {
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div>
            {/* Header: Angepasst an deinen Stil aus der Kontakte-Seite */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Heading>Freigaben-Center</Heading>
                    <Text className="mt-1">
                        Verwalten und überwachen Sie hier alle Pressemitteilungen, die eine Kundenfreigabe benötigen.
                    </Text>
                </div>
                {/* Hier könnten später Aktionen wie "Neue Freigabe anfordern" hin */}
            </div>

            {/* Filter-Box: Angepasst an deinen Stil */}
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-6 space-y-4">
                {/* Tabs */}
                <div className="flex gap-4">
                    {approvalTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                                activeTab === tab.id
                                    ? 'border-[#005fab] text-[#005fab]'
                                    : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
                            )}
                        >
                            <FunnelIcon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* Suche (optional, aber passend zum Stil) */}
                <div className="relative w-full lg:flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
                    <input
                        type="search"
                        placeholder="Freigaben durchsuchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab] transition-all"
                    />
                </div>
            </div>

            {/* Tabelle */}
            <div className="overflow-x-auto rounded-lg border">
                {/* Deine <Table> Komponente wird hier verwendet */}
                <Table className="min-w-full">
                    <TableHead>
                        <TableRow>
                            {/* Deine <TableHeader> (th) Komponente */}
                            <TableHeader>Kampagne</TableHeader>
                            <TableHeader>Kunde</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader>Letzte Aktivität</TableHeader>
                            <TableHeader className="w-12"></TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {/* Hier werden später die Daten eingefügt. */}
                        {/* Deine <TableRow> und <TableCell> Komponenten */}
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-10">
                                <Text className="text-zinc-500">Keine Kampagnen in dieser Ansicht gefunden.</Text>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}