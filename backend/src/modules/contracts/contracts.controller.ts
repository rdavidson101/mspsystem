import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'

const ITEM_INCLUDE = { include: { product: { select: { id: true, name: true, sku: true } } } }

function advanceDate(from: Date, cycle: string): Date | null {
  const d = new Date(from)
  switch (cycle) {
    case 'Monthly':   d.setMonth(d.getMonth() + 1);      return d
    case 'Quarterly': d.setMonth(d.getMonth() + 3);      return d
    case 'Annual':    d.setFullYear(d.getFullYear() + 1); return d
    default: return null // One-time
  }
}

export async function getContracts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contracts = await prisma.contract.findMany({
      include: {
        company: { select: { id: true, name: true } },
        items: ITEM_INCLUDE,
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(contracts)
  } catch (e) { next(e) }
}

export async function getContract(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        company: { select: { id: true, name: true } },
        items: ITEM_INCLUDE,
        invoices: { orderBy: { createdAt: 'desc' }, include: { _count: { select: { items: true } } } },
        _count: { select: { invoices: true } },
      },
    })
    if (!contract) throw new AppError(404, 'Contract not found')
    res.json(contract)
  } catch (e) { next(e) }
}

export async function createContract(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { items, ...data } = req.body
    if (data.companyId) {
      const co = await prisma.company.findUnique({ where: { id: data.companyId } })
      if (co && !co.isActive) throw new AppError(400, 'This customer is disabled and cannot have new items created.')
    }
    if (data.startDate) data.startDate = new Date(data.startDate).toISOString()
    if (data.endDate)   data.endDate   = new Date(data.endDate).toISOString()
    if (data.signedAt)  data.signedAt  = new Date(data.signedAt).toISOString()

    // Auto-calculate value from items
    if (items && items.length > 0) {
      data.value = items.reduce((s: number, i: any) => s + Number(i.total || 0), 0)
    }

    // Set nextInvoiceDate when activating with a recurring cycle
    if (data.status === 'ACTIVE' && data.billingCycle && data.billingCycle !== 'One-time' && data.startDate) {
      data.nextInvoiceDate = data.startDate
    }

    const contract = await prisma.contract.create({
      data: {
        ...data,
        items: { create: (items || []).map((i: any) => ({
          description: i.description,
          quantity:    Number(i.quantity),
          unitPrice:   Number(i.unitPrice),
          total:       Number(i.total),
          productId:   i.productId || null,
        })) },
      },
      include: { company: { select: { id: true, name: true } }, items: ITEM_INCLUDE },
    })
    res.status(201).json(contract)
  } catch (e) { next(e) }
}

export async function updateContract(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { items, ...data } = req.body
    if (data.startDate) data.startDate = new Date(data.startDate).toISOString()
    if (data.endDate)   data.endDate   = new Date(data.endDate).toISOString()
    if (data.signedAt)  data.signedAt  = new Date(data.signedAt).toISOString()

    // Auto-calculate value from items
    if (items && items.length > 0) {
      data.value = items.reduce((s: number, i: any) => s + Number(i.total || 0), 0)
    }

    // If activating with recurring cycle and no nextInvoiceDate already set, initialise it
    if (data.status === 'ACTIVE' && data.billingCycle && data.billingCycle !== 'One-time') {
      const current = await prisma.contract.findUnique({ where: { id: req.params.id }, select: { nextInvoiceDate: true, startDate: true } })
      if (current && !current.nextInvoiceDate) {
        data.nextInvoiceDate = current.startDate
      }
    }

    const contract = await prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        await tx.contractItem.deleteMany({ where: { contractId: req.params.id } })
        data.items = {
          create: items.map((i: any) => ({
            description: i.description,
            quantity:    Number(i.quantity),
            unitPrice:   Number(i.unitPrice),
            total:       Number(i.total),
            productId:   i.productId || null,
          })),
        }
      }
      return tx.contract.update({
        where: { id: req.params.id },
        data,
        include: { company: { select: { id: true, name: true } }, items: ITEM_INCLUDE },
      })
    })
    res.json(contract)
  } catch (e) { next(e) }
}

export async function deleteContract(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.contract.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function generateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })
    if (!contract) throw new AppError(404, 'Contract not found')
    if (contract.status !== 'ACTIVE') throw new AppError(400, 'Can only generate invoices for active contracts')

    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + 30) // 30-day payment terms

    let invoiceItems: any[] = contract.items.map(i => ({
      description: i.description,
      quantity:    i.quantity,
      unitPrice:   i.unitPrice,
      total:       i.total,
      productId:   i.productId,
    }))

    // If no line items, create a single line item from contract value
    if (!invoiceItems.length) {
      invoiceItems = [{
        description: contract.name,
        quantity:    1,
        unitPrice:   contract.value,
        total:       contract.value,
        productId:   null,
      }]
    }

    const subtotal = invoiceItems.reduce((s: number, i: any) => s + i.total, 0)
    const number   = `INV-${Date.now()}`

    const invoice = await prisma.invoice.create({
      data: {
        number,
        companyId:  contract.companyId,
        contractId: contract.id,
        dueDate:    dueDate.toISOString(),
        subtotal,
        tax:        0,
        total:      subtotal,
        status:     'DRAFT',
        notes:      `Auto-generated from contract: ${contract.name}`,
        items:      { create: invoiceItems },
      },
      include: { company: { select: { id: true, name: true } }, items: true },
    })

    // Advance nextInvoiceDate
    const nextDate = advanceDate(now, contract.billingCycle || '')
    await prisma.contract.update({
      where: { id: contract.id },
      data: { nextInvoiceDate: nextDate ? nextDate.toISOString() : null },
    })

    res.status(201).json(invoice)
  } catch (e) { next(e) }
}

export async function runBilling(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const now = new Date()
    const due = await prisma.contract.findMany({
      where: { status: 'ACTIVE', nextInvoiceDate: { lte: now }, billingCycle: { not: null } },
      include: { items: true },
    })

    const results = []
    for (const contract of due) {
      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + 30)

      let invoiceItems: any[] = contract.items.map(i => ({
        description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total, productId: i.productId,
      }))
      if (!invoiceItems.length) {
        invoiceItems = [{ description: contract.name, quantity: 1, unitPrice: contract.value, total: contract.value, productId: null }]
      }

      const subtotal = invoiceItems.reduce((s: number, i: any) => s + i.total, 0)
      const number   = `INV-${Date.now()}-${contract.id.slice(0, 6)}`

      const invoice = await prisma.invoice.create({
        data: {
          number, companyId: contract.companyId, contractId: contract.id,
          dueDate: dueDate.toISOString(), subtotal, tax: 0, total: subtotal,
          status: 'DRAFT', notes: `Auto-generated from contract: ${contract.name}`,
          items: { create: invoiceItems },
        },
      })

      const nextDate = advanceDate(now, contract.billingCycle || '')
      await prisma.contract.update({
        where: { id: contract.id },
        data: { nextInvoiceDate: nextDate ? nextDate.toISOString() : null },
      })

      results.push({ contractId: contract.id, invoiceId: invoice.id, invoiceNumber: invoice.number })
    }

    res.json({ generated: results.length, invoices: results })
  } catch (e) { next(e) }
}
