/** Firebase — used ONLY for Google Auth + Firestore (groups, battles, doubts, focus, call signaling). */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  connectAuthEmulator,
  signInAnonymously,
  updateProfile,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { useEffect, useState } from 'react'

/**
 * Public Firebase web config (safe to ship — access is enforced by firestore.rules).
 * Env vars override these defaults; empty env vars (e.g. blank entries copied from .env.example) are ignored.
 */
const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyBFGyufDob1sIBhqPc4uPzgAithoAMJiwk',
  authDomain: 'studyduel-88d3e.firebaseapp.com',
  projectId: 'studyduel-88d3e',
  storageBucket: 'studyduel-88d3e.firebasestorage.app',
  messagingSenderId: '218566633142',
  appId: '1:218566633142:web:a359f9e7e9c9babea22817',
}
const env = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback)

const config = {
  apiKey: env(import.meta.env.VITE_FIREBASE_API_KEY, DEFAULT_CONFIG.apiKey),
  authDomain: env(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, DEFAULT_CONFIG.authDomain),
  projectId: env(import.meta.env.VITE_FIREBASE_PROJECT_ID, DEFAULT_CONFIG.projectId),
  storageBucket: env(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, DEFAULT_CONFIG.storageBucket),
  messagingSenderId: env(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, DEFAULT_CONFIG.messagingSenderId),
  appId: env(import.meta.env.VITE_FIREBASE_APP_ID, DEFAULT_CONFIG.appId),
}

/** Local testing without a Firebase project: `firebase emulators:start --only auth,firestore` + VITE_FIREBASE_EMULATORS=true */
export const useEmulators = import.meta.env.VITE_FIREBASE_EMULATORS === 'true'

export const firebaseEnabled = useEmulators || Boolean(config.apiKey && config.projectId && config.appId)

let app: FirebaseApp | undefined
let _auth: Auth | undefined
let _db: Firestore | undefined

if (firebaseEnabled) {
  app = initializeApp(useEmulators ? { ...config, apiKey: config.apiKey || 'demo-key', projectId: config.projectId || 'demo-studyduel', appId: config.appId || 'demo-app' } : config)
  _auth = getAuth(app)
  _db = getFirestore(app)
  if (useEmulators) {
    const host = location.hostname
    connectAuthEmulator(_auth, `http://${host}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(_db, host, 8080)
  }
}

/** Emulator-only quick sign-in (lets you test groups/battles/calls in several tabs without Google accounts). */
export async function signInTestUser(name: string) {
  const cred = await signInAnonymously(auth())
  await updateProfile(cred.user, { displayName: name })
  listeners.forEach((l) => l())
}

export const auth = () => {
  if (!_auth) throw new Error('Firebase is not configured. Add VITE_FIREBASE_* variables to .env.')
  return _auth
}
export const fs = () => {
  if (!_db) throw new Error('Firebase is not configured. Add VITE_FIREBASE_* variables to .env.')
  return _db
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth(), provider)
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth(), provider)
    } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') throw e
  }
}

export const signOut = () => (firebaseEnabled ? fbSignOut(auth()) : Promise.resolve())

let currentUser: User | null = null
let resolved = !firebaseEnabled
const listeners = new Set<() => void>()
if (_auth) {
  onAuthStateChanged(_auth, (u) => {
    currentUser = u
    resolved = true
    listeners.forEach((l) => l())
  })
}

export const getCurrentUser = () => currentUser

export function useAuth() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((x) => x + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return { user: currentUser, loading: !resolved, enabled: firebaseEnabled }
}

export const displayName = (u: User | null) => u?.displayName || u?.email?.split('@')[0] || 'Student'
