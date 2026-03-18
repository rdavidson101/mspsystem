import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'
import bcrypt from 'bcryptjs'

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type } = req.query
    const where: any = {}
    if (type) where.userType = type as string
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, userType: true, avatar: true, isActive: true, canApproveChanges: true, phone: true, twoFactorEnabled: true, createdAt: true },
      orderBy: { firstName: 'asc' },
    })
    res.json(users)
  } catch (e) { next(e) }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password, firstName, lastName, role, phone, userType } = req.body
    const data: any = { email, firstName, lastName, role: role || 'TECHNICIAN', phone, userType: userType || 'INTERNAL' }
    if (userType !== 'CLIENT') {
      if (!password) throw new AppError(400, 'Password required for internal users')
      data.password = await bcrypt.hash(password, 10)
    }
    const user = await prisma.user.create({
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, userType: true },
    })
    res.status(201).json(user)
  } catch (e) { next(e) }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { password, ...data } = req.body
    const updateData: any = { ...data }
    if (password) updateData.password = await bcrypt.hash(password, 10)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })
    res.json(user)
  } catch (e) { next(e) }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true })
  } catch (e) { next(e) }
}
