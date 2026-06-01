/**
 * Stub Email Provider
 * 
 * A development/testing provider that logs emails to the console instead of sending them.
 * Replace with a real provider (SendGrid, Postmark, etc.) for production.
 */

import type { MessageProvider, SendResult } from './index.js'

export class EmailStubProvider implements MessageProvider {
  async send(to: string, subject: string | null, body: string): Promise<SendResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Log the email for debugging
    console.log('[STUB EMAIL] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   To:      ${to}`)
    console.log(`   Subject: ${subject || '(no subject)'}`)
    console.log('')
    body.split('\n').forEach(line => console.log(`   ${line}`))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Simulate occasional failures for testing (1% chance)
    if (Math.random() < 0.01) {
      return {
        success: false,
        error: 'Simulated email delivery failure',
      }
    }

    return { success: true }
  }
}

