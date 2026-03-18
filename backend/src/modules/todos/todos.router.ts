import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getTodos, createTodo, updateTodo, deleteTodo } from './todos.controller'

export const todosRouter = Router()
todosRouter.use(authenticate)
todosRouter.get('/', getTodos)
todosRouter.post('/', createTodo)
todosRouter.put('/:id', updateTodo)
todosRouter.delete('/:id', deleteTodo)
