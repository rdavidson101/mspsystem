import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
  addMember, removeMember,
  createSection, updateSection, deleteSection, reorderSections,
} from './projects.controller'

export const projectsRouter = Router()
projectsRouter.use(authenticate)

projectsRouter.get('/', getProjects)
projectsRouter.post('/', createProject)
projectsRouter.get('/:id', getProject)
projectsRouter.patch('/:id', updateProject)
projectsRouter.delete('/:id', deleteProject)

projectsRouter.post('/:id/members', addMember)
projectsRouter.delete('/:id/members/:userId', removeMember)

projectsRouter.post('/:id/sections', createSection)
projectsRouter.post('/:id/sections/reorder', reorderSections)
projectsRouter.patch('/:id/sections/:sectionId', updateSection)
projectsRouter.delete('/:id/sections/:sectionId', deleteSection)
