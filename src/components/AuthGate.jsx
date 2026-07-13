import { useState, useEffect, useRef } from 'react'
import { getSession, onAuthStateChange, signUp, signIn, signInWithGoogle } from '../lib/auth'
import { getMyFarm, setupFarm, joinFarmWithCode, saveProfile, isSubActive, getCachedSubAllowed } from '../lib/farms'
import { startAutoSync, stopAutoSync } from '../lib/cloudSync'
import { clearAllTablesData } from '../lib/backup'
import { initPurchases } from '../lib/purchases'
import SubWall from './SubWall'

function LoadingScreen() {
  return (
    <div className="app-root flex items-center justify-center" style={{ background: '#0f1923' }}>
      <span className="text-green-400 font-bold text-xl tracking-wide">PIPEMASTER</span>
    </div>
  )
}

function GoogleButton({ busy, onBusy }) {
  const [err, setErr] = useState(null)
  async function handle() {
    onBusy(true); setErr(null)
    try { await signInWithGoogle() }
    catch (e) { setErr(e.message) }
    finally { onBusy(false) }
  }
  return (
    <>
      <button onClick={handle} disabled={busy}
              className="w-full py-3 rounded-xl font-semibold text-white border border-white/15 flex items-center justify-center gap-2.5 hover:bg-white/5 transition-all disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
      {err && <div className="text-red-400 text-xs text-center">{err}</div>}
    </>
  )
}

