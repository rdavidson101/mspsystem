import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from './products.controller'

export const productsRouter = Router()
productsRouter.use(authenticate)
productsRouter.get('/', getProducts)
productsRouter.get('/:id', getProduct)
productsRouter.post('/', requireRole('ADMIN', 'MANAGER'), createProduct)
productsRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), updateProduct)
productsRouter.delete('/:id', requireRole('ADMIN', 'MANAGER'), deleteProduct)
