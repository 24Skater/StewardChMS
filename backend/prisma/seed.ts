import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Default permissions for the system
const DEFAULT_PERMISSIONS = [
  { key: 'admin.access', description: 'Access admin dashboard' },
  { key: 'users.read', description: 'View users' },
  { key: 'users.write', description: 'Create and update users' },
  { key: 'users.delete', description: 'Delete users' },
  { key: 'roles.read', description: 'View roles' },
  { key: 'roles.write', description: 'Create and update roles' },
  { key: 'roles.delete', description: 'Delete roles' },
  { key: 'audit.read', description: 'View audit logs' },
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

