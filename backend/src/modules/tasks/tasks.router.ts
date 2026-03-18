import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getTasks, getTask, createTask, updateTask, deleteTask, reorderTasks,
  getTaskComments, createTaskComment, deleteTaskComment,
  startTimer, stopTimer, getTimer, getTaskTimeByUser,
} from './tasks.controller'

export const tasksRouter = Router()
tasksRouter.use(authenticate)

tasksRouter.get('/', getTasks)
tasksRouter.post('/', createTask)
tasksRouter.post('/reorder', reorderTasks)
tasksRouter.get('/:id', getTask)
tasksRouter.patch('/:id', updateTask)
tasksRouter.delete('/:id', deleteTask)

tasksRouter.get('/:id/comments', getTaskComments)
tasksRouter.post('/:id/comments', createTaskComment)
tasksRouter.delete('/:id/comments/:commentId', deleteTaskComment)

tasksRouter.get('/:id/timer', getTimer)
tasksRouter.post('/:id/timer/start', startTimer)
tasksRouter.post('/:id/timer/stop', stopTimer)
tasksRouter.get('/:id/time-by-user', getTaskTimeByUser)
