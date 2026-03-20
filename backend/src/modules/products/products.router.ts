import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from './products.controller'

export const productsRouter = Router()
productsRouter.use(authenticate)
productsRouter.get('/', getProducts)
productsRouter.get('/:id', getProduct)
productsRouter.post('/', createProduct)
productsRouter.patch('/:id', updateProduct)
productsRouter.delete('/:id', deleteProduct)
