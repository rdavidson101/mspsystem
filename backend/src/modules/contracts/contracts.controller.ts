import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getContracts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contracts = await prisma.contract.findMany({
      include: { company: { select: { id: true, name: true } }, _count: { select: { invoices: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(contracts)
  } catch (e) { next(e) }
}

export async function createContract(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contract = await prisma.contract.create({ data: req.body, include: { company: { select: { id: true, name: true } } } })
    res.status(201).json(contract)
  } catch (e) { next(e) }
}

export async function updateContract(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contract = await prisma.contract.update({ where: { id: req.params.id }, data: req.body })
    res.json(contract)
  } catch (e) { next(e) }
}

export async function deleteContract(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.contract.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
