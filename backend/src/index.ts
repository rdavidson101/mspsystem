import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { authRouter } from './modules/auth/auth.router'
import { usersRouter } from './modules/users/users.router'
import { companiesRouter } from './modules/crm/companies/companies.router'
import { contactsRouter } from './modules/crm/contacts/contacts.router'
import { leadsRouter } from './modules/crm/leads/leads.router'
import { ticketsRouter } from './modules/tickets/tickets.router'
import { projectsRouter } from './modules/projects/projects.router'
import { tasksRouter } from './modules/tasks/tasks.router'
import { timeEntriesRouter } from './modules/time/time.router'
import { contractsRouter } from './modules/contracts/contracts.router'
import { invoicesRouter } from './modules/invoices/invoices.router'
import { expensesRouter } from './modules/expenses/expenses.router'
import { todosRouter } from './modules/todos/todos.router'
import { dashboardRouter } from './modules/dashboard/dashboard.router'
import { announcementsRouter } from './modules/announcements/announcements.router'
import { categoriesRouter } from './modules/categories/categories.router'
import { macrosRouter } from './modules/macros/macros.router'
import { slaRouter } from './modules/sla/sla.router'
import { notificationsRouter } from './modules/notifications/notifications.router'
import { inventoryRouter } from './modules/inventory/inventory.router'
import { changesRouter } from './modules/changes/changes.router'
import { templatesRouter } from './modules/templates/templates.router'
import { settingsRouter } from './modules/settings/settings.router'
import { teamsRouter } from './modules/teams/teams.router'
import { productsRouter } from './modules/products/products.router'
import { emailRouter } from './modules/email/email.router'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const httpServer = createServer(app)

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})

app.use(helmet({
  contentSecurityPolicy: false, // disabled because frontend is served separately
  crossOriginEmbedderPolicy: false,
}))

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
})
app.use('/api/', apiLimiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/2fa/verify', authLimiter)
app.use('/api/auth/2fa/enable', authLimiter)

app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGIN || 'http://localhost:3000'
    const allowedOrigins = allowed.split(',').map(o => o.trim())
    // Allow no-origin requests (same-origin, mobile apps, curl in dev)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/companies', companiesRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/tickets', ticketsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/time-entries', timeEntriesRouter)
app.use('/api/contracts', contractsRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/expenses', expensesRouter)
app.use('/api/todos', todosRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/announcements', announcementsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/macros', macrosRouter)
app.use('/api/sla', slaRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/changes', changesRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/teams', teamsRouter)
app.use('/api/products', productsRouter)
app.use('/api/webhooks', emailRouter)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))
app.use(errorHandler)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id))
})

// Validate required secrets at startup
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET']
for (const envVar of requiredEnvVars) {
  const val = process.env[envVar]
  if (!val || val.length < 32) {
    console.error(`FATAL: ${envVar} must be set and at least 32 characters long`)
    process.exit(1)
  }
}

if (!process.env.MAILGUN_WEBHOOK_SECRET || process.env.MAILGUN_WEBHOOK_SECRET === 'dev-secret-change-me') {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: MAILGUN_WEBHOOK_SECRET must be set in production')
    process.exit(1)
  } else {
    console.warn('WARNING: MAILGUN_WEBHOOK_SECRET is not set — using insecure default')
  }
}

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

