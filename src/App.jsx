import { useState, useEffect } from 'react'
import MapHome from './components/MapHome'
import FieldModeHome from './components/FieldModeHome'
import AuthGate from './components/AuthGate'
import TutorialMode from './components/TutorialMode'
import HelpSheet from './components/HelpSheet'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfUse from './components/TermsOfUse'

export default function App() {
  if (window.location.pathname === '/privacy') return <PrivacyPolicy />
  if (window.location.pathname === '/terms') return <TermsOfUse />

  const [mode, setMode] = useState(() => localStorage.getItem('pipemaster-mode') || 'field')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('pipemaster-intro-seen'))
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    localStorage.setItem('pipemaster-mode', mode)
  }, [mode])

  useEffect(() => {
    const handler = () => setShowHelp(true)
    window.addEventListener('pipemaster:show-help', handler)
    return () => window.removeEventListener('pipemaster:show-help', handler)
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
        {showHelp && <HelpSheet onClose={() => setShowHelp(false)} />}
      </div>
    </AuthGate>
  )
}
