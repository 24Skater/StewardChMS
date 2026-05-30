/**
 * Demo data seeder — generates realistic church data for click-through testing.
 * Safe to re-run: skips if demo data already exists.
 * Pass --reset to wipe and recreate all non-auth demo data.
 *
 * Run: DATABASE_URL=... npx tsx prisma/seed-demo.ts [--reset]
 */

import {
  DeliveryStatus,
  InventoryTransactionType,
  InvoiceStatus,
  MemberStatus,
  MessageChannel,
  PaymentMethod,
  PledgeStatus,
  Prisma,
  PrismaClient,
  PurchaseOrderStatus,
  RelationshipType,
  SaleStatus,
} from '@prisma/client'

const prisma = new PrismaClient()
const DEMO_GUARD_EMAIL = 'james.johnson@example.com'

// ─── helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(10, 0, 0, 0)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(10, 0, 0, 0)
  return d
}

function sunday(weeksAgo: number): Date {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day - weeksAgo * 7)
  d.setHours(10, 30, 0, 0)
  return d
}

function sundayEnd(weeksAgo: number): Date {
  const d = sunday(weeksAgo)
  d.setHours(12, 0, 0, 0)
  return d
}

// ─── clear ──────────────────────────────────────────────────────────────────

async function clearDemoData() {
  await prisma.saleItem.deleteMany({})
  await prisma.sale.deleteMany({})
  await prisma.inventoryTransaction.deleteMany({})
  await prisma.product.deleteMany({})
  await prisma.purchaseOrderItem.deleteMany({})
  await prisma.purchaseOrder.deleteMany({})
  await prisma.invoiceItem.deleteMany({})
  await prisma.invoice.deleteMany({})
  await prisma.expense.deleteMany({})
  await prisma.vendor.deleteMany({})
  await prisma.donation.deleteMany({})
  await prisma.pledge.deleteMany({})
  await prisma.fund.deleteMany({})
  await prisma.messageRecipient.deleteMany({})
  await prisma.message.deleteMany({})
  await prisma.messageTemplate.deleteMany({})
  await prisma.optInPreference.deleteMany({})
  await prisma.worshipPlanItem.deleteMany({})
  await prisma.worshipPlan.deleteMany({})
  await prisma.registration.deleteMany({})
  await prisma.checkIn.deleteMany({})
  await prisma.eventOccurrence.deleteMany({})
  await prisma.event.deleteMany({})
  await prisma.song.deleteMany({})
  await prisma.groupMember.deleteMany({})
  await prisma.groupLeader.deleteMany({})
  await prisma.group.deleteMany({})
  await prisma.ministry.deleteMany({})
  await prisma.householdMember.deleteMany({})
  await prisma.household.deleteMany({})
  await prisma.member.deleteMany({})
  console.log('   Demo data cleared.')
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const reset = process.argv.includes('--reset')
  const existing = await prisma.member.findUnique({ where: { email: DEMO_GUARD_EMAIL } })

  if (existing && !reset) {
    console.log('Demo data already seeded. Run with --reset to recreate.')
    return
  }

  if (existing && reset) {
    console.log('Resetting demo data...')
    await clearDemoData()
  }

  const admin = await prisma.user.findFirstOrThrow({ where: { isPrimaryAdmin: true } })
  console.log(`Using admin: ${admin.email}`)

  // ── members ────────────────────────────────────────────────────────────────
  console.log('Creating members...')

  const members = await Promise.all([
    // Johnson family
    prisma.member.create({ data: { firstName: 'James', lastName: 'Johnson', email: 'james.johnson@example.com', phone: '(555) 201-1001', street: '142 Maple Drive', city: 'Springfield', state: 'TX', zip: '75201', dateOfBirth: new Date('1978-03-15'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@example.com', phone: '(555) 201-1002', street: '142 Maple Drive', city: 'Springfield', state: 'TX', zip: '75201', dateOfBirth: new Date('1980-07-22'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Ethan', lastName: 'Johnson', isChild: true, securityCode: 'JOH001', dateOfBirth: new Date('2014-05-10'), status: MemberStatus.active, allergies: 'Peanuts', parentalNotes: 'Dad picks up only' } }),
    prisma.member.create({ data: { firstName: 'Emma', lastName: 'Johnson', isChild: true, securityCode: 'JOH002', dateOfBirth: new Date('2017-09-03'), status: MemberStatus.active } }),
    // Smith family
    prisma.member.create({ data: { firstName: 'Michael', lastName: 'Smith', email: 'michael.smith@example.com', phone: '(555) 202-2001', street: '87 Oak Lane', city: 'Springfield', state: 'TX', zip: '75202', dateOfBirth: new Date('1975-11-08'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Jennifer', lastName: 'Smith', email: 'jennifer.smith@example.com', phone: '(555) 202-2002', street: '87 Oak Lane', city: 'Springfield', state: 'TX', zip: '75202', dateOfBirth: new Date('1977-04-14'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Liam', lastName: 'Smith', isChild: true, securityCode: 'SMI001', dateOfBirth: new Date('2012-01-25'), status: MemberStatus.active } }),
    // Martinez family
    prisma.member.create({ data: { firstName: 'Carlos', lastName: 'Martinez', email: 'carlos.martinez@example.com', phone: '(555) 203-3001', street: '310 Elm Street', city: 'Springfield', state: 'TX', zip: '75203', dateOfBirth: new Date('1982-06-30'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Maria', lastName: 'Martinez', email: 'maria.martinez@example.com', phone: '(555) 203-3002', dateOfBirth: new Date('1984-12-18'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Olivia', lastName: 'Martinez', isChild: true, securityCode: 'MAR001', dateOfBirth: new Date('2015-08-07'), status: MemberStatus.active, medicalNotes: 'EpiPen in bag - bee allergy' } }),
    // Williams family
    prisma.member.create({ data: { firstName: 'David', lastName: 'Williams', email: 'david.williams@example.com', phone: '(555) 204-4001', street: '55 Pine Avenue', city: 'Springfield', state: 'TX', zip: '75204', dateOfBirth: new Date('1970-02-19'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Lisa', lastName: 'Williams', email: 'lisa.williams@example.com', phone: '(555) 204-4002', dateOfBirth: new Date('1972-09-25'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Noah', lastName: 'Williams', isChild: true, securityCode: 'WIL001', dateOfBirth: new Date('2016-03-12'), status: MemberStatus.active } }),
    // Brown family
    prisma.member.create({ data: { firstName: 'Robert', lastName: 'Brown', email: 'robert.brown@example.com', phone: '(555) 205-5001', street: '221 Cedar Road', city: 'Springfield', state: 'TX', zip: '75205', dateOfBirth: new Date('1965-07-04'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Patricia', lastName: 'Brown', email: 'patricia.brown@example.com', phone: '(555) 205-5002', dateOfBirth: new Date('1967-11-30'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Sophia', lastName: 'Brown', isChild: true, securityCode: 'BRO001', dateOfBirth: new Date('2013-06-21'), status: MemberStatus.active } }),
    // Davis family (inactive)
    prisma.member.create({ data: { firstName: 'Thomas', lastName: 'Davis', email: 'thomas.davis@example.com', phone: '(555) 206-6001', street: '408 Birch Blvd', city: 'Springfield', state: 'TX', zip: '75206', dateOfBirth: new Date('1955-04-17'), status: MemberStatus.inactive } }),
    prisma.member.create({ data: { firstName: 'Nancy', lastName: 'Davis', email: 'nancy.davis@example.com', phone: '(555) 206-6002', dateOfBirth: new Date('1958-08-29'), status: MemberStatus.inactive } }),
    // Wilson family (visitors)
    prisma.member.create({ data: { firstName: 'Kevin', lastName: 'Wilson', email: 'kevin.wilson@example.com', phone: '(555) 207-7001', status: MemberStatus.visitor } }),
    prisma.member.create({ data: { firstName: 'Amanda', lastName: 'Wilson', email: 'amanda.wilson@example.com', status: MemberStatus.visitor } }),
    // Taylor family
    prisma.member.create({ data: { firstName: 'Christopher', lastName: 'Taylor', email: 'christopher.taylor@example.com', phone: '(555) 208-8001', street: '900 Willow Court', city: 'Springfield', state: 'TX', zip: '75208', dateOfBirth: new Date('1988-01-11'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Jessica', lastName: 'Taylor', email: 'jessica.taylor@example.com', phone: '(555) 208-8002', dateOfBirth: new Date('1990-05-27'), status: MemberStatus.active } }),
    prisma.member.create({ data: { firstName: 'Ava', lastName: 'Taylor', isChild: true, securityCode: 'TAY001', dateOfBirth: new Date('2018-10-15'), status: MemberStatus.active } }),
    // Pastor
    prisma.member.create({ data: { firstName: 'Emmanuel', lastName: 'Okafor', email: 'pastor.okafor@example.com', phone: '(555) 200-0001', street: '1 Church Way', city: 'Springfield', state: 'TX', zip: '75200', dateOfBirth: new Date('1968-09-05'), status: MemberStatus.active, notes: 'Senior Pastor' } }),
    // Worship leader
    prisma.member.create({ data: { firstName: 'Grace', lastName: 'Chen', email: 'grace.chen@example.com', phone: '(555) 200-0002', dateOfBirth: new Date('1991-03-18'), status: MemberStatus.active, notes: 'Worship Leader' } }),
  ])

  const [james, sarah, ethan, emma, michael, jennifer, liam, carlos, maria, olivia,
    david, lisa, noah, robert, patricia, sophia, thomas, nancy, kevin, amanda,
    christopher, jessica, ava, pastor, grace] = members

  console.log(`   ${members.length} members created`)

  // ── households ─────────────────────────────────────────────────────────────
  console.log('Creating households...')

  const householdDefs = [
    { name: 'Johnson Family', members: [{ m: james, r: RelationshipType.parent }, { m: sarah, r: RelationshipType.spouse }, { m: ethan, r: RelationshipType.child }, { m: emma, r: RelationshipType.child }] },
    { name: 'Smith Family', members: [{ m: michael, r: RelationshipType.parent }, { m: jennifer, r: RelationshipType.spouse }, { m: liam, r: RelationshipType.child }] },
    { name: 'Martinez Family', members: [{ m: carlos, r: RelationshipType.parent }, { m: maria, r: RelationshipType.spouse }, { m: olivia, r: RelationshipType.child }] },
    { name: 'Williams Family', members: [{ m: david, r: RelationshipType.parent }, { m: lisa, r: RelationshipType.spouse }, { m: noah, r: RelationshipType.child }] },
    { name: 'Brown Family', members: [{ m: robert, r: RelationshipType.parent }, { m: patricia, r: RelationshipType.spouse }, { m: sophia, r: RelationshipType.child }] },
    { name: 'Davis Family', members: [{ m: thomas, r: RelationshipType.parent }, { m: nancy, r: RelationshipType.spouse }] },
    { name: 'Wilson Family', members: [{ m: kevin, r: RelationshipType.parent }, { m: amanda, r: RelationshipType.spouse }] },
    { name: 'Taylor Family', members: [{ m: christopher, r: RelationshipType.parent }, { m: jessica, r: RelationshipType.spouse }, { m: ava, r: RelationshipType.child }] },
  ]

  for (const hh of householdDefs) {
    const household = await prisma.household.create({ data: { name: hh.name } })
    for (const { m, r } of hh.members) {
      await prisma.householdMember.create({ data: { householdId: household.id, memberId: m.id, relationshipType: r } })
    }
  }
  console.log('   8 households created')

  // ── ministries & groups ────────────────────────────────────────────────────
  console.log('Creating ministries and groups...')

  const [worshipMin, youthMin, outreachMin, kidsMin] = await Promise.all([
    prisma.ministry.create({ data: { name: 'Worship Ministry', description: 'Music and worship arts team', isActive: true } }),
    prisma.ministry.create({ data: { name: 'Youth Ministry', description: 'Teens and young adults (13–25)', isActive: true } }),
    prisma.ministry.create({ data: { name: 'Outreach Ministry', description: 'Community service and evangelism', isActive: true } }),
    prisma.ministry.create({ data: { name: "Children's Ministry", description: 'Nursery through 6th grade', isActive: true } }),
  ])

  const [worshipTeam, mensBible, womensFellowship, youthGroup, outreachTeam, kidsSunday] = await Promise.all([
    prisma.group.create({ data: { name: 'Worship Team', ministryId: worshipMin.id, description: 'Sunday service musicians and vocalists', meetingDay: 'Friday', meetingTime: '7:00 PM', location: 'Sanctuary', capacity: 20 } }),
    prisma.group.create({ data: { name: "Men's Bible Study", ministryId: worshipMin.id, description: 'Weekly men\'s study and fellowship', meetingDay: 'Tuesday', meetingTime: '7:00 PM', location: 'Room 102', capacity: 30 } }),
    prisma.group.create({ data: { name: "Women's Fellowship", ministryId: worshipMin.id, description: 'Thursday morning women\'s group', meetingDay: 'Thursday', meetingTime: '10:00 AM', location: 'Fellowship Hall', capacity: 40 } }),
    prisma.group.create({ data: { name: 'Youth Group', ministryId: youthMin.id, description: 'Friday night youth gathering', meetingDay: 'Friday', meetingTime: '6:00 PM', location: 'Youth Room', capacity: 50 } }),
    prisma.group.create({ data: { name: 'Neighborhood Outreach Team', ministryId: outreachMin.id, description: 'Saturday community service', meetingDay: 'Saturday', meetingTime: '9:00 AM', location: 'Parking Lot', capacity: 25 } }),
    prisma.group.create({ data: { name: 'Kids Sunday School', ministryId: kidsMin.id, description: 'Pre-K through 6th grade Sunday School', meetingDay: 'Sunday', meetingTime: '9:00 AM', location: 'Children\'s Wing', capacity: 60 } }),
  ])

  // Group memberships
  const groupMemberData = [
    { g: worshipTeam, mems: [grace, james, sarah], leaders: [grace] },
    { g: mensBible, mems: [james, michael, carlos, david, robert, christopher, pastor], leaders: [pastor] },
    { g: womensFellowship, mems: [sarah, jennifer, maria, lisa, patricia, jessica], leaders: [sarah] },
    { g: youthGroup, mems: [liam, christopher, jessica], leaders: [christopher] },
    { g: outreachTeam, mems: [carlos, maria, david, kevin, amanda], leaders: [carlos] },
    { g: kidsSunday, mems: [jennifer, patricia], leaders: [jennifer] },
  ]

  for (const { g, mems, leaders } of groupMemberData) {
    for (const m of mems) {
      await prisma.groupMember.create({ data: { groupId: g.id, memberId: m.id } })
    }
    for (const m of leaders) {
      await prisma.groupLeader.create({ data: { groupId: g.id, memberId: m.id, role: 'leader' } })
    }
  }
  console.log('   4 ministries, 6 groups created')

  // ── songs ──────────────────────────────────────────────────────────────────
  console.log('Creating songs...')

  const songs = await Promise.all([
    prisma.song.create({ data: { title: 'Great Is Thy Faithfulness', artist: 'Thomas Chisholm', defaultKey: 'D', bpm: 72, lyrics: 'Great is Thy faithfulness, O God my Father...' } }),
    prisma.song.create({ data: { title: 'How Great Is Our God', artist: 'Chris Tomlin', defaultKey: 'C', bpm: 68, lyrics: 'The splendor of the King, clothed in majesty...' } }),
    prisma.song.create({ data: { title: '10,000 Reasons (Bless the Lord)', artist: 'Matt Redman', defaultKey: 'G', bpm: 73, lyrics: 'Bless the Lord, O my soul, O my soul...' } }),
    prisma.song.create({ data: { title: 'Oceans (Where Feet May Fail)', artist: 'Hillsong United', defaultKey: 'D', bpm: 72, lyrics: 'You call me out upon the waters...' } }),
    prisma.song.create({ data: { title: 'In Christ Alone', artist: 'Keith & Kristyn Getty', defaultKey: 'A', bpm: 76, lyrics: 'In Christ alone my hope is found...' } }),
    prisma.song.create({ data: { title: 'Amazing Grace (My Chains Are Gone)', artist: 'Chris Tomlin', defaultKey: 'G', bpm: 68, lyrics: 'Amazing grace, how sweet the sound...' } }),
    prisma.song.create({ data: { title: 'Build My Life', artist: 'Pat Barrett', defaultKey: 'E', bpm: 72, lyrics: 'Worthy of every song we could ever sing...' } }),
    prisma.song.create({ data: { title: 'Way Maker', artist: 'Sinach', defaultKey: 'E', bpm: 84, lyrics: 'You are here, moving in our midst...' } }),
    prisma.song.create({ data: { title: 'Holy Spirit', artist: 'Francesca Battistelli', defaultKey: 'G', bpm: 72, lyrics: 'There\'s nothing worth more that could ever come close...' } }),
    prisma.song.create({ data: { title: 'Lord I Need You', artist: 'Matt Maher', defaultKey: 'C', bpm: 80, lyrics: 'Lord I come, I confess...' } }),
    prisma.song.create({ data: { title: 'Blessed Be Your Name', artist: 'Matt Redman', defaultKey: 'A', bpm: 118, lyrics: 'Blessed be Your name in the land that is plentiful...' } }),
    prisma.song.create({ data: { title: 'Goodness of God', artist: 'Bethel Music', defaultKey: 'E', bpm: 73, lyrics: 'I love You Lord, oh Your mercy never fails me...' } }),
  ])

  console.log(`   ${songs.length} songs created`)

  // ── events ─────────────────────────────────────────────────────────────────
  console.log('Creating events and occurrences...')

  const sundayService = await prisma.event.create({
    data: { title: 'Sunday Morning Worship', description: 'Weekly corporate worship service', location: 'Main Sanctuary', category: 'Worship', isRecurring: true, recurrenceRule: 'FREQ=WEEKLY;BYDAY=SU' },
  })

  const bibleStudy = await prisma.event.create({
    data: { title: 'Wednesday Evening Bible Study', description: 'Midweek scripture study and prayer', location: 'Fellowship Hall', category: 'Education', isRecurring: true, recurrenceRule: 'FREQ=WEEKLY;BYDAY=WE' },
  })

  const youthNight = await prisma.event.create({
    data: { title: 'Youth Friday Night', description: 'Games, worship, and devotional for teens', location: 'Youth Room', category: 'Youth', isRecurring: true, recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR' },
  })

  const fundraiserDinner = await prisma.event.create({
    data: { title: 'Annual Spring Fundraiser Dinner', description: 'Annual fundraiser to support missions and building fund. Catered dinner with live music.', location: 'Fellowship Hall', category: 'Fundraising', startDatetime: daysAgo(21), endDatetime: daysAgo(21) },
  })

  const vbs = await prisma.event.create({
    data: { title: "Vacation Bible School 2026", description: "Week-long VBS for children ages 4–12. Theme: 'Heroes of the Faith'", location: "Children's Wing", category: 'Children', startDatetime: daysFromNow(14), endDatetime: daysFromNow(18) },
  })

  // Sunday service occurrences: 8 past + 2 future
  const sundayOccurrences = await Promise.all([
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(8), endsAt: sundayEnd(8) } }),
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(7), endsAt: sundayEnd(7) } }),
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(6), endsAt: sundayEnd(6) } }),
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(5), endsAt: sundayEnd(5) } }),
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(4), endsAt: sundayEnd(4) } }),
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(3), endsAt: sundayEnd(3) } }),
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(2), endsAt: sundayEnd(2) } }),
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(1), endsAt: sundayEnd(1) } }),
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(-1), endsAt: sundayEnd(-1) } }),
    prisma.eventOccurrence.create({ data: { eventId: sundayService.id, startsAt: sunday(-2), endsAt: sundayEnd(-2) } }),
  ])

  // Bible study: 4 past
  const bibleOccurrences = await Promise.all([
    prisma.eventOccurrence.create({ data: { eventId: bibleStudy.id, startsAt: daysAgo(24), endsAt: daysAgo(24) } }),
    prisma.eventOccurrence.create({ data: { eventId: bibleStudy.id, startsAt: daysAgo(17), endsAt: daysAgo(17) } }),
    prisma.eventOccurrence.create({ data: { eventId: bibleStudy.id, startsAt: daysAgo(10), endsAt: daysAgo(10) } }),
    prisma.eventOccurrence.create({ data: { eventId: bibleStudy.id, startsAt: daysAgo(3), endsAt: daysAgo(3) } }),
  ])

  // Youth night: 4 past
  const youthOccurrences = await Promise.all([
    prisma.eventOccurrence.create({ data: { eventId: youthNight.id, startsAt: daysAgo(22), endsAt: daysAgo(22) } }),
    prisma.eventOccurrence.create({ data: { eventId: youthNight.id, startsAt: daysAgo(15), endsAt: daysAgo(15) } }),
    prisma.eventOccurrence.create({ data: { eventId: youthNight.id, startsAt: daysAgo(8), endsAt: daysAgo(8) } }),
    prisma.eventOccurrence.create({ data: { eventId: youthNight.id, startsAt: daysAgo(1), endsAt: daysAgo(1) } }),
  ])

  // Fundraiser: single occurrence
  const fundraiserOcc = await prisma.eventOccurrence.create({
    data: { eventId: fundraiserDinner.id, startsAt: daysAgo(21), endsAt: daysAgo(21) },
  })

  // VBS: future single occurrence
  const vbsOcc = await prisma.eventOccurrence.create({
    data: { eventId: vbs.id, startsAt: daysFromNow(14), endsAt: daysFromNow(18) },
  })

  // Registrations for fundraiser
  const fundraiserAttendees = [james, sarah, michael, jennifer, carlos, maria, david, lisa, robert, patricia, kevin, amanda, christopher, jessica]
  for (const m of fundraiserAttendees) {
    await prisma.registration.create({ data: { eventOccurrenceId: fundraiserOcc.id, memberId: m.id, partySize: 1 } })
  }

  // Registrations for VBS
  const vbsKids = [ethan, emma, liam, olivia, noah, sophia, ava]
  for (const child of vbsKids) {
    await prisma.registration.create({ data: { eventOccurrenceId: vbsOcc.id, memberId: child.id, partySize: 1 } })
  }

  // Check-ins: past 3 Sunday services
  const recentSundays = sundayOccurrences.slice(5, 8)
  const adultAttendees = [james, sarah, michael, jennifer, carlos, maria, david, lisa, robert, patricia, christopher, jessica, pastor, grace]
  for (const occ of recentSundays) {
    for (const m of adultAttendees) {
      await prisma.checkIn.create({ data: { eventOccurrenceId: occ.id, memberId: m.id, checkedInAt: occ.startsAt, method: 'manual' } })
    }
    for (const child of [ethan, emma, liam, olivia, noah]) {
      await prisma.checkIn.create({ data: { eventOccurrenceId: occ.id, memberId: child.id, checkedInAt: occ.startsAt, method: 'kiosk', checkedOutAt: sundayEnd(1) } })
    }
  }

  console.log(`   5 events, ${sundayOccurrences.length + bibleOccurrences.length + youthOccurrences.length + 2} occurrences, check-ins for 3 Sundays`)

  // ── worship plans ──────────────────────────────────────────────────────────
  console.log('Creating worship plans...')

  const songSets = [
    [songs[6], songs[1], songs[0], songs[11]],  // Build My Life, How Great, Great Faithfulness, Goodness of God
    [songs[7], songs[2], songs[4], songs[5]],   // Way Maker, 10k Reasons, In Christ Alone, Amazing Grace
    [songs[8], songs[3], songs[9], songs[10]],  // Holy Spirit, Oceans, Lord I Need You, Blessed Be
    [songs[1], songs[11], songs[5], songs[0]],  // How Great, Goodness of God, Amazing Grace, Great Faithfulness
  ]

  for (let i = 0; i < 4; i++) {
    const occ = sundayOccurrences[i + 4]
    const plan = await prisma.worshipPlan.create({
      data: { eventOccurrenceId: occ.id, title: `Sunday Service Plan — Week ${i + 1}`, notes: 'Standard Sunday order of service' },
    })
    const set = songSets[i % songSets.length]
    await prisma.worshipPlanItem.create({ data: { worshipPlanId: plan.id, sortOrder: 1, itemType: 'announcement', title: 'Welcome & Announcements', assignedMemberId: pastor.id, durationMinutes: 5 } })
    for (let j = 0; j < set.length; j++) {
      await prisma.worshipPlanItem.create({ data: { worshipPlanId: plan.id, sortOrder: j + 2, itemType: 'song', title: set[j].title, songId: set[j].id, assignedMemberId: grace.id, durationMinutes: 5 } })
    }
    await prisma.worshipPlanItem.create({ data: { worshipPlanId: plan.id, sortOrder: 7, itemType: 'sermon', title: 'Sermon', assignedMemberId: pastor.id, durationMinutes: 35 } })
    await prisma.worshipPlanItem.create({ data: { worshipPlanId: plan.id, sortOrder: 8, itemType: 'offering', title: 'Tithes & Offering', durationMinutes: 5 } })
    await prisma.worshipPlanItem.create({ data: { worshipPlanId: plan.id, sortOrder: 9, itemType: 'song', title: set[0].title, songId: set[0].id, assignedMemberId: grace.id, durationMinutes: 5 } })
    await prisma.worshipPlanItem.create({ data: { worshipPlanId: plan.id, sortOrder: 10, itemType: 'benediction', title: 'Closing Prayer & Benediction', assignedMemberId: pastor.id, durationMinutes: 5 } })
  }
  console.log('   4 worship plans created')

  // ── funds ──────────────────────────────────────────────────────────────────
  console.log('Creating funds...')

  const [generalFund, buildingFund, missionsFund, youthFund] = await Promise.all([
    prisma.fund.create({ data: { name: 'General Fund', description: 'Unrestricted general operating fund for church expenses', isRestricted: false, isActive: true } }),
    prisma.fund.create({ data: { name: 'Building Fund', description: 'Restricted fund for facilities, maintenance, and expansion', isRestricted: true, isActive: true } }),
    prisma.fund.create({ data: { name: 'Missions & Outreach Fund', description: 'Support for local and international missions', isRestricted: true, isActive: true } }),
    prisma.fund.create({ data: { name: 'Youth Ministry Fund', description: 'Retreats, events, and resources for youth ministry', isRestricted: true, isActive: true } }),
  ])
  console.log('   4 funds created')

  // ── donations ──────────────────────────────────────────────────────────────
  console.log('Creating donations...')

  const donationData = [
    // Regular weekly tithers
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(84) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(77) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(70) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(63) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(56) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(49) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(42) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(35) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(28) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(21) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(14) },
    { memberId: james.id, amountCents: 25000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(7) },
    // Michael - online giver
    { memberId: michael.id, amountCents: 15000, method: PaymentMethod.online, fundId: generalFund.id, receivedAt: daysAgo(80), isOnline: true },
    { memberId: michael.id, amountCents: 15000, method: PaymentMethod.online, fundId: generalFund.id, receivedAt: daysAgo(52), isOnline: true },
    { memberId: michael.id, amountCents: 15000, method: PaymentMethod.online, fundId: generalFund.id, receivedAt: daysAgo(24), isOnline: true },
    // Robert - large building fund donor
    { memberId: robert.id, amountCents: 100000, method: PaymentMethod.check, fundId: buildingFund.id, receivedAt: daysAgo(60), note: 'Building campaign pledge payment' },
    { memberId: robert.id, amountCents: 100000, method: PaymentMethod.check, fundId: buildingFund.id, receivedAt: daysAgo(30), note: 'Building campaign pledge payment' },
    { memberId: robert.id, amountCents: 50000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(7) },
    // Carlos - missions supporter
    { memberId: carlos.id, amountCents: 10000, method: PaymentMethod.cash, fundId: missionsFund.id, receivedAt: daysAgo(45) },
    { memberId: carlos.id, amountCents: 10000, method: PaymentMethod.cash, fundId: missionsFund.id, receivedAt: daysAgo(15) },
    // David
    { memberId: david.id, amountCents: 20000, method: PaymentMethod.card, fundId: generalFund.id, receivedAt: daysAgo(50) },
    { memberId: david.id, amountCents: 20000, method: PaymentMethod.card, fundId: generalFund.id, receivedAt: daysAgo(20) },
    // Sarah - youth fund
    { memberId: sarah.id, amountCents: 5000, method: PaymentMethod.cash, fundId: youthFund.id, receivedAt: daysAgo(30) },
    // Jennifer
    { memberId: jennifer.id, amountCents: 8000, method: PaymentMethod.online, fundId: generalFund.id, receivedAt: daysAgo(40), isOnline: true },
    // Patricia
    { memberId: patricia.id, amountCents: 12000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(35) },
    // Guest donation from fundraiser
    { guestName: 'Anonymous Donor', guestEmail: 'anon@example.com', amountCents: 50000, method: PaymentMethod.cash, fundId: buildingFund.id, receivedAt: daysAgo(21), note: 'Fundraiser dinner cash donation' },
    // Christopher
    { memberId: christopher.id, amountCents: 7500, method: PaymentMethod.online, fundId: generalFund.id, receivedAt: daysAgo(28), isOnline: true },
    // Jessica - youth
    { memberId: jessica.id, amountCents: 2500, method: PaymentMethod.cash, fundId: youthFund.id, receivedAt: daysAgo(14) },
    // Grace
    { memberId: grace.id, amountCents: 6000, method: PaymentMethod.check, fundId: generalFund.id, receivedAt: daysAgo(10) },
    // Visitor - Kevin (one-time)
    { memberId: kevin.id, amountCents: 2000, method: PaymentMethod.cash, fundId: generalFund.id, receivedAt: daysAgo(7) },
  ]

  for (const d of donationData) {
    await prisma.donation.create({ data: { ...d, currency: 'USD' } as Prisma.DonationCreateInput })
  }
  console.log(`   ${donationData.length} donations created`)

  // ── pledges ─────────────────────────────────────────────────────────────────
  console.log('Creating pledges...')

  await Promise.all([
    prisma.pledge.create({ data: { memberId: james.id, fundId: generalFund.id, amountCents: 130000, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), status: PledgeStatus.active } }),
    prisma.pledge.create({ data: { memberId: robert.id, fundId: buildingFund.id, amountCents: 500000, startDate: new Date('2026-01-01'), endDate: new Date('2027-12-31'), status: PledgeStatus.active } }),
    prisma.pledge.create({ data: { memberId: michael.id, fundId: generalFund.id, amountCents: 60000, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), status: PledgeStatus.active } }),
    prisma.pledge.create({ data: { memberId: david.id, fundId: generalFund.id, amountCents: 120000, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), status: PledgeStatus.active } }),
    prisma.pledge.create({ data: { memberId: carlos.id, fundId: missionsFund.id, amountCents: 36000, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), status: PledgeStatus.active } }),
    prisma.pledge.create({ data: { memberId: thomas.id, fundId: generalFund.id, amountCents: 24000, startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), status: PledgeStatus.completed } }),
  ])
  console.log('   6 pledges created')

  // ── vendors ─────────────────────────────────────────────────────────────────
  console.log('Creating vendors...')

  const [soundVendor, coffeeVendor, officeVendor, printVendor, techVendor] = await Promise.all([
    prisma.vendor.create({ data: { name: 'City Sound & Light', email: 'contact@citysoundlight.com', phone: '(555) 300-1000', street: '500 Industrial Pkwy', city: 'Springfield', state: 'TX', zip: '75300' } }),
    prisma.vendor.create({ data: { name: 'Cornerstone Coffee Co.', email: 'orders@cornerstonecoffee.com', phone: '(555) 300-2000', street: '88 Roaster Lane', city: 'Springfield', state: 'TX', zip: '75301' } }),
    prisma.vendor.create({ data: { name: 'Office Pro Supply', email: 'sales@officeprosupply.com', phone: '(555) 300-3000', street: '1200 Commerce Blvd', city: 'Springfield', state: 'TX', zip: '75302' } }),
    prisma.vendor.create({ data: { name: 'Faithful Print Shop', email: 'print@faithfulprint.com', phone: '(555) 300-4000', street: '45 Gutenberg Way', city: 'Springfield', state: 'TX', zip: '75303' } }),
    prisma.vendor.create({ data: { name: 'Tech Solutions Group', email: 'support@techsolutionsgroup.com', phone: '(555) 300-5000', street: '900 Data Center Dr', city: 'Springfield', state: 'TX', zip: '75304' } }),
  ])
  console.log('   5 vendors created')

  // ── expenses ─────────────────────────────────────────────────────────────────
  console.log('Creating expenses...')

  const expensesData = [
    { vendorId: soundVendor.id, fundId: generalFund.id, amountCents: 85000, expenseDate: daysAgo(75), category: 'AV Equipment', note: 'Wireless microphone system replacement' },
    { vendorId: coffeeVendor.id, fundId: generalFund.id, amountCents: 12000, expenseDate: daysAgo(60), category: 'Hospitality', note: 'Monthly coffee & tea supply' },
    { vendorId: officeVendor.id, fundId: generalFund.id, amountCents: 8500, expenseDate: daysAgo(55), category: 'Office Supplies', note: 'Paper, toner, folders Q1' },
    { vendorId: printVendor.id, fundId: generalFund.id, amountCents: 22000, expenseDate: daysAgo(45), category: 'Printing', note: 'Sunday bulletins — 3 month supply' },
    { vendorId: techVendor.id, fundId: generalFund.id, amountCents: 45000, expenseDate: daysAgo(40), category: 'IT Services', note: 'Annual website hosting & domain renewal' },
    { vendorId: coffeeVendor.id, fundId: generalFund.id, amountCents: 12000, expenseDate: daysAgo(30), category: 'Hospitality', note: 'Monthly coffee & tea supply' },
    { vendorId: soundVendor.id, fundId: buildingFund.id, amountCents: 150000, expenseDate: daysAgo(25), category: 'AV Equipment', note: 'Sanctuary projector upgrade' },
    { vendorId: officeVendor.id, fundId: generalFund.id, amountCents: 3500, expenseDate: daysAgo(20), category: 'Office Supplies', note: 'Printer paper restock' },
    { vendorId: printVendor.id, fundId: youthFund.id, amountCents: 7500, expenseDate: daysAgo(12), category: 'Printing', note: 'Youth retreat promotional flyers' },
    { vendorId: coffeeVendor.id, fundId: generalFund.id, amountCents: 12000, expenseDate: daysAgo(1), category: 'Hospitality', note: 'Monthly coffee & tea supply' },
  ]

  for (const e of expensesData) {
    await prisma.expense.create({ data: { ...e, currency: 'USD' } })
  }
  console.log(`   ${expensesData.length} expenses created`)

  // ── invoices ─────────────────────────────────────────────────────────────────
  console.log('Creating invoices...')

  const inv1 = await prisma.invoice.create({
    data: { invoiceNumber: 'INV-2026-001', vendorId: soundVendor.id, billToName: 'Grace Community Church', issueDate: daysAgo(60), dueDate: daysAgo(30), status: InvoiceStatus.paid, subtotalCents: 85000, taxCents: 7013, totalCents: 92013, note: 'Wireless microphone system' },
  })
  await prisma.invoiceItem.createMany({ data: [
    { invoiceId: inv1.id, description: 'Shure SM58 Wireless Mic System (x2)', quantity: 2, unitPriceCents: 32500, lineTotalCents: 65000, sortOrder: 1 },
    { invoiceId: inv1.id, description: 'Mic Stand Clip Adapters (x4)', quantity: 4, unitPriceCents: 2500, lineTotalCents: 10000, sortOrder: 2 },
    { invoiceId: inv1.id, description: 'AA Batteries 24-pack (x5)', quantity: 5, unitPriceCents: 2000, lineTotalCents: 10000, sortOrder: 3 },
  ]})

  const inv2 = await prisma.invoice.create({
    data: { invoiceNumber: 'INV-2026-002', vendorId: techVendor.id, billToName: 'Grace Community Church', issueDate: daysAgo(40), dueDate: daysAgo(10), status: InvoiceStatus.paid, subtotalCents: 45000, taxCents: 3713, totalCents: 48713, note: 'Annual hosting & support' },
  })
  await prisma.invoiceItem.createMany({ data: [
    { invoiceId: inv2.id, description: 'Website Hosting — Annual', quantity: 1, unitPriceCents: 24000, lineTotalCents: 24000, sortOrder: 1 },
    { invoiceId: inv2.id, description: 'Domain Renewal (2 years)', quantity: 2, unitPriceCents: 1500, lineTotalCents: 3000, sortOrder: 2 },
    { invoiceId: inv2.id, description: 'IT Support Contract — Monthly (x6)', quantity: 6, unitPriceCents: 3000, lineTotalCents: 18000, sortOrder: 3 },
  ]})

  const inv3 = await prisma.invoice.create({
    data: { invoiceNumber: 'INV-2026-003', vendorId: soundVendor.id, billToName: 'Grace Community Church', issueDate: daysAgo(25), dueDate: daysFromNow(5), status: InvoiceStatus.sent, subtotalCents: 150000, taxCents: 12375, totalCents: 162375, note: 'Sanctuary projector upgrade — payment due' },
  })
  await prisma.invoiceItem.createMany({ data: [
    { invoiceId: inv3.id, description: 'Epson 4K Laser Projector', quantity: 1, unitPriceCents: 120000, lineTotalCents: 120000, sortOrder: 1 },
    { invoiceId: inv3.id, description: 'Ceiling Mount & Installation', quantity: 1, unitPriceCents: 25000, lineTotalCents: 25000, sortOrder: 2 },
    { invoiceId: inv3.id, description: 'HDMI Cable (20ft, x2)', quantity: 2, unitPriceCents: 2500, lineTotalCents: 5000, sortOrder: 3 },
  ]})

  const inv4 = await prisma.invoice.create({
    data: { invoiceNumber: 'INV-2026-004', vendorId: printVendor.id, billToName: 'Grace Community Church', issueDate: daysAgo(5), dueDate: daysFromNow(25), status: InvoiceStatus.draft, subtotalCents: 29000, taxCents: 2393, totalCents: 31393, note: 'Spring newsletter and VBS materials' },
  })
  await prisma.invoiceItem.createMany({ data: [
    { invoiceId: inv4.id, description: 'Church Newsletter (500 copies, full color)', quantity: 500, unitPriceCents: 45, lineTotalCents: 22500, sortOrder: 1 },
    { invoiceId: inv4.id, description: 'VBS Registration Flyers (200 copies)', quantity: 200, unitPriceCents: 32, lineTotalCents: 6500, sortOrder: 2 },
  ]})

  console.log('   4 invoices created')

  // ── purchase orders ────────────────────────────────────────────────────────
  console.log('Creating purchase orders...')

  const po1 = await prisma.purchaseOrder.create({
    data: { poNumber: 'PO-2026-001', vendorId: officeVendor.id, requestorUserId: admin.id, issueDate: daysAgo(50), status: PurchaseOrderStatus.closed, subtotalCents: 8500, taxCents: 701, totalCents: 9201, note: 'Q1 office supply order' },
  })
  await prisma.purchaseOrderItem.createMany({ data: [
    { purchaseOrderId: po1.id, description: 'Copy Paper (Case of 10 reams)', quantity: 5, unitPriceCents: 600, lineTotalCents: 3000, sortOrder: 1 },
    { purchaseOrderId: po1.id, description: 'HP 26A Toner Cartridge', quantity: 2, unitPriceCents: 1500, lineTotalCents: 3000, sortOrder: 2 },
    { purchaseOrderId: po1.id, description: 'Hanging File Folders (25-pack)', quantity: 5, unitPriceCents: 500, lineTotalCents: 2500, sortOrder: 3 },
  ]})

  const po2 = await prisma.purchaseOrder.create({
    data: { poNumber: 'PO-2026-002', vendorId: soundVendor.id, requestorUserId: admin.id, issueDate: daysAgo(30), status: PurchaseOrderStatus.approved, subtotalCents: 150000, taxCents: 12375, totalCents: 162375, note: 'Projector upgrade — approved by board' },
  })
  await prisma.purchaseOrderItem.createMany({ data: [
    { purchaseOrderId: po2.id, description: 'Epson 4K Laser Projector', quantity: 1, unitPriceCents: 120000, lineTotalCents: 120000, sortOrder: 1 },
    { purchaseOrderId: po2.id, description: 'Ceiling Mount & Installation', quantity: 1, unitPriceCents: 25000, lineTotalCents: 25000, sortOrder: 2 },
    { purchaseOrderId: po2.id, description: 'HDMI Cable (20ft, x2)', quantity: 2, unitPriceCents: 2500, lineTotalCents: 5000, sortOrder: 3 },
  ]})

  const po3 = await prisma.purchaseOrder.create({
    data: { poNumber: 'PO-2026-003', vendorId: coffeeVendor.id, requestorUserId: admin.id, issueDate: daysAgo(5), status: PurchaseOrderStatus.submitted, subtotalCents: 14400, taxCents: 1188, totalCents: 15588, note: 'Q2 hospitality supply — pending approval' },
  })
  await prisma.purchaseOrderItem.createMany({ data: [
    { purchaseOrderId: po3.id, description: 'Medium Roast Coffee (5lb bag, x6)', quantity: 6, unitPriceCents: 1800, lineTotalCents: 10800, sortOrder: 1 },
    { purchaseOrderId: po3.id, description: 'Herbal Tea Variety Pack (120ct)', quantity: 6, unitPriceCents: 600, lineTotalCents: 3600, sortOrder: 2 },
  ]})

  const po4 = await prisma.purchaseOrder.create({
    data: { poNumber: 'PO-2026-004', vendorId: printVendor.id, requestorUserId: admin.id, issueDate: daysAgo(1), status: PurchaseOrderStatus.draft, subtotalCents: 29000, taxCents: 2393, totalCents: 31393, note: 'VBS and newsletter printing — draft' },
  })
  await prisma.purchaseOrderItem.createMany({ data: [
    { purchaseOrderId: po4.id, description: 'Church Newsletter (500 copies, full color)', quantity: 500, unitPriceCents: 45, lineTotalCents: 22500, sortOrder: 1 },
    { purchaseOrderId: po4.id, description: 'VBS Registration Flyers (200 copies)', quantity: 200, unitPriceCents: 32, lineTotalCents: 6500, sortOrder: 2 },
  ]})

  console.log('   4 purchase orders created')

  // ── products & inventory ───────────────────────────────────────────────────
  console.log('Creating products and inventory...')

  const [cookbook, youthShirt, journal, mug, workbook, envelopes, vbsShirt, directory] = await Promise.all([
    prisma.product.create({ data: { name: 'Church Cookbook — "Recipes for the Table"', sku: 'BOOK-001', priceCents: 1800, description: 'Community cookbook compiled from congregation recipes', isActive: true } }),
    prisma.product.create({ data: { name: 'Youth Retreat T-Shirt (2026)', sku: 'SHIRT-YTH-001', priceCents: 2200, description: 'Official 2026 Youth Retreat T-Shirt', isActive: true } }),
    prisma.product.create({ data: { name: 'Devotional Journal', sku: 'BOOK-002', priceCents: 1500, description: '90-day devotional journal with guided scripture readings', isActive: true } }),
    prisma.product.create({ data: { name: 'Church Coffee Mug', sku: 'MUG-001', priceCents: 1200, description: 'Ceramic mug with church logo', isActive: true } }),
    prisma.product.create({ data: { name: '"Growing in Faith" Bible Study Workbook', sku: 'BOOK-003', priceCents: 1000, description: '12-week Bible study workbook for small groups', isActive: true } }),
    prisma.product.create({ data: { name: 'Offering Envelope Box (100ct)', sku: 'ENV-001', priceCents: 800, description: 'Box of 100 numbered giving envelopes', isActive: true } }),
    prisma.product.create({ data: { name: 'Kids VBS T-Shirt (2026)', sku: 'SHIRT-VBS-001', priceCents: 1400, description: 'VBS 2026 "Heroes of the Faith" T-Shirt (Youth sizes)', isActive: true } }),
    prisma.product.create({ data: { name: '2026 Church Directory', sku: 'DIR-2026', priceCents: 500, description: 'Printed church membership directory', isActive: true } }),
  ])

  const inventoryStocks = [
    { productId: cookbook.id, quantity: 50 },
    { productId: youthShirt.id, quantity: 75 },
    { productId: journal.id, quantity: 100 },
    { productId: mug.id, quantity: 60 },
    { productId: workbook.id, quantity: 80 },
    { productId: envelopes.id, quantity: 40 },
    { productId: vbsShirt.id, quantity: 90 },
    { productId: directory.id, quantity: 150 },
  ]

  for (const { productId, quantity } of inventoryStocks) {
    await prisma.inventoryTransaction.create({
      data: { productId, type: InventoryTransactionType.purchase, quantityDelta: quantity, note: 'Initial stock', createdAt: daysAgo(30) },
    })
  }
  console.log(`   8 products, ${inventoryStocks.length} inventory transactions created`)

  // ── sales ──────────────────────────────────────────────────────────────────
  console.log('Creating sales...')

  const saleRecords = [
    { saleNumber: 'SALE-2026-001', memberId: sarah.id, soldAt: daysAgo(28), items: [{ product: cookbook, qty: 2 }, { product: mug, qty: 1 }] },
    { saleNumber: 'SALE-2026-002', memberId: jennifer.id, soldAt: daysAgo(25), items: [{ product: journal, qty: 1 }, { product: workbook, qty: 2 }] },
    { saleNumber: 'SALE-2026-003', memberId: maria.id, soldAt: daysAgo(21), items: [{ product: cookbook, qty: 1 }] },
    { saleNumber: 'SALE-2026-004', memberId: lisa.id, soldAt: daysAgo(18), items: [{ product: mug, qty: 2 }, { product: directory, qty: 1 }] },
    { saleNumber: 'SALE-2026-005', memberId: carlos.id, soldAt: daysAgo(15), items: [{ product: envelopes, qty: 1 }, { product: workbook, qty: 3 }] },
    { saleNumber: 'SALE-2026-006', memberId: james.id, soldAt: daysAgo(12), items: [{ product: youthShirt, qty: 2 }, { product: vbsShirt, qty: 2 }] },
    { saleNumber: 'SALE-2026-007', memberId: patricia.id, soldAt: daysAgo(10), items: [{ product: journal, qty: 1 }, { product: cookbook, qty: 1 }] },
    { saleNumber: 'SALE-2026-008', memberId: christopher.id, soldAt: daysAgo(7), items: [{ product: youthShirt, qty: 1 }] },
    { saleNumber: 'SALE-2026-009', memberId: jessica.id, soldAt: daysAgo(4), items: [{ product: vbsShirt, qty: 3 }, { product: directory, qty: 1 }] },
    { saleNumber: 'SALE-2026-010', guestName: 'Walk-in Customer', soldAt: daysAgo(2), items: [{ product: cookbook, qty: 1 }, { product: mug, qty: 1 }] },
  ]

  for (const s of saleRecords) {
    const subtotal = s.items.reduce((sum, i) => sum + i.product.priceCents * i.qty, 0)
    const sale = await prisma.sale.create({
      data: {
        saleNumber: s.saleNumber,
        memberId: s.memberId ?? null,
        guestName: s.guestName ?? null,
        status: SaleStatus.completed,
        subtotalCents: subtotal,
        taxCents: 0,
        totalCents: subtotal,
        soldAt: s.soldAt,
        createdByUserId: admin.id,
      },
    })
    for (let idx = 0; idx < s.items.length; idx++) {
      const { product: p, qty } = s.items[idx]
      await prisma.saleItem.create({
        data: { saleId: sale.id, productId: p.id, quantity: qty, unitPriceCents: p.priceCents, lineTotalCents: p.priceCents * qty, sortOrder: idx + 1 },
      })
      await prisma.inventoryTransaction.create({
        data: { productId: p.id, type: InventoryTransactionType.sale, quantityDelta: -qty, note: `Sale ${s.saleNumber}`, createdAt: s.soldAt },
      })
    }
  }
  console.log(`   ${saleRecords.length} sales created`)

  // ── message templates ──────────────────────────────────────────────────────
  console.log('Creating message templates...')

  await prisma.messageTemplate.createMany({
    data: [
      { name: 'Welcome New Member', channel: MessageChannel.email, subject: 'Welcome to Grace Community Church!', body: 'Dear {{firstName}},\n\nWelcome to our church family! We are so glad you have joined us...' },
      { name: 'Event Reminder', channel: MessageChannel.email, subject: 'Reminder: {{eventName}} is coming up!', body: 'Hi {{firstName}},\n\nJust a friendly reminder that {{eventName}} is scheduled for {{eventDate}}...' },
      { name: 'Event Reminder (SMS)', channel: MessageChannel.sms, body: 'Hi {{firstName}}! Reminder: {{eventName}} on {{eventDate}}. See you there! - Grace Community Church' },
      { name: 'Giving Statement', channel: MessageChannel.email, subject: 'Your Giving Statement for {{year}}', body: 'Dear {{firstName}},\n\nThank you for your faithful generosity this year. Your total giving: {{totalGiving}}...' },
      { name: 'Prayer Request Follow-up', channel: MessageChannel.email, subject: 'Following up on your prayer request', body: 'Dear {{firstName}},\n\nWe wanted to let you know that our prayer team has been lifting your request in prayer...' },
    ],
  })
  console.log('   5 message templates created')

  // ── messages ───────────────────────────────────────────────────────────────
  console.log('Creating messages...')

  const welcomeMsg = await prisma.message.create({
    data: { channel: MessageChannel.email, subject: 'Welcome to Grace Community Church!', body: 'Dear Kevin and Amanda,\n\nWelcome to our church family! We noticed you visited us recently and wanted to reach out personally. We would love to connect with you and answer any questions you might have.\n\nBlessings,\nPastor Emmanuel Okafor', createdByUserId: admin.id },
  })
  await Promise.all([
    prisma.messageRecipient.create({ data: { messageId: welcomeMsg.id, memberId: kevin.id, deliveryStatus: DeliveryStatus.sent, deliveredAt: daysAgo(14) } }),
    prisma.messageRecipient.create({ data: { messageId: welcomeMsg.id, memberId: amanda.id, deliveryStatus: DeliveryStatus.sent, deliveredAt: daysAgo(14) } }),
  ])

  const fundraiserMsg = await prisma.message.create({
    data: { channel: MessageChannel.email, subject: 'Annual Spring Fundraiser Dinner — Thank You!', body: 'Dear Friends,\n\nThank you for your incredible generosity at our Annual Spring Fundraiser Dinner last week! Together we raised over $2,500 for our missions and building funds. Your support makes a real difference.\n\nGrace & Peace,\nPastor Emmanuel', createdByUserId: admin.id },
  })
  const fundraiserRecipients = [james, sarah, michael, jennifer, carlos, maria, david, lisa, robert, patricia]
  for (const m of fundraiserRecipients) {
    await prisma.messageRecipient.create({ data: { messageId: fundraiserMsg.id, memberId: m.id, deliveryStatus: DeliveryStatus.sent, deliveredAt: daysAgo(18) } })
  }

  const vbsMsg = await prisma.message.create({
    data: { channel: MessageChannel.sms, body: 'VBS 2026 "Heroes of the Faith" starts in 2 weeks! Register your kids at the welcome desk or online. Questions? Call the church office. - Grace Community Church', createdByUserId: admin.id },
  })
  const vbsParents = [james, sarah, michael, jennifer, carlos, maria, david, lisa, robert, patricia, christopher, jessica]
  for (const m of vbsParents) {
    await prisma.messageRecipient.create({ data: { messageId: vbsMsg.id, memberId: m.id, deliveryStatus: DeliveryStatus.sent, deliveredAt: daysAgo(3) } })
  }
  console.log('   3 messages created (welcome, fundraiser thank-you, VBS SMS)')

  // ── opt-in preferences ─────────────────────────────────────────────────────
  const activeAdults = [james, sarah, michael, jennifer, carlos, maria, david, lisa, robert, patricia, christopher, jessica, pastor, grace]
  for (const m of activeAdults) {
    await prisma.optInPreference.createMany({
      data: [
        { memberId: m.id, channel: MessageChannel.email, isOptedIn: true },
        { memberId: m.id, channel: MessageChannel.sms, isOptedIn: m.phone != null },
      ],
    })
  }
  // Visitors opted in for email only
  for (const m of [kevin, amanda]) {
    await prisma.optInPreference.create({ data: { memberId: m.id, channel: MessageChannel.email, isOptedIn: true } })
    await prisma.optInPreference.create({ data: { memberId: m.id, channel: MessageChannel.sms, isOptedIn: false } })
  }

  // ── organization settings ──────────────────────────────────────────────
  console.log('Creating organization settings...')
  const orgSettings = [
    { key: 'name',                   value: 'Grace Community Church' },
    { key: 'legalName',              value: 'Grace Community Church, Inc.' },
    { key: 'ein',                    value: '47-1234567' },
    { key: 'street',                 value: '100 Church Street' },
    { key: 'city',                   value: 'Springfield' },
    { key: 'state',                  value: 'TX' },
    { key: 'zip',                    value: '75200' },
    { key: 'phone',                  value: '(555) 200-0100' },
    { key: 'email',                  value: 'office@gracecommunitychurch.org' },
    { key: 'website',                value: 'www.gracecommunitychurch.org' },
    { key: 'taxExemptStatus',        value: '501(c)(3)' },
    { key: 'authorizedOfficerName',  value: 'Emmanuel Okafor' },
    { key: 'authorizedOfficerTitle', value: 'Senior Pastor' },
  ]
  for (const s of orgSettings) {
    await prisma.setting.upsert({
      where: { category_key: { category: 'organization', key: s.key } },
      update: { value: s.value },
      create: { category: 'organization', key: s.key, value: s.value },
    })
  }
  console.log(`   ${orgSettings.length} organization settings seeded`)

  console.log('')
  console.log('Demo data seeded successfully!')
  console.log('  Members:          25 (17 adults, 7 children, 1 visitor couple)')
  console.log('  Households:       8')
  console.log('  Ministries:       4  |  Groups: 6')
  console.log('  Events:           5  |  Occurrences: 18')
  console.log('  Songs:            12 |  Worship plans: 4')
  console.log('  Funds:            4  |  Donations: 30  |  Pledges: 6')
  console.log('  Vendors:          5  |  Expenses: 10')
  console.log('  Invoices:         4  |  Purchase Orders: 4')
  console.log('  Products:         8  |  Sales: 10')
  console.log('  Message Templates:5  |  Messages: 3')
  console.log('  Org Settings:     13 (name, EIN, address, pastor)')
}

main()
  .catch((e) => { console.error('Demo seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
