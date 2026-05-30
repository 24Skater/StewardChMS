import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKioskTheme } from './useKioskTheme'

describe('useKioskTheme', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to dark when localStorage is empty', () => {
    const { result } = renderHook(() => useKioskTheme())
    expect(result.current.isDark).toBe(true)
  })

  it('reads light preference from localStorage', () => {
    localStorage.setItem('kiosk-theme', 'light')
    const { result } = renderHook(() => useKioskTheme())
    expect(result.current.isDark).toBe(false)
  })

  it('reads dark preference from localStorage', () => {
    localStorage.setItem('kiosk-theme', 'dark')
    const { result } = renderHook(() => useKioskTheme())
    expect(result.current.isDark).toBe(true)
  })

  it('toggles from dark to light', () => {
    const { result } = renderHook(() => useKioskTheme())
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(false)
  })

  it('toggles from light to dark', () => {
    localStorage.setItem('kiosk-theme', 'light')
    const { result } = renderHook(() => useKioskTheme())
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(true)
  })

  it('persists light preference to localStorage after toggle', () => {
    const { result } = renderHook(() => useKioskTheme())
    act(() => result.current.toggle())
    expect(localStorage.getItem('kiosk-theme')).toBe('light')
  })

  it('persists dark preference to localStorage after toggle', () => {
    localStorage.setItem('kiosk-theme', 'light')
    const { result } = renderHook(() => useKioskTheme())
    act(() => result.current.toggle())
    expect(localStorage.getItem('kiosk-theme')).toBe('dark')
  })
})
