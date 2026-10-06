import { lazy, Suspense, useEffect, useState } from 'react'

const HostScreen = lazy(() => import('./screens/HostScreen').then((module) => ({ default: module.HostScreen })))
const DisplayScreen = lazy(() => import('./screens/DisplayScreen').then((module) => ({ default: module.DisplayScreen })))

export function App() {
  const route = useHashRoute()
  return (
    <Suspense fallback={<div className="boot">Lighting the lanterns…</div>}>
      {route === 'display' ? <DisplayScreen /> : <HostScreen />}
    </Suspense>
  )
}

function useHashRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => {
    if (!location.hash) location.hash = '#/host'
    const onChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

function readRoute() {
  return location.hash.startsWith('#/display') ? 'display' : 'host'
}
