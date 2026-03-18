import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AppError } from '../../middleware/errorHandler'
import { AuthRequest } from '../../middleware/auth'

function signTokens(user: { id: string; email: string; role: string }) {
  const access = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '15m' })
  const refresh = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })
  return { access, refresh }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) throw new AppError(401, 'Invalid credentials')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new AppError(401, 'Invalid credentials')
    const { access, refresh } = signTokens({ id: user.id, email: user.email, role: user.role })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.refreshToken.create({ data: { token: refresh, userId: user.id, expiresAt } })
    res.json({
      token: access,
      refreshToken: refresh,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar },
    })
  } catch (e) { next(e) }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body
    if (refreshToken) await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) throw new AppError(401, 'No refresh token')
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } })
    if (!stored || stored.expiresAt < new Date()) throw new AppError(401, 'Invalid refresh token')
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any
    const user = stored.user
    const { access, refresh: newRefresh } = signTokens({ id: user.id, email: user.email, role: user.role })
    await prisma.refreshToken.delete({ where: { id: stored.id } })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.refreshToken.create({ data: { token: newRefresh, userId: user.id, expiresAt } })
    res.json({ token: access, refreshToken: newRefresh })
  } catch (e) { next(e) }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, firstName: true, lastName: true, role: true, avatar: true, phone: true } })
    if (!user) throw new AppError(404, 'User not found')
    res.json(user)
  } catch (e) { next(e) }
}
