import prisma from './prisma.js'
import { requireOrgId, runInOrg } from './org-context.js'

/**
 * The rows a church needs before its first page renders.
 *
 * There are two places an organization comes into existence — the console's
 * `POST /api/internal/provision` on the platform, and the first-run wizard on a
 * self-hosted box — and both need exactly this. Keeping it in one module is
 * what stops the two paths from drifting into two different definitions of a
 * new church.
 *
 * It is also where the per-church half of the old global seed ended up. Before
 * tenancy, `prisma/seed.ts` created message templates once for the whole
 * installation. Once `MessageTemplate` gained a required `orgId` that stopped
 * being possible — there is no organization at seed time — and the seed failed
 * outright, taking the rest of the seed down with it. Templates belong to a
 * church, so they are created when a church is.
 */

/** Settings written at creation, so no screen has to cope with a missing row. */
export function defaultSettings(
  organizationName: string
): { category: string; key: string; value: unknown }[] {
  return [
    { category: 'branding', key: 'church_name', value: organizationName },
    { category: 'church', key: 'name', value: organizationName },
    { category: 'system', key: 'setup_complete', value: true },
  ]
}

/**
 * The scheduling notifications every church starts with.
 *
 * Editable afterwards — these are a starting point, not a contract. A church
 * with none of them has a scheduling feature that silently sends nothing.
 */
export const DEFAULT_MESSAGE_TEMPLATES = [
  {
    name: 'schedule.assigned',
    channel: 'email' as const,
    subject: 'You have been scheduled',
    body: 'Hi {name}, you are scheduled for {duty} on {date} at {church_name}.',
  },
  {
    name: 'schedule.reminder',
    channel: 'email' as const,
    subject: 'Upcoming duty reminder',
    body: 'Reminder: you are scheduled for {duty} in {days} day(s) at {church_name}.',
  },
]

/**
 * Create everything a new organization needs, inside that organization.
 *
 * Idempotent by name and by setting key, because the console retries
 * provisioning with backoff and a retry must change nothing. The reads are
 * organization-scoped by the guard, so "does this church already have one" is
 * the question being asked, not "does anyone".
 *
 * `settings` is optional: the self-hosted wizard writes its own as the operator
 * fills the form in, and overwriting those with placeholders would undo work
 * the person just did.
 */
export async function seedOrgDefaults(
  orgId: string,
  organizationName: string,
  options: { settings?: boolean } = {}
): Promise<void> {
  const withSettings = options.settings ?? true

  await runInOrg({ orgId, slug: '' }, async () => {
    if (withSettings) {
      for (const setting of defaultSettings(organizationName)) {
        await prisma.setting.upsert({
          where: {
            org_category_key: { orgId, category: setting.category, key: setting.key },
          },
          update: {},
          create: {
            orgId: requireOrgId(),
            category: setting.category,
            key: setting.key,
            value: setting.value as never,
          },
        })
      }
    }

    for (const template of DEFAULT_MESSAGE_TEMPLATES) {
      const existing = await prisma.messageTemplate.findFirst({ where: { name: template.name } })
      if (existing) continue

      await prisma.messageTemplate.create({
        data: {
          orgId: requireOrgId(),
          name: template.name,
          channel: template.channel,
          subject: template.subject,
          body: template.body,
        },
      })
    }
  })
}
