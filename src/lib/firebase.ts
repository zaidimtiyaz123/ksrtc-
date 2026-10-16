import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with the provisioned Database ID
export const db = getFirestore(
  app,
  (firebaseConfigData as Record<string, any>).firestoreDatabaseId || '(default)'
);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/tasks');
googleProvider.addScope('https://www.googleapis.com/auth/tasks.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/documents');
googleProvider.addScope('https://www.googleapis.com/auth/documents.readonly');
googleProvider.setCustomParameters({
  prompt: 'consent'
});

export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
}

export interface FirestoreErrorContext {
  operation: OperationType;
  path: string;
  authUid?: string | null;
  timestamp: string;
}

export function handleFirestoreError(error: unknown, context: FirestoreErrorContext): void {
  const errMessage = error instanceof Error ? error.message : String(error);
  console.error('[Firestore Error]', {
    operation: context.operation,
    targetPath: context.path,
    authenticatedUser: context.authUid || 'anonymous',
    timestamp: context.timestamp,
    message: errMessage,
    rawError: error,
  });
}

// Test Connection with direct server probe
export async function testConnection(): Promise<boolean> {
  try {
    const probeRef = doc(db, '_health_check', 'probe');
    await getDocFromServer(probeRef);
    return true;
  } catch (err: any) {
    // A permission-denied or document-not-found from the server confirms reachability
    if (err.code === 'permission-denied' || err.code === 'not-found') {
      return true;
    }
    console.warn('[Firebase] Connection probe warning:', err.message);
    return false;
  }
}
