import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getMacros, createMacro, updateMacro, deleteMacro } from './macros.controller'

export const macrosRouter = Router()
macrosRouter.use(authenticate)
macrosRouter.get('/', getMacros)
macrosRouter.post('/', createMacro)
macrosRouter.put('/:id', updateMacro)
macrosRouter.delete('/:id', deleteMacro)
