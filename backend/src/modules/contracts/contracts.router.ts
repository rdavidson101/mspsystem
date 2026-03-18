import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getContracts, createContract, updateContract, deleteContract } from './contracts.controller'

export const contractsRouter = Router()
contractsRouter.use(authenticate)
contractsRouter.get('/', getContracts)
contractsRouter.post('/', createContract)
contractsRouter.put('/:id', updateContract)
contractsRouter.delete('/:id', deleteContract)
