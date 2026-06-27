import { useState, useEffect } from 'react'
import { getSession, onAuthStateChange, signUp, signIn } from '../lib/auth'
import { getMyFarm, setupFarm, joinFarmWithCode, saveProfile } from '../lib/farms'
import { startAutoSync, stopAutoSync } from '../lib/cloudSync'

function LoadingScreen() {
  return (
    <div className="app-root flex items-center justify-center" style={{ background: '#0f1923' }}>
      <span className="text-green-400 font-bold text-xl tracking-wide">PIPEMASTER</span>
    </div>
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
  const [farm, setFarm] = useState(undefined)

  useEffect(() => {
    getSession().then(setSession)
    return onAuthStateChange(setSession)
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) { setFarm(null); stopAutoSync(); return }
    setFarm(undefined)
    getMyFarm().then(setFarm).catch(() => setFarm(null))
  }, [session])

  useEffect(() => {
    if (farm?.code) startAutoSync(farm.code)
    return () => { if (!farm) stopAutoSync() }
  }, [farm])

  if (session === undefined) return <LoadingScreen />
  if (!session) return <AuthScreen />
  if (farm === undefined) return <LoadingScreen />
  if (!farm) return <FarmOnboarding onReady={setFarm} />

  return children
}
