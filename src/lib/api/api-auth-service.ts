// src/lib/api/api-auth-service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase/build-safe-init';
import { 
  APIKey, 
  APIKeyCreateRequest, 
  APIKeyResponse, 
  APIRequestContext, 
  APIError, 
  API_ERROR_CODES,
  APIPermission 
} from '@/types/api';
import { nanoid } from 'nanoid';
import { createHash, randomBytes } from 'crypto';

/**
 * API Authentication Service
 * Verwaltet API-Keys, Authentifizierung und Rate-Limiting
 */
export class APIAuthService {
  private readonly collectionName = 'api_keys';
  
  constructor() {
    // Debug: Firebase-Initialisierung prüfen
    console.log('=== FIREBASE INIT DEBUG ===');
    console.log('DB object:', typeof db);
    console.log('Firebase Config:', {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '***SET***' : 'MISSING',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '***SET***' : 'MISSING',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '***SET***' : 'MISSING',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '***SET***' : 'MISSING',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '***SET***' : 'MISSING',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '***SET***' : 'MISSING'
    });
  }
  
  /**
   * Erstellt einen neuen API-Key
   */
  async createAPIKey(
    params: {
      organizationId: string;
      createdBy: string;
      name: string;
      permissions: string[];
      expiresInDays?: number;
      rateLimit?: {
        requestsPerHour?: number;
        requestsPerMinute?: number;
      };
      allowedIPs?: string[];
    }
  ): Promise<APIKeyResponse> {
    // Generiere sicheren API-Key
    const apiKeySecret = this.generateAPIKey();
    const keyHash = this.hashAPIKey(apiKeySecret);
    const keyPreview = apiKeySecret.substring(0, 8) + '...';
    
    // Berechne Ablaufzeit
    const expiresAt = params.expiresInDays 
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;
    
    // Erstelle API-Key-Objekt
    const apiKey: Omit<APIKey, 'id'> = {
      name: params.name,
      keyHash,
      keyPreview,
      organizationId: params.organizationId,
      userId: params.createdBy,
      permissions: params.permissions,
      isActive: true,
      
      rateLimit: {
        requestsPerHour: params.rateLimit?.requestsPerHour || 1000,
        requestsPerMinute: params.rateLimit?.requestsPerMinute || 60,
        burstLimit: 10
      },
      
      usage: {
        totalRequests: 0,
        requestsThisHour: 0,
        requestsToday: 0
      },
      
      allowedIPs: params.allowedIPs || null,
      expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
      
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      createdBy: params.createdBy,
      updatedBy: params.createdBy
    };
    
    // Speichere in Firestore
    console.log('=== FIRESTORE CREATE DEBUG ===');
    console.log('Collection name:', this.collectionName);
    console.log('DB object type:', typeof db);
    console.log('DB object constructor:', db?.constructor?.name);
    console.log('API Key data (without sensitive info):', {
      name: apiKey.name,
      organizationId: apiKey.organizationId,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit
    });
    
    // Firestore ist korrekt initialisiert - vertraue auf addDoc() Error-Handling
    
    let docRef;
    try {
      docRef = await addDoc(collection(db, this.collectionName), apiKey);
      console.log('Firestore document created with ID:', docRef.id);
    } catch (firestoreError) {
      console.error('Firestore addDoc failed:', firestoreError);
      throw firestoreError;
    }
    
    // Gib API-Key-Response zurück (mit echtem Key nur einmalig)
    return {
      id: docRef.id,
      name: apiKey.name,
      key: apiKeySecret, // Nur bei Erstellung zurückgeben!
      keyPreview: apiKey.keyPreview,
      permissions: apiKey.permissions,
      isActive: apiKey.isActive,
      rateLimit: apiKey.rateLimit,
      usage: apiKey.usage,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt?.toISOString()
    };
  }
  
