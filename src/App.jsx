import { useState, useEffect } from 'react'
import MapHome from './components/MapHome'
import FieldModeHome from './components/FieldModeHome'
import AuthGate from './components/AuthGate'

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('pipemaster-mode') || 'field')

  useEffect(() => {
    localStorage.setItem('pipemaster-mode', mode)
  }, [mode])

  return (
    <AuthGate>
      <div className="app-root">
        {mode === 'field'
          ? <FieldModeHome onSwitchToDevMode={() => setMode('dev')} />
          : <MapHome onSwitchToFieldMode={() => setMode('field')} />
        }
      </div>
    </AuthGate>
  )
}
