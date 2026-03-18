import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getNotifications, getUnreadCount, markRead, markAllRead, deleteNotification, deleteAllRead } from './notifications.controller'

export const notificationsRouter = Router()
notificationsRouter.use(authenticate)
notificationsRouter.get('/', getNotifications)
notificationsRouter.get('/unread-count', getUnreadCount)
notificationsRouter.patch('/read-all', markAllRead)
notificationsRouter.patch('/:id/read', markRead)
notificationsRouter.delete('/clear-read', deleteAllRead)
notificationsRouter.delete('/:id', deleteNotification)
