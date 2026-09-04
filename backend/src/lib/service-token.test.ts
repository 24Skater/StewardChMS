import { describe, it, expect } from 'vitest'
import { isPlatformRequest } from './service-token.js'

const TOKEN = 'stw_svc_chms_0123456789abcdef'
const env = { PLATFORM_SERVICE_TOKEN: TOKEN } as NodeJS.ProcessEnv

describe('recognising a call from the console', () => {
  it("accepts this application's own token", () => {
    expect(isPlatformRequest(`Bearer ${TOKEN}`, env)).toBe(true)
  })

  it('accepts the scheme in any case, as HTTP allows', () => {
    expect(isPlatformRequest(`bearer ${TOKEN}`, env)).toBe(true)
  })

  it("refuses another product's token", () => {
    // One secret per app is the point: a leak from VBS must not provision or
    // read anything here.
    expect(isPlatformRequest('Bearer stw_svc_vbs_0123456789abcdef', env)).toBe(false)
  })

  it('refuses a token that is merely a prefix of the real one', () => {
    expect(isPlatformRequest(`Bearer ${TOKEN.slice(0, -4)}`, env)).toBe(false)
  })

  it('refuses anything that is not a bearer token', () => {
    expect(isPlatformRequest(`Basic ${TOKEN}`, env)).toBe(false)
    expect(isPlatformRequest(TOKEN, env)).toBe(false)
    expect(isPlatformRequest(undefined, env)).toBe(false)
  })

  it('refuses every request when no token is configured', () => {
    // An app deployed without the secret should refuse platform calls, not
    // accept them and not crash on them.
    expect(isPlatformRequest(`Bearer ${TOKEN}`, {} as NodeJS.ProcessEnv)).toBe(false)
    expect(isPlatformRequest('Bearer ', {} as NodeJS.ProcessEnv)).toBe(false)
  })

  it('refuses a configured secret that belongs to another product', () => {
    // A copy-paste of Table's token into this app's environment should fail
    // closed rather than accept Table's console calls.
    const wrong = { PLATFORM_SERVICE_TOKEN: 'stw_svc_table_0123456789abcdef' } as NodeJS.ProcessEnv
    expect(isPlatformRequest('Bearer stw_svc_table_0123456789abcdef', wrong)).toBe(false)
  })
})
