import { describe, it, expect } from 'vitest'
import { registry, allIconNames } from './registry'

describe('registry', () => {
  it('has 57 entries', () => {
    expect(allIconNames.length).toBe(57)
  })

  it('every IconName has an entry in the registry', () => {
    allIconNames.forEach(name => {
      expect(registry[name], `registry missing entry for "${name}"`).toBeDefined()
    })
  })

  it('every entry has an outlined function', () => {
    allIconNames.forEach(name => {
      expect(
        typeof registry[name].outlined,
        `registry["${name}"].outlined is not a function`
      ).toBe('function')
    })
  })

  it('every entry has a filled function', () => {
    allIconNames.forEach(name => {
      expect(
        typeof registry[name].filled,
        `registry["${name}"].filled is not a function`
      ).toBe('function')
    })
  })
})