function AuthScreen() {
  const [stage, setStage] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSignUp() {
    if (!email.trim() || !password.trim() || !username.trim()) return
    setBusy(true); setError(null)
    try {
      await signUp(email.trim(), password)
      await saveProfile(username.trim())
      localStorage.removeItem('pipemaster-farm-expanded') // fresh login — start with all farms collapsed
      // onAuthStateChange in AuthGate picks up the new session automatically
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) return
    setBusy(true); setError(null)
    try {
      await signIn(email.trim(), password)
      localStorage.removeItem('pipemaster-farm-expanded') // fresh login — start with all farms collapsed
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-root auth-bg flex flex-col items-center justify-center px-6">
      <span className="text-green-400 font-bold text-3xl tracking-wide mb-8"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
        PIPEMASTER
      </span>
      <div className="w-full flex flex-col gap-3 auth-card" style={{ maxWidth: 320 }}>
        <GoogleButton busy={busy} onBusy={setBusy} />
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-gray-600 text-xs">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          autoFocus
          className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
          style={{ background: 'rgba(15,25,35,0.6)' }}
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
          style={{ background: 'rgba(15,25,35,0.6)' }}
        />
        {stage === 'signup' && (
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
            style={{ background: 'rgba(15,25,35,0.6)' }}
          />
        )}

        {stage === 'signin' ? (
          <>
            <button onClick={handleSignIn} disabled={busy || !email.trim() || !password.trim()}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button onClick={() => { setStage('signup'); setError(null) }}
                    className="text-gray-300 hover:text-white text-xs text-center transition-colors">
              Need an account? Sign up
            </button>
          </>
        ) : (
          <>
            <button onClick={handleSignUp} disabled={busy || !email.trim() || !password.trim() || !username.trim()}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
              {busy ? 'Creating account…' : 'Sign up'}
            </button>
            <button onClick={() => { setStage('signin'); setError(null) }}
                    className="text-gray-300 hover:text-white text-xs text-center transition-colors">
              Already have an account? Sign in
            </button>
          </>
        )}
        {error && <div className="text-red-400 text-xs text-center">{error}</div>}
      </div>
    </div>
  )
}

function FarmOnboarding({ onReady }) {
  const [mode, setMode] = useState(null)
  const [farmName, setFarmName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate() {
    if (!farmName.trim()) return
    setBusy(true); setError(null)
    try {
      const farm = await setupFarm(farmName.trim())
      onReady(farm)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin() {
    if (!code.trim()) return
    setBusy(true); setError(null)
    try {
      const farm = await joinFarmWithCode(code.trim())
      onReady(farm)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-root auth-bg flex flex-col items-center justify-center px-6">
      <span className="text-green-400 font-bold text-2xl tracking-wide mb-8"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
        Set up your farm
      </span>
      <div className="w-full flex flex-col gap-3 auth-card" style={{ maxWidth: 320 }}>
        {!mode && (
          <>
            <button onClick={() => setMode('create')}
                    className="w-full py-4 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 transition-all">
              + Create a new farm
            </button>
            <button onClick={() => setMode('join')}
                    className="w-full py-4 rounded-xl font-semibold text-blue-400 border-2 border-blue-500 hover:bg-blue-500/10 transition-all">
              Join an existing farm
            </button>
          </>
        )}
        {mode === 'create' && (
          <>
            <input
              value={farmName}
              onChange={e => setFarmName(e.target.value)}
              placeholder="Farm name"
              autoFocus
              className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
              style={{ background: 'rgba(15,25,35,0.6)' }}
            />
            <button onClick={handleCreate} disabled={busy || !farmName.trim()}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
              {busy ? 'Creating…' : 'Create farm'}
            </button>
            <button onClick={() => { setMode(null); setError(null) }} className="text-gray-300 hover:text-white text-xs text-center transition-colors">Back</button>
          </>
        )}
        {mode === 'join' && (
          <>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Farm code (e.g. K7M3P9)"
              maxLength={6}
              autoFocus
              className="w-full rounded-lg px-4 py-3 text-white text-lg text-center tracking-widest outline-none border border-white/10 focus:border-green-500"
              style={{ background: 'rgba(15,25,35,0.6)' }}
            />
            <button onClick={handleJoin} disabled={busy || !code.trim()}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-blue-500 hover:bg-blue-400 disabled:opacity-40 transition-all">
              {busy ? 'Joining…' : 'Join farm'}
            </button>
            <button onClick={() => { setMode(null); setError(null) }} className="text-gray-300 hover:text-white text-xs text-center transition-colors">Back</button>
          </>
        )}
        {error && <div className="text-red-400 text-xs text-center">{error}</div>}
      </div>
    </div>
  )
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined) // undefined = checking, null = signed out
  const [farm, setFarm]       = useState(undefined)
  const [subOk, setSubOk]     = useState(true) // assume ok until we know otherwise
  // Supabase re-validates the session whenever the app regains visibility (e.g. unlocking the
  // phone), firing onAuthStateChange for the SAME user. Without this guard, every unlock would
  // blank farm → LoadingScreen → unmount the whole app tree underneath, wiping any in-progress
  // screen state (like Punching Mode's live GPS tracking) for no reason.
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    getSession().then(setSession)
    return onAuthStateChange(setSession)
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) { setFarm(null); stopAutoSync(); return }

    const prevUserId = localStorage.getItem('pipemaster-user-id')
    const currUserId = session.user?.id
    if (currUserId) {
      localStorage.setItem('pipemaster-user-id', currUserId)
      initPurchases(currUserId)
    }

    // Only blank the screen on a genuine first load or an actual user change — a token
    // refresh for the same already-loaded user shouldn't remount the whole app.
    const isSameUserRefresh = hasLoadedRef.current && prevUserId === currUserId
    if (!isSameUserRefresh) setFarm(undefined)

    const maybeWipe = prevUserId && currUserId && prevUserId !== currUserId
      ? clearAllTablesData().then(() => localStorage.removeItem('pipemaster-last-write-at'))
      : Promise.resolve()

    const isOAuth = session.user?.app_metadata?.provider !== 'email'
    if (isOAuth) {
      const name = session.user?.user_metadata?.full_name
        || session.user?.user_metadata?.name
        || session.user?.email
      saveProfile(name).catch(() => {})
    }

    maybeWipe.then(() => getMyFarm()).then(f => {
      setFarm(f)
      hasLoadedRef.current = true
      if (f) setSubOk(isSubActive(f))
    }).catch(() => {
      // Offline — use cached sub status with 48 hr grace
      const cached = getCachedSubAllowed()
      if (cached) {
        setSubOk(cached.allowed)
        setFarm({ code: null, role: cached.role, _offline: true })
      } else {
        setFarm(null)
      }
      hasLoadedRef.current = true
    })
  }, [session])

  useEffect(() => {
    if (farm?.code) startAutoSync(farm.code)
    return () => { if (!farm) stopAutoSync() }
  }, [farm])

  if (session === undefined) return <LoadingScreen />
  if (!session) return <AuthScreen />
  if (farm === undefined) return <LoadingScreen />
  if (!farm) return <FarmOnboarding onReady={f => { setFarm(f); setSubOk(isSubActive(f)) }} />

  if (!subOk) return (
    <SubWall farm={farm} onUnlocked={() => {
      setSubOk(true)
      setFarm(f => f ? { ...f, sub_status: 'active' } : f)
    }} />
  )

  const trialDays = (() => {
    if (farm?.sub_status !== 'trial' || !farm.trial_ends_at) return 0
    return Math.max(0, Math.ceil((new Date(farm.trial_ends_at) - Date.now()) / 86400000))
  })()

  return (
    <>
      {trialDays > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium pointer-events-none select-none"
             style={{ background: 'rgba(234,179,8,0.1)', borderBottom: '1px solid rgba(234,179,8,0.2)', color: '#fbbf24' }}>
          <span>⏳</span>
          <span>{trialDays} day{trialDays !== 1 ? 's' : ''} left in your free trial</span>
        </div>
      )}
      {children}
    </>
  )
}
