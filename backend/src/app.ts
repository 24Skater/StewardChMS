import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { validateEnvironment } from './lib/security.js'
import { apiRateLimiter } from './middleware/rateLimiter.js'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import membersRouter from './routes/members.js'
import householdsRouter from './routes/households.js'
import eventsRouter from './routes/events.js'
import occurrencesRouter from './routes/occurrences.js'
import registrationsRouter from './routes/registrations.js'
import songsRouter from './routes/songs.js'
import worshipPlansRouter from './routes/worship-plans.js'
import messageTemplatesRouter from './routes/message-templates.js'
import messagesRouter from './routes/messages.js'
import optInRouter from './routes/opt-in.js'
// Phase 5: Accounting + Giving
import fundsRouter from './routes/funds.js'
import donationsRouter from './routes/donations.js'
import pledgesRouter from './routes/pledges.js'
import vendorsRouter from './routes/vendors.js'
import expensesRouter from './routes/expenses.js'
import invoicesRouter from './routes/invoices.js'
import purchaseOrdersRouter from './routes/purchase-orders.js'
import reportsRouter from './routes/reports.js'
// Phase 6: Reporting + Sales
import productsRouter from './routes/products.js'
import inventoryRouter from './routes/inventory.js'
import salesRouter from './routes/sales.js'
// Setup + Settings
import setupRouter from './routes/setup.js'
import settingsRouter, { publicSettingsRouter } from './routes/settings.js'
// Groups & Ministries
import ministriesRouter from './routes/ministries.js'
import groupsRouter from './routes/groups.js'
// Kids Check-in
import kidsCheckinRouter from './routes/kids-checkin.js'
import kioskRouter from './routes/kiosk.js'
// Online Giving
import onlineGivingRouter from './routes/online-giving.js'
// Ministry Scheduling (Phase 7)
import ministryCalendarsRouter from './routes/ministry-calendars.js'
import schedulePeriodsRouter from './routes/schedule-periods.js'
import scheduleSlotsRouter from './routes/schedule-slots.js'
import publicScheduleRouter from './routes/public-schedule.js'

// Validate environment on startup
validateEnvironment()

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))

// Cookie parser for httpOnly cookie auth
app.use(cookieParser())

// Body parsing - increase limit for CSV import
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

// Global rate limiting (more permissive)
app.use('/api', apiRateLimiter)

// Routes
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/members', membersRouter)
app.use('/api/households', householdsRouter)
// Phase 3: Events + Worship
app.use('/api/events', eventsRouter)
app.use('/api/occurrences', occurrencesRouter)
app.use('/api', registrationsRouter) // Has nested routes like /api/occurrences/:id/registrations
app.use('/api/songs', songsRouter)
app.use('/api', worshipPlansRouter) // Has nested routes like /api/occurrences/:id/worship-plan
// Phase 4: Communications
app.use('/api/message-templates', messageTemplatesRouter)
app.use('/api/messages', messagesRouter)
app.use('/api', optInRouter) // Has nested routes like /api/members/:id/opt-in
// Phase 5: Accounting + Giving
app.use('/api/funds', fundsRouter)
app.use('/api/donations', donationsRouter)
app.use('/api/pledges', pledgesRouter)
app.use('/api/vendors', vendorsRouter)
app.use('/api/expenses', expensesRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/purchase-orders', purchaseOrdersRouter)
app.use('/api/reports', reportsRouter)
// Phase 6: Reporting + Sales
app.use('/api/products', productsRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/sales', salesRouter)

// Setup + Settings (no auth required for setup)
app.use('/api/setup', setupRouter)
app.use('/api/settings', publicSettingsRouter) // Public branding endpoint
app.use('/api/settings', settingsRouter) // Protected settings

// Groups & Ministries
app.use('/api/ministries', ministriesRouter)
app.use('/api/groups', groupsRouter)

// Kids Check-in
app.use('/api/kids-checkin', kidsCheckinRouter)

// Kiosk token management
app.use('/api/kiosk', kioskRouter)

// Online Giving (public routes + admin routes)
app.use('/api/online-giving', onlineGivingRouter)

// Ministry Scheduling (Phase 7)
app.use('/api/ministry-calendars', ministryCalendarsRouter)
app.use('/api/ministry-calendars/:calendarId/periods', schedulePeriodsRouter)
app.use('/api/schedule-slots', scheduleSlotsRouter)
// Public kiosk schedule (no auth)
app.use('/public/schedule', publicScheduleRouter)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

export default app
