/**
 * Developer Dashboard API Keys Endpoint
 * Speziell für Firebase Auth - Management von API Keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { verifyIdToken } from '@/lib/firebase/admin';
import crypto from 'crypto';

// GET - Liste aller API Keys für den User
export async function GET(request: NextRequest) {
  try {
    // Firebase Auth Token verifizieren
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // API Keys aus Firestore holen
    const keysQuery = query(
      collection(db, 'api_keys'),
      where('userId', '==', userId)
    );
    
    const keysSnapshot = await getDocs(keysQuery);
    const apiKeys = [];

    for (const doc of keysSnapshot.docs) {
      const data = doc.data();
      
      // Letzte Verwendung aus api_logs
      const lastUsedQuery = query(
        collection(db, 'api_logs'),
        where('apiKeyId', '==', doc.id),
        where('timestamp', '>=', Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
      );
      const lastUsedSnapshot = await getDocs(lastUsedQuery);
      
      apiKeys.push({
        id: doc.id,
        name: data.name || 'Unnamed Key',
        key: data.key, // In Produktion sollte nur Teil angezeigt werden
        status: data.status || 'active',
        permissions: data.permissions || ['read', 'write'],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastUsed: lastUsedSnapshot.empty ? null : new Date().toISOString(),
        usageCount: lastUsedSnapshot.size
      });
    }

    // Sortiere nach Erstellungsdatum
    apiKeys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: apiKeys,
      count: apiKeys.length
    });

  } catch (error) {
    console.error('Developer keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Neuen API Key erstellen
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const body = await request.json();

    // Generiere neuen API Key
    const environment = body.environment || 'live';
    const prefix = environment === 'test' ? 'cp_test_' : 'cp_live_';
    const randomBytes = crypto.randomBytes(24).toString('hex');
    const apiKey = prefix + randomBytes;

    // Speichere in Firestore
    const newKey = {
      userId,
      name: body.name || `API Key ${new Date().toLocaleDateString()}`,
      key: apiKey,
      keyHash: crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16),
      environment,
      status: 'active',
      permissions: body.permissions || ['read', 'write'],
      createdAt: Timestamp.now(),
      createdBy: decodedToken.email || userId
    };

    const docRef = await addDoc(collection(db, 'api_keys'), newKey);

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        name: newKey.name,
        key: apiKey,
        environment,
        status: 'active',
        createdAt: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - API Key löschen
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: 'Key ID required' },
        { status: 400 }
      );
    }

    // Prüfe ob Key dem User gehört
    const keyDoc = await getDocs(
      query(
        collection(db, 'api_keys'),
        where('__name__', '==', keyId),
        where('userId', '==', decodedToken.uid)
      )
    );

    if (keyDoc.empty) {
      return NextResponse.json(
        { error: 'Key not found' },
        { status: 404 }
      );
    }

    // Lösche den Key
    await deleteDoc(doc(db, 'api_keys', keyId));

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully'
    });

  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS für CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}