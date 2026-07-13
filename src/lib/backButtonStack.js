import { useEffect } from 'react'
import { App } from '@capacitor/app'

// A single global Android back-button listener, fed by a stack of "close the topmost thing"
// callbacks that sheets/modals/overlays register while they're open. Without this, Capacitor's
// default behavior is to exit the whole app on back press whenever there's no WebView history
// to go back through — which is always, since this is a single-page app with no URL routing.
const stack = []
let listenerRegistered = false

export function initBackButtonHandler() {
  if (listenerRegistered) return
  listenerRegistered = true
  App.addListener('backButton', () => {
    if (stack.length > 0) {
      stack[stack.length - 1]()
    } else {
      App.minimizeApp().catch(() => {})
    }
  })
}

// Registers onClose as the action for the next back-button press while active is true —
// call from any modal/sheet/overlay's own effect. Nesting order is a real stack: the most
// recently opened layer closes first.
export function useBackClose(onClose, active = true) {
  useEffect(() => {
    if (!active) return
    stack.push(onClose)
    return () => {
      const i = stack.indexOf(onClose)
      if (i !== -1) stack.splice(i, 1)
    }
  }, [onClose, active])
}
