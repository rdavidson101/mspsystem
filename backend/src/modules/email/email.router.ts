import { Router } from 'express'
import { handleMailgunWebhook } from './email.webhook'
import multer from 'multer'

export const emailRouter = Router()

// Mailgun inbound routes send multipart/form-data — use multer to parse it
// Also accepts urlencoded as a fallback (e.g. for test POSTs)
const upload = multer()

// Public webhook endpoint — no auth, Mailgun signature verified internally
emailRouter.post('/mailgun', upload.none(), handleMailgunWebhook)
