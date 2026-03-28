import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getContracts, getContract, createContract, updateContract, deleteContract,
  generateInvoice, runBilling,
} from './contracts.controller'

export const contractsRouter = Router()
contractsRouter.use(authenticate)
contractsRouter.get('/',              getContracts)
contractsRouter.get('/:id',           getContract)
contractsRouter.post('/',             createContract)
contractsRouter.post('/run-billing',  runBilling)
contractsRouter.post('/:id/generate-invoice', generateInvoice)
contractsRouter.put('/:id',           updateContract)
contractsRouter.delete('/:id',        deleteContract)
