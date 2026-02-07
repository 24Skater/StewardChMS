import { Prisma } from '@prisma/client'
import prisma from './prisma.js'

interface AuditLogData {
  actorUserId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Prisma.InputJsonValue
}

/**
 * Safely creates an audit log entry. Errors are caught and logged
 * but don't fail the main operation. This is useful for test environments
 * where fake user IDs may be used in tokens.
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata ?? {},
      },
    })
  } catch (error) {
    // Log the error but don't fail the main operation
    // This handles cases where the actorUserId doesn't exist in the database
    // (e.g., in test environments with fake tokens)
    console.error('Failed to create audit log:', error)
  }
}
