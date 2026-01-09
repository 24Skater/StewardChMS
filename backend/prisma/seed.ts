import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
]

async function main() {
  console.log('🌱 Starting seed...')

  // Get admin credentials from environment
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@stewardchms.local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const adminName = process.env.ADMIN_NAME || 'System Administrator'

  // Seed permissions (idempotent)
  console.log('📋 Seeding permissions...')
  for (const perm of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: perm,
    })
  }
  console.log(`   ✓ ${DEFAULT_PERMISSIONS.length} permissions seeded`)

  // Seed admin role (idempotent)
  console.log('👤 Seeding admin role...')
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { description: 'System Administrator with full access' },
    create: {
      name: 'admin',
      description: 'System Administrator with full access',
    },
  })
  console.log('   ✓ Admin role created/updated')

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
  console.log(`   ✓ ${allPermissions.length} permissions assigned to admin role`)

  // Seed admin user (idempotent)
  console.log('🔐 Seeding admin user...')
  const passwordHash = await bcrypt.hash(adminPassword, 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      // Don't update password on existing user to preserve manual changes
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      isActive: true,
    },
  })
  console.log(`   ✓ Admin user created/updated: ${adminEmail}`)

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  })
  console.log('   ✓ Admin role assigned to admin user')

  // Log seed completion
  await prisma.auditLog.create({
    data: {
      action: 'SEED_COMPLETED',
      entityType: 'System',
      metadata: {
        permissions: DEFAULT_PERMISSIONS.length,
        adminEmail,
        timestamp: new Date().toISOString(),
      },
    },
  })

  console.log('')
  console.log('✅ Seed completed successfully!')
  console.log('')
  console.log('📝 Admin credentials:')
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Password: ${adminPassword}`)
  console.log('')
  console.log('⚠️  Please change the admin password after first login!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

