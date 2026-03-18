import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getNotifications, getUnreadCount, markRead, markAllRead } from './notifications.controller'

export const notificationsRouter = Router()
notificationsRouter.use(authenticate)
notificationsRouter.get('/', getNotifications)
notificationsRouter.get('/unread-count', getUnreadCount)
notificationsRouter.patch('/:id/read', markRead)
notificationsRouter.patch('/read-all', markAllRead)