  /**
   * Validiert API-Key und gibt Request-Context zurück
   */
  async validateAPIKey(
    apiKey: string, 
    clientIP: string,
    userAgent: string
  ): Promise<APIRequestContext> {
    
    console.log('=== API AUTH SERVICE DEBUG ===');
    console.log('Validating API Key:', apiKey ? `${apiKey.substring(0, 25)}...` : 'NULL');
    
    console.log('Proceeding with Firestore validation...');
    const keyHash = this.hashAPIKey(apiKey);
    console.log('Key hash:', keyHash.substring(0, 16) + '...');
    
    // Suche API-Key in Firestore
    console.log('Querying Firestore collection:', this.collectionName);
    const q = query(
      collection(db, this.collectionName),
      where('keyHash', '==', keyHash),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    console.log('Firestore query result - empty:', snapshot.empty);
    console.log('Firestore query result - size:', snapshot.size);
    
    if (snapshot.empty) {
      console.log('ERROR: API key not found in Firestore');
      throw new APIError(401, API_ERROR_CODES.INVALID_API_KEY, 'Invalid API key');
    }
    
    const apiKeyDoc = snapshot.docs[0];
    const apiKeyData = { ...apiKeyDoc.data(), id: apiKeyDoc.id } as APIKey;
    
    // Prüfe Ablaufzeit
    if (apiKeyData.expiresAt && apiKeyData.expiresAt.toDate() < new Date()) {
      throw new APIError(401, API_ERROR_CODES.EXPIRED_API_KEY, 'API key has expired');
    }
    
    // Prüfe IP-Whitelist
    if (apiKeyData.allowedIPs && apiKeyData.allowedIPs.length > 0) {
      if (!apiKeyData.allowedIPs.includes(clientIP)) {
        throw new APIError(403, API_ERROR_CODES.IP_NOT_ALLOWED, 'IP address not allowed');
      }
    }
    
    // Aktualisiere Usage-Statistiken
    await this.updateUsageStats(apiKeyDoc.id);
    
    return {
      organizationId: apiKeyData.organizationId,
      userId: apiKeyData.userId,
      apiKeyId: apiKeyDoc.id,
      permissions: apiKeyData.permissions,
      rateLimit: apiKeyData.rateLimit,
      clientIP,
      userAgent
    };
  }
  
  /**
   * Prüft ob Request innerhalb der Rate-Limits liegt
   */
  async checkRateLimit(context: APIRequestContext, endpoint: string): Promise<void> {
    console.log('=== RATE LIMIT CHECK DEBUG ===');
    console.log('Checking rate limit for apiKeyId:', context.apiKeyId);
    
    // Hole aktuelle Usage-Daten
    const apiKeyDoc = await getDoc(doc(db, this.collectionName, context.apiKeyId));
    if (!apiKeyDoc.exists()) {
      console.log('ERROR: API key document not found in Firestore for rate limiting');
      throw new APIError(401, API_ERROR_CODES.INVALID_API_KEY, 'API key not found');
    }
    
    const apiKeyData = apiKeyDoc.data() as APIKey;
    const now = new Date();
    const currentHour = now.getHours();
    
    // Prüfe Hourly Rate Limit
    if (apiKeyData.usage.requestsThisHour >= context.rateLimit.requestsPerHour) {
      throw new APIError(
        429, 
        API_ERROR_CODES.RATE_LIMIT_EXCEEDED, 
        `Rate limit exceeded: ${context.rateLimit.requestsPerHour} requests per hour`
      );
    }
    
    // TODO: Implement minute-based rate limiting mit Redis/Memory Cache
    // Für Proof-of-Concept verwenden wir nur Hourly Limits
  }
  
  /**
   * Prüft ob User die erforderlichen Permissions hat
   */
  hasPermission(context: APIRequestContext, requiredPermissions: APIPermission[]): boolean {
    return requiredPermissions.every(permission => 
      context.permissions.includes(permission)
    );
  }
  
  /**
   * Hole alle API-Keys einer Organisation
   */
  async getAPIKeys(organizationId: string, userId: string): Promise<Omit<APIKeyResponse, 'key'>[]> {
    console.log('=== GET API KEYS DEBUG ===');
    console.log('OrganizationId:', organizationId);
    console.log('Collection name:', this.collectionName);
    
    // Temporär: Einfache Query ohne orderBy um Index-Problem zu umgehen
    const q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId)
      // orderBy('createdAt', 'desc') - Entfernt bis Index erstellt ist
    );
    
