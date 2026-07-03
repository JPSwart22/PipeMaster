import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import supabase from './supabase'

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data.session
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    await GoogleAuth.initialize({
      clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
    })
    const googleUser = await GoogleAuth.signIn()
    const idToken = googleUser.authentication.idToken
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
    if (error) throw error
    return data.session
  } else {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
    return null // session arrives via onAuthStateChange after redirect
  }
}

export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => subscription.unsubscribe()
}

export async function signOut() {
  await supabase.auth.signOut()
}
