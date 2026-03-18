import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AppError } from '../../middleware/errorHandler'
import { AuthRequest } from '../../middleware/auth'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

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
    if (user.userType === 'CLIENT') throw new AppError(401, 'Invalid credentials')
    if (!user.password) throw new AppError(401, 'Invalid credentials')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new AppError(401, 'Invalid credentials')
    if (user.twoFactorEnabled) {
      return res.json({ requires2FA: true, userId: user.id })
    }
    const { access, refresh } = signTokens({ id: user.id, email: user.email, role: user.role })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.refreshToken.create({ data: { token: refresh, userId: user.id, expiresAt } })
    res.json({
      token: access,
      refreshToken: refresh,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar, twoFactorEnabled: user.twoFactorEnabled },
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

export async function setup2FA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw new AppError(404, 'User not found')
    if (user.twoFactorEnabled) throw new AppError(400, '2FA is already enabled')
    const secret = authenticator.generateSecret()
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } })
    const otpauthUrl = authenticator.keyuri(user.email, 'MSP System', secret)
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)
    res.json({ secret, qrCodeDataUrl })
  } catch (e) { next(e) }
}

export async function enable2FA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { token } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user || !user.twoFactorSecret) throw new AppError(400, '2FA setup not initiated')
    const valid = authenticator.verify({ token, secret: user.twoFactorSecret })
    if (!valid) throw new AppError(400, 'Invalid verification code')
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function disable2FA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { token } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user || !user.twoFactorSecret) throw new AppError(400, '2FA not enabled')
    const valid = authenticator.verify({ token, secret: user.twoFactorSecret })
    if (!valid) throw new AppError(400, 'Invalid verification code')
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function verify2FA(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, token } = req.body
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) throw new AppError(400, 'Invalid request')
    const valid = authenticator.verify({ token, secret: user.twoFactorSecret })
    if (!valid) throw new AppError(400, 'Invalid verification code')
    const { access, refresh } = signTokens({ id: user.id, email: user.email, role: user.role })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.refreshToken.create({ data: { token: refresh, userId: user.id, expiresAt } })
    res.json({
      token: access,
      refreshToken: refresh,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar, twoFactorEnabled: user.twoFactorEnabled },
    })
  } catch (e) { next(e) }
}
