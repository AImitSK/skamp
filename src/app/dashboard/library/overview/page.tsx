"use client";

import { useState } from 'react';
import { Heading } from "@/components/heading";
import { Button } from "@/components/button";
import { PencilIcon, RocketLaunchIcon } from "@heroicons/react/20/solid";
import { seedDummyData } from '@/scripts/seed-dummy-data';
import { useAuth } from '@/context/AuthContext';

export default function PlaceholderPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Function to load data - implement based on your needs
  const loadData = async () => {
    // Implement your data loading logic here
    // For example:
    // const data = await fetchLibraryData(user.uid);
    // setLibraryData(data);
  };

  // Function to show alerts
  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    // Auto-hide alert after 5 seconds
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSeedData = async () => {
    if (user) {
      try {
        setLoading(true);
        await seedDummyData(user.uid);
        await loadData(); // Reload data
        showAlert('success', 'Dummy-Daten erfolgreich angelegt!');
      } catch (error) {
        showAlert('error', 'Fehler beim Anlegen der Dummy-Daten');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert Message */}
      {alert && (
        <div
          className={`rounded-md p-4 ${
            alert.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          <p className="text-sm font-medium">{alert.message}</p>
        </div>
      )}

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
          <Button 
            onClick={handleSeedData}
            disabled={loading}
            className="ml-3"
          >
            {loading ? 'Lädt...' : 'Test-Daten anlegen'}
          </Button>
        </div>
      </div>
    </div>
  );
}