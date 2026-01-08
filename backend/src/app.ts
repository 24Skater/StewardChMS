import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
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

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))

// Body parsing - increase limit for CSV import
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

export default app

