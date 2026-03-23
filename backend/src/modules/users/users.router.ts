import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { getUsers, getUser, createUser, updateUser, deleteUser, resetUserMfa } from './users.controller'

export const usersRouter = Router()
usersRouter.use(authenticate)
usersRouter.get('/', getUsers)
usersRouter.post('/', requireRole('ADMIN', 'MANAGER'), createUser)
usersRouter.get('/:id', getUser)
usersRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), updateUser)
usersRouter.delete('/:id', requireRole('ADMIN'), deleteUser)
usersRouter.post('/:id/reset-mfa', requireRole('ADMIN', 'MANAGER'), resetUserMfa)
