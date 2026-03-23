import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'
import bcrypt from 'bcryptjs'

const userSelect = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, userType: true, avatar: true, isActive: true,
  canApproveChanges: true, phone: true, jobTitle: true, twoFactorEnabled: true,
  createdAt: true, companyId: true,
}

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type } = req.query
    const where: any = {}
    if (type) where.userType = type as string
    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { firstName: 'asc' },
    })
    res.json(users)
  } catch (e) { next(e) }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect,
    })
    if (!user) throw new AppError(404, 'User not found')
    res.json(user)
  } catch (e) { next(e) }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password, firstName, lastName, role, phone, jobTitle, userType } = req.body
    const data: any = { email, firstName, lastName, role: role || 'TECHNICIAN', phone, userType: userType || 'INTERNAL' }
    if (jobTitle !== undefined) data.jobTitle = jobTitle || null
    if (userType !== 'CLIENT') {
      if (!password) throw new AppError(400, 'Password required for internal users')
      data.password = await bcrypt.hash(password, 10)
    }

    // Auto-associate INTERNAL users with MSP company
    if (data.userType === 'INTERNAL') {
      const mspCompany = await prisma.company.findFirst({ where: { isInternal: true } })
      if (mspCompany) data.companyId = mspCompany.id
    }

    const user = await prisma.user.create({
      data,
      select: userSelect,
    })
    res.status(201).json(user)
  } catch (e) { next(e) }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { password, firstName, lastName, email, phone, jobTitle, role, userType, isActive, canApproveChanges } = req.body

    // Prevent privilege escalation — only ADMIN can change roles or approval permissions
    if (req.body.role !== undefined && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can change user roles' })
    }
    if (req.body.canApproveChanges !== undefined && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can modify approval permissions' })
    }

    const updateData: any = {}
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle || null
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (canApproveChanges !== undefined) updateData.canApproveChanges = canApproveChanges
    if (password) updateData.password = await bcrypt.hash(password, 10)

    // Handle userType change — update company association
    if (userType !== undefined) {
      updateData.userType = userType
      if (userType === 'INTERNAL') {
        const mspCompany = await prisma.company.findFirst({ where: { isInternal: true } })
        updateData.companyId = mspCompany?.id || null
      } else {
        updateData.companyId = null
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: userSelect,
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

export async function resetUserMfa(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
      throw new AppError(403, 'Not authorized')
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    })
    res.json({ success: true })
  } catch (e) { next(e) }
}
