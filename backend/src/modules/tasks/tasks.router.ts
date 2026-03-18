import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getTasks, getTask, createTask, updateTask, deleteTask } from './tasks.controller'

export const tasksRouter = Router()
tasksRouter.use(authenticate)
tasksRouter.get('/', getTasks)
tasksRouter.get('/:id', getTask)
tasksRouter.post('/', createTask)
tasksRouter.put('/:id', updateTask)
tasksRouter.delete('/:id', deleteTask)
