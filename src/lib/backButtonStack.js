import { useEffect, useRef } from 'react'
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
//
// Deliberately does NOT depend on onClose's identity — callers very often pass an inline
// arrow function, which gets a new reference on every re-render (and useLiveQuery-backed
// components re-render a lot). Keying the effect on that reference would tear down and
// re-push this entry's stack position on nearly every render, letting the relative order
// between nested layers drift and occasionally putting an outer "close everything" handler
// on top of an inner "go back one level" one. A ref keeps the callback current without ever
// touching the entry's position in the stack.
export function useBackClose(onClose, active = true) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return
    const handler = () => onCloseRef.current()
    stack.push(handler)
    return () => {
      const i = stack.indexOf(handler)
      if (i !== -1) stack.splice(i, 1)
    }
  }, [active])
}
