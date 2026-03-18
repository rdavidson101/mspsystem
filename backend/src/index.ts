import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
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
import { errorHandler } from './middleware/errorHandler'

const app = express()
const httpServer = createServer(app)

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }))
app.use(morgan('dev'))
app.use(express.json())
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

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))
app.use(errorHandler)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id))
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
