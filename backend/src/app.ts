import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import membersRouter from './routes/members.js'
import householdsRouter from './routes/households.js'

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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

export default app

