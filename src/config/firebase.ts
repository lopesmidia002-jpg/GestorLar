import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

// Configuração do Firebase extraída das variáveis de ambiente (.env)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Chave VAPID pública do Web Push (Firebase Console > Cloud Messaging > Web configuration)
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

// Verifica se as credenciais mínimas foram preenchidas no .env
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
);

let firebaseAppInstance: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

export async function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (firebaseAppInstance) return firebaseAppInstance;
  if (!isFirebaseConfigured) return null;

  try {
    if (!getApps().length) {
      firebaseAppInstance = initializeApp(firebaseConfig);
    } else {
      firebaseAppInstance = getApps()[0];
    }
    return firebaseAppInstance;
  } catch (error) {
    console.warn('Erro ao inicializar Firebase App:', error);
    return null;
  }
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('Firebase Messaging não é suportado neste navegador.');
      return null;
    }

    const app = await getFirebaseApp();
    if (!app) return null;

    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (error) {
    console.warn('Erro ao inicializar Firebase Messaging:', error);
    return null;
  }
}
