import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Portfolio } from '../types/portfolio';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });
microsoftProvider.addScope('user.read');

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Save or update user profile in Firestore
export async function syncUserProfile(user: User, providerType: string = 'google') {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Investor',
      photoURL: user.photoURL || '',
      provider: providerType,
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn('Could not sync user profile to Firestore:', error);
  }
}

// Sign In with Google
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user, 'google');
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

// Sign In with Microsoft
export async function loginWithMicrosoft(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, microsoftProvider);
    await syncUserProfile(result.user, 'microsoft');
    return result.user;
  } catch (error: any) {
    console.error('Microsoft Sign-In Error:', error);
    throw error;
  }
}

// Sign In with Apple
export async function loginWithApple(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    await syncUserProfile(result.user, 'apple');
    return result.user;
  } catch (error: any) {
    console.error('Apple Sign-In Error:', error);
    throw error;
  }
}

// Sign In with Email & Password
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  await syncUserProfile(result.user, 'password');
  return result.user;
}

// Sign Up with Email & Password
export async function registerWithEmail(email: string, pass: string, displayName?: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  await syncUserProfile(result.user, 'password');
  return result.user;
}

// Sign Out
export async function logOutUser(): Promise<void> {
  await signOut(auth);
}

// Sync Portfolios to/from Firestore for logged-in user
export async function savePortfolioToCloud(userId: string, portfolio: Portfolio): Promise<void> {
  try {
    const portRef = doc(db, 'users', userId, 'portfolios', portfolio.id);
    await setDoc(portRef, {
      ...portfolio,
      userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn('Could not save portfolio to cloud:', error);
  }
}

export async function loadUserPortfoliosFromCloud(userId: string): Promise<Portfolio[]> {
  try {
    const portCol = collection(db, 'users', userId, 'portfolios');
    const snapshot = await getDocs(portCol);
    const list: Portfolio[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      list.push(data as Portfolio);
    });
    return list;
  } catch (error) {
    console.warn('Could not load portfolios from cloud:', error);
    return [];
  }
}
