// src/app/invite/[token]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/button';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  ArrowRightIcon,
  ClockIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';

interface InvitationData {
  email: string;
  role: string;
  organizationId: string;
  invitedBy: string;
}

export default function AcceptInvitationPage({ 
  params 
}: { 
  params: { token: string } 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [valid, setValid] = useState(false);
  
  const token = params.token;
  const invitationId = searchParams.get('id');
  
  // Rolle Labels
  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Team-Mitglied',
    client: 'Kunde',
    guest: 'Gast'
  };
  
  // Token validieren
  useEffect(() => {
    if (!token || !invitationId) {
      setError('Ungültiger Einladungslink');
      setLoading(false);
      return;
    }
    
    validateInvitation();
  }, [token, invitationId]);
  
  const validateInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/team/accept-invitation?token=${token}&id=${invitationId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Einladung konnte nicht validiert werden');
      }
      
      if (data.valid) {
        setInvitation(data.invitation);
        setValid(true);
      } else {
        throw new Error(data.error || 'Ungültige Einladung');
      }
    } catch (error: any) {
      console.error('Error validating invitation:', error);
      setError(error.message || 'Fehler beim Validieren der Einladung');
      setValid(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/invite/${token}?id=${invitationId}`;
      router.push(`/auth/signin?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }
    
    if (!invitation) return;
    
    // Check if user email matches invitation email
    if (user.email !== invitation.email) {
      setError(`Diese Einladung wurde an ${invitation.email} gesendet. Sie sind als ${user.email} angemeldet.`);
      return;
    }
    
    try {
      setAccepting(true);
      setError(null);
      
      const response = await fetch('/api/team/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          token,
          invitationId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Annehmen der Einladung');
      }
      
      // Erfolg - weiterleiten zum Dashboard
      router.push('/dashboard?welcome=true');
      
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setError(error.message || 'Fehler beim Annehmen der Einladung');
    } finally {
      setAccepting(false);
    }
  };
  
  const handleSignOut = async () => {
    if (user) {
      await fetch('/api/auth/signout', { method: 'POST' });
      window.location.reload();
    }
  };
  
  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
            <p className="mt-4 text-center text-sm text-gray-600">
              Einladung wird geprüft...
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error && !valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="rounded-full bg-red-100 p-3 mx-auto w-fit">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <Heading level={2} className="mt-6 text-center">
              Ungültige Einladung
            </Heading>
            <Text className="mt-2 text-center text-gray-600">
              {error}
            </Text>
            <div className="mt-6">
              <Button
                onClick={() => router.push('/auth/signin')}
                className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white"
              >
                Zur Anmeldung
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Valid invitation
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="rounded-full bg-blue-100 p-3 mx-auto w-fit">
            <UserGroupIcon className="h-8 w-8 text-[#005fab]" />
          </div>
          
          <Heading level={2} className="mt-6 text-center">
            Team-Einladung
          </Heading>
          
          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Eingeladen für:</dt>
                  <dd className="text-sm text-gray-900">{invitation?.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Rolle:</dt>
                  <dd className="text-sm text-gray-900">
                    {invitation && roleLabels[invitation.role] || invitation?.role}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Organisation:</dt>
                  <dd className="text-sm text-gray-900">CeleroPress</dd>
                </div>
              </dl>
            </div>
            
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {!user ? (
              <>
                <Text className="text-center text-sm text-gray-600">
                  Sie müssen sich anmelden, um diese Einladung anzunehmen.
                </Text>
                <Button
                  onClick={() => handleAcceptInvitation()}
                  className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white"
                >
                  Anmelden & Einladung annehmen
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : user.email === invitation?.email ? (
              <>
                <Text className="text-center text-sm text-gray-600">
                  Angemeldet als <span className="font-medium">{user.email}</span>
                </Text>
                <Button
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white"
                >
                  {accepting ? (
                    <>
                      <ClockIcon className="mr-2 h-4 w-4 animate-spin" />
                      Wird angenommen...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="mr-2 h-4 w-4" />
                      Einladung annehmen
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        Sie sind als <span className="font-medium">{user.email}</span> angemeldet, 
                        aber diese Einladung ist für <span className="font-medium">{invitation?.email}</span>.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSignOut}
                    plain
                    className="w-full"
                  >
                    Mit anderem Konto anmelden
                  </Button>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Zum Dashboard
                  </Button>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <Text className="text-xs text-gray-500">
              Probleme? Kontaktieren Sie den Administrator.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}