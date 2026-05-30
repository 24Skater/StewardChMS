import { useState } from 'react'

const STORAGE_KEY = 'kiosk-theme'

export function useKioskTheme(): { isDark: boolean; toggle: () => void } {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== 'light'
  })

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
  }

  return { isDark, toggle }
}
