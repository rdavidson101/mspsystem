import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getTeams, getTeam, createTeam, updateTeam, deleteTeam, addMember, removeMember } from './teams.controller'

export const teamsRouter = Router()
teamsRouter.use(authenticate)
teamsRouter.get('/', getTeams)
teamsRouter.post('/', createTeam)
teamsRouter.get('/:id', getTeam)
teamsRouter.put('/:id', updateTeam)
teamsRouter.delete('/:id', deleteTeam)
teamsRouter.post('/:id/members', addMember)
teamsRouter.delete('/:id/members/:userId', removeMember)
