import { useState, useEffect } from 'react'
import MapHome from './components/MapHome'
import FieldModeHome from './components/FieldModeHome'
import AuthGate from './components/AuthGate'
import TutorialMode from './components/TutorialMode'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfUse from './components/TermsOfUse'

export default function App() {
  if (window.location.pathname === '/privacy') return <PrivacyPolicy />
  if (window.location.pathname === '/terms') return <TermsOfUse />

  const [mode, setMode] = useState(() => localStorage.getItem('pipemaster-mode') || 'field')
  // True on first launch — TutorialMode is inside AuthGate's children so it only
  // renders after the user is fully authenticated and their farm is set up.
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('pipemaster-intro-seen'))

  useEffect(() => {
    localStorage.setItem('pipemaster-mode', mode)
  }, [mode])

  // "View intro again" from Settings
  useEffect(() => {
    const handler = () => setShowTutorial(true)
    window.addEventListener('pipemaster:show-intro', handler)
    return () => window.removeEventListener('pipemaster:show-intro', handler)
  }, [])

  function handleTutorialDone() {
    localStorage.setItem('pipemaster-intro-seen', '1')
    setShowTutorial(false)
  }

  return (
    <AuthGate>
      <div className="app-root" style={{ position: 'relative' }}>
        {mode === 'field'
          ? <FieldModeHome onSwitchToDevMode={() => setMode('dev')} />
          : <MapHome onSwitchToFieldMode={() => setMode('field')} />
        }
        {showTutorial && (
          <TutorialMode
            onDone={handleTutorialDone}
            onSwitchToFieldMode={() => setMode('field')}
          />
        )}
      </div>
    </AuthGate>
  )
}
