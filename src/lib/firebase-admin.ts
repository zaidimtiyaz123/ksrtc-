import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const app = !getApps().length
  ? initializeApp({
      projectId: firebaseConfigData.projectId,
    })
  : getApp();

export const adminAuth = getAuth(app);
export const adminFirestore = getFirestore(app);
