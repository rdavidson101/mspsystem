import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'

const teamInclude = {
  members: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatar: true, jobTitle: true, role: true } }
    }
  },
  _count: { select: { tickets: true, companies: true } }
}

export async function getTeams(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const teams = await prisma.serviceTeam.findMany({ include: teamInclude, orderBy: { name: 'asc' } })
    res.json(teams)
  } catch (e) { next(e) }
}

export async function getTeam(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const team = await prisma.serviceTeam.findUnique({ where: { id: req.params.id }, include: teamInclude })
    if (!team) throw new AppError(404, 'Team not found')
    res.json(team)
  } catch (e) { next(e) }
}

export async function createTeam(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description } = req.body
    if (!name) throw new AppError(400, 'Name required')
    const team = await prisma.serviceTeam.create({ data: { name, description }, include: teamInclude })
    res.status(201).json(team)
  } catch (e) { next(e) }
}

export async function updateTeam(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description } = req.body
    const data: any = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description || null
    const team = await prisma.serviceTeam.update({ where: { id: req.params.id }, data, include: teamInclude })
    res.json(team)
  } catch (e) { next(e) }
}

export async function deleteTeam(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.serviceTeam.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function addMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.body
    if (!userId) throw new AppError(400, 'userId required')
    await prisma.serviceTeamMember.upsert({
      where: { teamId_userId: { teamId: req.params.id, userId } },
      create: { teamId: req.params.id, userId },
      update: {},
    })
    const team = await prisma.serviceTeam.findUnique({ where: { id: req.params.id }, include: teamInclude })
    res.json(team)
  } catch (e) { next(e) }
}

export async function removeMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.serviceTeamMember.deleteMany({ where: { teamId: req.params.id, userId: req.params.userId } })
    const team = await prisma.serviceTeam.findUnique({ where: { id: req.params.id }, include: teamInclude })
    res.json(team)
  } catch (e) { next(e) }
}

export async function getMyTeams(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const memberships = await prisma.serviceTeamMember.findMany({
      where: { userId: req.user!.id },
      include: { team: { select: { id: true, name: true } } }
    })
    res.json(memberships.map(m => m.team))
  } catch (e) { next(e) }
}
