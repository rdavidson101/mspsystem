import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getTemplates, getTemplate, createTemplateFromProject,
  updateTemplate, deleteTemplate,
} from './templates.controller'

export const templatesRouter = Router()
templatesRouter.use(authenticate)

templatesRouter.get('/', getTemplates)
templatesRouter.get('/:id', getTemplate)
templatesRouter.post('/from-project/:projectId', createTemplateFromProject)
templatesRouter.patch('/:id', updateTemplate)
templatesRouter.delete('/:id', deleteTemplate)
