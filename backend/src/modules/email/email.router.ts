import { Router } from 'express'
import { handleMailgunWebhook } from './email.webhook'
import express from 'express'

export const emailRouter = Router()

// Public webhook endpoint — no auth, Mailgun signature verified internally
// Must use raw/urlencoded body parser since Mailgun sends form-encoded data
emailRouter.post('/mailgun', express.urlencoded({ extended: true }), handleMailgunWebhook)
