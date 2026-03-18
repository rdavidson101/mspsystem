import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getUsers, getUser, createUser, updateUser, deleteUser } from './users.controller'

export const usersRouter = Router()
usersRouter.use(authenticate)
usersRouter.get('/', getUsers)
usersRouter.post('/', createUser)
usersRouter.get('/:id', getUser)
usersRouter.patch('/:id', updateUser)
usersRouter.delete('/:id', deleteUser)
