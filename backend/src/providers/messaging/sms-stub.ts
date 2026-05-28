/**
 * Stub SMS Provider
 * 
 * A development/testing provider that logs SMS messages to the console instead of sending them.
 * Replace with a real provider (Twilio, Vonage, etc.) for production.
 */

import type { MessageProvider, SendResult } from './index.js'

export class SmsStubProvider implements MessageProvider {
  async send(to: string, _subject: string | null, body: string): Promise<SendResult> {
    // SMS doesn't use subjects, ignore _subject parameter

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50))

    // Log the SMS for debugging
    console.log('[STUB SMS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   To: ${to}`)
    console.log(`   Message: ${body.substring(0, 160)}${body.length > 160 ? '...' : ''}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Simulate occasional failures for testing (1% chance)
    if (Math.random() < 0.01) {
      return {
        success: false,
        error: 'Simulated SMS delivery failure',
      }
    }

    return { success: true }
  }
}

