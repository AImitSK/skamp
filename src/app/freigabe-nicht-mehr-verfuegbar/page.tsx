// src/app/freigabe-nicht-mehr-verfuegbar/page.tsx
import { ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function FreigabeNichtMehrVerfuegbar() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-yellow-100 p-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Team-Freigabe nicht mehr verfügbar
            </h1>
            <p className="text-gray-600">
              Das Team-Freigabe-System wurde vereinfacht
            </p>
          </div>
          
          {/* Content */}
          <div className="space-y-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">
                ✅ System-Vereinfachung
              </h3>
              <p className="text-blue-800 text-sm">
                Wir haben das 2-stufige Freigabe-System (Team + Kunde) zu einem 
                <strong> einstufigen Kundenfreigabe-Prozess</strong> vereinfacht.
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">
                🎯 Neue Vorteile
              </h3>
              <ul className="text-green-800 text-sm space-y-1">
                <li>• Schnellere Freigabe-Prozesse</li>
                <li>• Weniger Komplexität</li>
                <li>• Direktere Kommunikation mit Kunden</li>
              </ul>
            </div>
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <Link href="/dashboard/pr-tools/campaigns">
              <Button className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white">
                <ArrowRightIcon className="h-4 w-4 mr-2" />
                Zu den Kampagnen
              </Button>
            </Link>
            
            <Link href="/dashboard/pr-tools/approvals">
              <Button plain className="w-full border border-gray-300">
                Freigaben verwalten
              </Button>
            </Link>
          </div>
          
          {/* Help */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Bei Fragen wenden Sie sich an den Support
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}