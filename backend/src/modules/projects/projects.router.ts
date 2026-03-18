import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getProjects, getProject, createProject, updateProject, deleteProject } from './projects.controller'

export const projectsRouter = Router()
projectsRouter.use(authenticate)
projectsRouter.get('/', getProjects)
projectsRouter.get('/:id', getProject)
projectsRouter.post('/', createProject)
projectsRouter.put('/:id', updateProject)
projectsRouter.delete('/:id', deleteProject)
