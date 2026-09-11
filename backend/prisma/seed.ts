/**
 * Installation-wide reference data. Nothing here belongs to a church.
 *
 * That boundary is the whole design of this file, and it is newer than the file
 * is. Tenancy gave most models a required `orgId`, and this script runs before
 * any organization exists — so anything org-scoped written from here fails, and
 * it failed loudly: `message_templates` gained an `orgId`, the create here did
 * not supply one, and the seed died partway through, before assigning
 * permissions to the admin role and before creating the recovery account. A
 * fresh `docker compose up` reported a failed migrate job and left a database
 * half-prepared.
 *
 * What is left is what is genuinely global: permissions, roles, the mapping
 * between them, and one disabled recovery account. The per-church half moved to
 * `src/lib/org-defaults.ts`, which runs when a church is actually created —
 * from the console's provisioning call, or from the first-run wizard.
 *
 * Rule for anything added here: if a model is in `TENANTED_MODELS`
 * (`src/lib/tenancy.ts`), it does not belong in this file.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Seed account email (fixed identifier)
const SEED_ACCOUNT_EMAIL = 'seed@stewardchms.local'

// Generate a secure random password
function generateSecurePassword(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64').slice(0, length)
}

// Default permissions for the system
const DEFAULT_PERMISSIONS = [
  // Admin permissions
  { key: 'admin.access', description: 'Access admin dashboard' },
  { key: 'users.read', description: 'View users' },
  { key: 'users.write', description: 'Create and update users' },
  { key: 'users.delete', description: 'Delete users' },
  { key: 'roles.read', description: 'View roles' },
  { key: 'roles.write', description: 'Create and update roles' },
  { key: 'roles.delete', description: 'Delete roles' },
  { key: 'audit.read', description: 'View audit logs' },
  // Member CRM permissions (Phase 2)
  { key: 'members.read', description: 'View members' },
  { key: 'members.write', description: 'Create and update members' },
  { key: 'members.delete', description: 'Delete members' },
  { key: 'members.notes', description: 'View and edit member notes (sensitive)' },
  // Events permissions (Phase 3)
  { key: 'events.read', description: 'View events and occurrences' },
  { key: 'events.write', description: 'Create, update, and delete events' },
  // Worship permissions (Phase 3)
  { key: 'worship.read', description: 'View songs and worship plans' },
  { key: 'worship.write', description: 'Manage songs and worship plans' },
  // Communication permissions (Phase 4)
  { key: 'communications.view', description: 'View messages and templates' },
  { key: 'communications.send', description: 'Send messages and manage templates' },
  // Accounting + Giving permissions (Phase 5)
  { key: 'giving.view', description: 'View donations and pledges' },
  { key: 'giving.edit', description: 'Create and edit donations and pledges' },
  { key: 'accounting.view', description: 'View funds, expenses, invoices, and purchase orders' },
  { key: 'accounting.edit', description: 'Create and edit funds, expenses, invoices, and purchase orders' },
  // Reporting + Sales permissions (Phase 6)
  { key: 'reports.view', description: 'View all reports' },
  { key: 'sales.view', description: 'View sales' },
  { key: 'sales.edit', description: 'Create and void sales' },
  { key: 'inventory.view', description: 'View inventory and products' },
  { key: 'inventory.edit', description: 'Create products and adjust inventory' },
  // Groups & Ministries permissions
  { key: 'groups.view', description: 'View ministries and groups' },
  { key: 'groups.edit', description: 'Manage ministries and groups' },
  // Kids Check-in permissions
  { key: 'checkin.view', description: 'View check-in dashboard' },
  { key: 'checkin.operate', description: 'Perform check-ins/check-outs' },
  // Online giving permissions
  { key: 'giving.online.configure', description: 'Configure online giving settings' },
  // Ministry Scheduling permissions (Phase 7)
  { key: 'schedules.view', description: 'View ministry calendars and schedules' },
  { key: 'schedules.manage', description: 'Full CRUD on calendars, periods, slots, and assignments' },
]

async function main() {
  console.log('Starting seed...')

  // Check if a primary admin already exists - if so, skip seed account creation
  const primaryAdmin = await prisma.user.findFirst({
    where: { isPrimaryAdmin: true },
  })

  if (primaryAdmin) {
    console.log('Primary admin already exists. Skipping seed account creation.')
    console.log('   Only seeding permissions and roles...')
  }

  // Seed permissions (idempotent)
  console.log('Seeding permissions...')
  for (const perm of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: perm,
    })
  }
  console.log(`   [OK] ${DEFAULT_PERMISSIONS.length} permissions seeded`)

  // Seed admin role (idempotent)
  console.log('Seeding admin role...')
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { description: 'System Administrator with full access' },
    create: {
      name: 'admin',
      description: 'System Administrator with full access',
    },
  })
  console.log('   [OK] Admin role created/updated')

  // Seed Scheduler role
  console.log('Seeding scheduler role...')
  const schedulerRole = await prisma.role.upsert({
    where: { name: 'scheduler' },
    update: { description: 'Ministry Scheduler with schedule management access' },
    create: {
      name: 'scheduler',
      description: 'Ministry Scheduler with schedule management access',
    },
  })
  const schedulerPermKeys = ['schedules.view', 'schedules.manage']
  for (const key of schedulerPermKeys) {
    const perm = await prisma.permission.findUnique({ where: { key } })
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: schedulerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: schedulerRole.id, permissionId: perm.id },
      })
    }
  }
  console.log('   [OK] Scheduler role created/updated')

  // Assign all permissions to admin role
  const allPermissions = await prisma.permission.findMany()
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    })
  }
  console.log(`   [OK] ${allPermissions.length} permissions assigned to admin role`)

  // Only create seed account if no primary admin exists
  if (!primaryAdmin) {
    // Generate a secure random password for the seed account
    const seedPassword = generateSecurePassword(32)
    const passwordHash = await bcrypt.hash(seedPassword, 12)

    // Create or update seed account (DISABLED by default)
    console.log('Creating seed account (emergency recovery)...')
    await prisma.user.upsert({
      where: { email: SEED_ACCOUNT_EMAIL },
      update: {
        // If seed account exists, ensure it stays disabled and marked as seed
        isSeedAccount: true,
        // Don't update password to preserve any manual changes by primary admin
      },
      create: {
        email: SEED_ACCOUNT_EMAIL,
        name: 'Seed Account (Emergency Recovery)',
        passwordHash,
        isActive: false, // DISABLED by default - only primary admin can enable
        isSeedAccount: true,
        isPrimaryAdmin: false,
      },
    })
    console.log(`   [OK] Seed account created: ${SEED_ACCOUNT_EMAIL}`)
    console.log('   [WARN] Seed account is DISABLED by default')
    console.log('   [WARN] Only the primary admin can enable it')

    // No role is granted here, on purpose.
    //
    // A role grant belongs to an organization, and at seed time there is not
    // one yet. Granting it later is also the safer shape: the account gets
    // administrator access in the single church whose primary admin
    // deliberately enables it, through POST /api/setup/seed-account/enable,
    // and in no other.

    console.log('')
    console.log('Seed completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('   1. Run the setup wizard to create your primary admin account')
    console.log('   2. The seed account will remain disabled until needed')
    console.log('   3. Only the primary admin can enable the seed account')
  } else {
    // Log seed completion (permissions/roles only)
    console.log('')
    console.log('Seed completed successfully!')
    console.log('   Permissions and roles have been updated.')
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

