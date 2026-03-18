import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getAnnouncements, createAnnouncement } from './announcements.controller'

export const announcementsRouter = Router()
announcementsRouter.use(authenticate)
announcementsRouter.get('/', getAnnouncements)
announcementsRouter.post('/', createAnnouncement)
