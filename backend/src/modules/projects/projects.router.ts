import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
  addMember, removeMember,
  createSection, updateSection, deleteSection, reorderSections,
  getProjectComments, createProjectComment, deleteProjectComment,
} from './projects.controller'
import { prisma } from '../../lib/prisma'

export const projectsRouter = Router()
projectsRouter.use(authenticate)

projectsRouter.param('id', async (req, res, next, id) => {
  if (/^PRJ-/i.test(id)) {
    const num = parseInt(id.slice(4), 10)
    if (isNaN(num)) return res.status(400).json({ message: 'Invalid project reference' })
    const project = await prisma.project.findUnique({ where: { number: num }, select: { id: true } })
    if (!project) return res.status(404).json({ message: 'Project not found' })
    req.params.id = project.id
  }
  next()
})

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

projectsRouter.get('/:id/comments', getProjectComments)
projectsRouter.post('/:id/comments', createProjectComment)
projectsRouter.delete('/:id/comments/:commentId', deleteProjectComment)
