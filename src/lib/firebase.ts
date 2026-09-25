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

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