    try {
      const snapshot = await getDocs(q);
      console.log('Firestore query result - empty:', snapshot.empty);
      console.log('Firestore query result - size:', snapshot.size);
      
      const apiKeys: Omit<APIKeyResponse, 'key'>[] = [];
    
      snapshot.forEach(doc => {
        const data = doc.data() as APIKey;
        apiKeys.push({
          id: doc.id,
          name: data.name,
          keyPreview: data.keyPreview,
          permissions: data.permissions,
          isActive: data.isActive,
          rateLimit: data.rateLimit,
          usage: data.usage,
          createdAt: data.createdAt.toDate().toISOString(),
          expiresAt: data.expiresAt?.toDate().toISOString()
        });
      });
      
      console.log('API Keys found:', apiKeys.length);
      
      // Client-seitige Sortierung nach createdAt (neueste zuerst)
      apiKeys.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Desc order
      });
      
      return apiKeys;
      
    } catch (firestoreError) {
      console.error('Firestore getDocs failed:', firestoreError);
      throw firestoreError;
    }
  }
  
  /**
   * Deaktiviert einen API-Key
   */
  async deactivateAPIKey(apiKeyId: string, organizationId: string): Promise<void> {
    const apiKeyRef = doc(db, this.collectionName, apiKeyId);
    const apiKeyDoc = await getDoc(apiKeyRef);
    
    if (!apiKeyDoc.exists()) {
      throw new APIError(404, API_ERROR_CODES.RESOURCE_NOT_FOUND, 'API key not found');
    }
    
    const apiKeyData = apiKeyDoc.data() as APIKey;
    
    // Prüfe Berechtigung
    if (apiKeyData.organizationId !== organizationId) {
      throw new APIError(403, API_ERROR_CODES.INSUFFICIENT_PERMISSIONS, 'Not authorized to manage this API key');
    }
    
    await updateDoc(apiKeyRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  }
  
  /**
   * Löscht einen API-Key
   */
  async deleteAPIKey(apiKeyId: string, organizationId: string): Promise<void> {
    const apiKeyRef = doc(db, this.collectionName, apiKeyId);
    const apiKeyDoc = await getDoc(apiKeyRef);
    
    if (!apiKeyDoc.exists()) {
      throw new APIError(404, API_ERROR_CODES.RESOURCE_NOT_FOUND, 'API key not found');
    }
    
    const apiKeyData = apiKeyDoc.data() as APIKey;
    
    // Prüfe Berechtigung
    if (apiKeyData.organizationId !== organizationId) {
      throw new APIError(403, API_ERROR_CODES.INSUFFICIENT_PERMISSIONS, 'Not authorized to delete this API key');
    }
    
    await deleteDoc(apiKeyRef);
  }
  
  /**
   * Private Helper Methods
   */
  
  private generateAPIKey(): string {
    // Format: cp_live_[32 chars] oder cp_test_[32 chars]
    // Verwende VERCEL_ENV für echte Produktionsumgebung oder explizite API_ENV Variable
    const isProduction = process.env.VERCEL_ENV === 'production' || 
                         process.env.API_ENV === 'production' || 
                         process.env.NODE_ENV === 'production';
    
    const prefix = isProduction ? 'cp_live_' : 'cp_test_';
    const randomPart = randomBytes(16).toString('hex');
    
    console.log('=== API KEY GENERATION DEBUG ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
    console.log('API_ENV:', process.env.API_ENV);
    console.log('Is Production:', isProduction);
    console.log('Using prefix:', prefix);
    
    return prefix + randomPart;
  }
  
  private hashAPIKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
  
  private async updateUsageStats(apiKeyId: string): Promise<void> {
    const apiKeyRef = doc(db, this.collectionName, apiKeyId);
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.toDateString();
    
    // Atomare Aktualisierung der Usage-Statistiken
    await updateDoc(apiKeyRef, {
      'usage.totalRequests': increment(1),
      'usage.requestsThisHour': increment(1),
      'usage.requestsToday': increment(1),
      'usage.lastUsedAt': serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // TODO: Reset hourly/daily counters basierend auf Zeitstempel
    // Für Proof-of-Concept belassen wir die einfache Implementierung
  }
}

// Singleton Export
export const apiAuthService = new APIAuthService();