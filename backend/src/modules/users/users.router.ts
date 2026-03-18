import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getUsers, createUser, updateUser, deleteUser } from './users.controller'

export const usersRouter = Router()
usersRouter.use(authenticate)
usersRouter.get('/', getUsers)
usersRouter.post('/', createUser)
usersRouter.patch('/:id', updateUser)
usersRouter.delete('/:id', deleteUser)
