import { Response, NextFunction } from 'express'
import { prisma } from '../../../lib/prisma'
import { AuthRequest } from '../../../middleware/auth'

export async function getCompanies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { search } = req.query
    const companies = await prisma.company.findMany({
      where: search ? { name: { contains: String(search), mode: 'insensitive' } } : {},
      include: { _count: { select: { contacts: true, tickets: true, projects: true } } },
      orderBy: { name: 'asc' },
    })
    res.json(companies)
  } catch (e) { next(e) }
}

export async function getCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: { contacts: true, tickets: { take: 10, orderBy: { createdAt: 'desc' } }, projects: true, contracts: true, leads: true },
    })
    res.json(company)
  } catch (e) { next(e) }
}

export async function createCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const company = await prisma.company.create({ data: req.body })
    res.status(201).json(company)
  } catch (e) { next(e) }
}

export async function updateCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const company = await prisma.company.update({ where: { id: req.params.id }, data: req.body })
    res.json(company)
  } catch (e) { next(e) }
}

export async function deleteCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.company.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
