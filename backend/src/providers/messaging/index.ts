/**
 * Messaging Provider Abstraction
 * 
 * This module provides a simple interface for sending messages via different channels.
 * Currently uses stub providers that log messages to the console.
 * 
 * To add real providers (SendGrid, Twilio, etc.):
 * 1. Create a new provider file (e.g., sendgrid.ts)
 * 2. Implement the MessageProvider interface
 * 3. Update getEmailProvider/getSmsProvider to return the real provider based on env config
 */

export interface SendResult {
  success: boolean
  error?: string
}

export interface MessageProvider {
  /**
   * Send a message to a recipient
   * @param to - The recipient's email or phone number
   * @param subject - The message subject (for email) or null (for SMS)
   * @param body - The message content
   */
  send(to: string, subject: string | null, body: string): Promise<SendResult>
}

import { EmailStubProvider } from './email-stub.js'
import { SmsStubProvider } from './sms-stub.js'

// Singleton instances
let emailProvider: MessageProvider | null = null
let smsProvider: MessageProvider | null = null

/**
 * Get the email provider instance
 * Currently returns the stub provider; swap for real provider in production
 */
export function getEmailProvider(): MessageProvider {
  if (!emailProvider) {
    // TODO: Check env for real provider config (e.g., SENDGRID_API_KEY)
    // if (process.env.SENDGRID_API_KEY) {
    //   emailProvider = new SendGridProvider(process.env.SENDGRID_API_KEY)
    // } else {
    emailProvider = new EmailStubProvider()
    // }
  }
  return emailProvider
}

/**
 * Get the SMS provider instance
 * Currently returns the stub provider; swap for real provider in production
 */
export function getSmsProvider(): MessageProvider {
  if (!smsProvider) {
    // TODO: Check env for real provider config (e.g., TWILIO_ACCOUNT_SID)
    // if (process.env.TWILIO_ACCOUNT_SID) {
    //   smsProvider = new TwilioProvider(...)
    // } else {
    smsProvider = new SmsStubProvider()
    // }
  }
  return smsProvider
}

/**
 * Get the appropriate provider for a channel
 */
export function getProviderForChannel(channel: 'email' | 'sms'): MessageProvider {
  return channel === 'email' ? getEmailProvider() : getSmsProvider()
}

// Type aliases for Prisma enums
export type MessageChannel = 'email' | 'sms'
export type DeliveryStatus = 'pending' | 'sent' | 'failed'

