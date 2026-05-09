import { useEffect } from 'react'

export function useHotkey(combo, handler) {
  useEffect(() => {
    const h = (e) => {
      if (combo === 'cmd+k' && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        handler()
      }
      if (combo === 'escape' && e.key === 'Escape') {
        handler()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [combo, handler])
}
