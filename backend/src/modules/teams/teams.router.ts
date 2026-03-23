import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { getTeams, getTeam, createTeam, updateTeam, deleteTeam, addMember, removeMember } from './teams.controller'

export const teamsRouter = Router()
teamsRouter.use(authenticate)
teamsRouter.get('/', getTeams)
teamsRouter.post('/', requireRole('ADMIN'), createTeam)
teamsRouter.get('/:id', getTeam)
teamsRouter.put('/:id', requireRole('ADMIN'), updateTeam)
teamsRouter.delete('/:id', requireRole('ADMIN'), deleteTeam)
teamsRouter.post('/:id/members', requireRole('ADMIN', 'MANAGER'), addMember)
teamsRouter.delete('/:id/members/:userId', requireRole('ADMIN', 'MANAGER'), removeMember)
