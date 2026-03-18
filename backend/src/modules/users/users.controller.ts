import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import bcrypt from 'bcryptjs'

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatar: true, isActive: true, createdAt: true },
      orderBy: { firstName: 'asc' },
    })
    res.json(users)
  } catch (e) { next(e) }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName, role, phone },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
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
