// src/components/profile/TwoFactorSettings.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import QRCode from 'qrcode';
import { 
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';
import { 
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

export function TwoFactorSettings() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupStep, setSetupStep] = useState<'phone' | 'verify' | 'complete'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Check if MFA is already enabled
      const mfaUser = multiFactor(user);
      setIsEnabled(mfaUser.enrolledFactors.length > 0);
    }
  }, [user]);

  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const handleSetup2FA = async () => {
    setIsSettingUp(true);
    setSetupStep('phone');
    setError(null);
  };

  const handleSendVerificationCode = async () => {
    if (!user || !phoneNumber) return;
    
    setLoading(true);
    setError(null);

    try {
      // Initialize reCAPTCHA mit erweiterten Optionen
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved successfully');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          setError('reCAPTCHA ist abgelaufen. Bitte versuche es erneut.');
        }
      });

      const mfaUser = multiFactor(user);
      const session = await mfaUser.getSession();
      
      // Send SMS verification
      const phoneInfoOptions = {
        phoneNumber: phoneNumber,
        session: session
      };
      
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        recaptchaVerifier
      );
      
      setVerificationId(verificationId);
      setSetupStep('verify');
    } catch (error: any) {
      console.error('2FA setup error:', error);
      
      if (error.code === 'auth/operation-not-allowed') {
        setError('SMS-basierte 2FA ist nicht aktiviert. Bitte kontaktiere den Support.');
      } else if (error.code === 'auth/captcha-check-failed') {
        setError('reCAPTCHA-Verifizierung fehlgeschlagen. Bitte versuche es erneut.');
      } else if (error.code === 'auth/invalid-phone-number') {
        setError('Ungültige Telefonnummer. Verwende das internationale Format (+49...).');
      } else if (error.code === 'auth/quota-exceeded') {
        setError('SMS-Quota überschritten. Versuche es später erneut.');
      } else if (error.message?.includes('reCAPTCHA Enterprise')) {
        setError('reCAPTCHA-Konfigurationsfehler. Bitte kontaktiere den Support.');
      } else {
        setError(`Fehler beim Senden des Codes: ${error.message || 'Unbekannter Fehler'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!user || !verificationId || !verificationCode) return;
    
    setLoading(true);
    setError(null);

    try {
      const mfaUser = multiFactor(user);
      
      // Create PhoneAuthCredential
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      
      // Enroll the phone number
      await mfaUser.enroll(multiFactorAssertion, 'Haupttelefon');
      
      // Generate backup codes
      const codes = generateBackupCodes();
      setBackupCodes(codes);
      
      // Generate QR code for backup codes
      const qrData = codes.join('\n');
      const qrUrl = await QRCode.toDataURL(qrData);
      setQrCodeUrl(qrUrl);
      
      setSetupStep('complete');
      setIsEnabled(true);
    } catch (error: any) {
      setError('Ungültiger Verifizierungscode. Bitte versuche es erneut.');
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const mfaUser = multiFactor(user);
      const enrolledFactors = mfaUser.enrolledFactors;
      
      // Unenroll all factors
      for (const factor of enrolledFactors) {
        await mfaUser.unenroll(factor);
      }
      
      setIsEnabled(false);
      setIsSettingUp(false);
    } catch (error: any) {
      setError('Fehler beim Deaktivieren der 2FA. Bitte versuche es erneut.');
      console.error('Disable 2FA error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsSettingUp(false);
    setSetupStep('phone');
    setPhoneNumber('');
    setVerificationCode('');
    setVerificationId('');
    setBackupCodes([]);
    setQrCodeUrl('');
    setError(null);
  };

  if (!user) return null;

  return (
    <>
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              isEnabled ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <ShieldCheckIcon className={`h-5 w-5 ${
                isEnabled ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Subheading level={3}>Zwei-Faktor-Authentifizierung</Subheading>
                {isEnabled ? (
                  <Badge color="green">Aktiv</Badge>
                ) : (
                  <Badge color="gray">Inaktiv</Badge>
                )}
              </div>
              <Text className="text-sm text-gray-600 mt-1">
                {isEnabled 
                  ? 'Dein Account ist mit 2FA geschützt'
                  : 'Erhöhe die Sicherheit deines Accounts mit 2FA'
                }
              </Text>
            </div>
          </div>
          
          <Button
            className={isEnabled 
              ? "!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
              : "bg-[#005fab] hover:bg-[#004a8c] px-4 py-2"
            }
            onClick={isEnabled ? handleDisable2FA : handleSetup2FA}
            disabled={loading}
          >
            {loading ? 'Verarbeite...' : (isEnabled ? '2FA deaktivieren' : '2FA einrichten')}
          </Button>
        </div>

        {/* Hinweis für nicht aktivierte 2FA */}
        {!isEnabled && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Empfohlen:</strong> Die Zwei-Faktor-Authentifizierung bietet zusätzlichen Schutz 
              für deinen Account. Nach der Aktivierung benötigst du neben deinem Passwort auch einen 
              Code von deinem Smartphone zum Einloggen.
            </div>
          </div>
        )}
      </div>

      {/* Setup Dialog */}
      <Dialog open={isSettingUp} onClose={handleClose}>
        <DialogTitle className="px-6 py-4">
          {setupStep === 'phone' && '2FA einrichten - Telefonnummer'}
          {setupStep === 'verify' && '2FA einrichten - Verifizierung'}
          {setupStep === 'complete' && '2FA erfolgreich aktiviert'}
        </DialogTitle>
        
        <DialogBody className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {setupStep === 'phone' && (
            <>
              <Text className="mb-4">
                Gib deine Telefonnummer ein, um SMS-Verifizierung zu aktivieren.
              </Text>
              <Field>
                <Label>Telefonnummer</Label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+49 123 456789"
                />
              </Field>
              <div id="recaptcha-container"></div>
            </>
          )}

          {setupStep === 'verify' && (
            <>
              <Text className="mb-4">
                Wir haben einen Verifizierungscode an {phoneNumber} gesendet.
              </Text>
              <Field>
                <Label>Verifizierungscode</Label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
              </Field>
            </>
          )}

          {setupStep === 'complete' && (
            <>
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                </div>
                <Text className="font-medium text-lg">
                  2FA wurde erfolgreich aktiviert!
                </Text>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <Text className="font-medium mb-2">Wichtig: Speichere deine Backup-Codes</Text>
                <Text className="text-sm text-gray-600 mb-3">
                  Diese Codes kannst du verwenden, falls du keinen Zugriff auf dein Telefon hast.
                </Text>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm bg-white p-2 rounded border">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {qrCodeUrl && (
                <div className="text-center">
                  <Text className="text-sm text-gray-600 mb-2">
                    QR-Code mit Backup-Codes:
                  </Text>
                  <img src={qrCodeUrl} alt="Backup Codes QR" className="mx-auto" />
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogActions className="px-6 py-4">
          {setupStep === 'phone' && (
            <>
              <Button
                className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
                onClick={handleClose}
                disabled={loading}
              >
                Abbrechen
              </Button>
              <Button
                className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2"
                onClick={handleSendVerificationCode}
                disabled={loading || !phoneNumber}
              >
                {loading ? 'Sende...' : 'Code senden'}
              </Button>
            </>
          )}

          {setupStep === 'verify' && (
            <>
              <Button
                className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
                onClick={() => setSetupStep('phone')}
                disabled={loading}
              >
                Zurück
              </Button>
              <Button
                className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2"
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? 'Verifiziere...' : 'Verifizieren'}
              </Button>
            </>
          )}

          {setupStep === 'complete' && (
            <Button
              className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2"
              onClick={handleClose}
            >
              Fertig
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}