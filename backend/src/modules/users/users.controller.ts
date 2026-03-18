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
    const { password, firstName, lastName, email, phone, role, userType, isActive, canApproveChanges } = req.body
    const updateData: any = {}
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role
    if (userType !== undefined) updateData.userType = userType
    if (isActive !== undefined) updateData.isActive = isActive
    if (canApproveChanges !== undefined) updateData.canApproveChanges = canApproveChanges
    if (password) updateData.password = await bcrypt.hash(password, 10)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, userType: true, phone: true, isActive: true, canApproveChanges: true, twoFactorEnabled: true },
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
