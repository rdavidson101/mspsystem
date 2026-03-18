import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getAssets, getAsset, createAsset, updateAsset, deleteAsset, requestShipment } from './assets.controller'
import { getManufacturers, createManufacturer, updateManufacturer, deleteManufacturer } from './manufacturers.controller'
import { getShipments, updateShipment } from './shipments.controller'

export const inventoryRouter = Router()
inventoryRouter.use(authenticate)

// Assets
inventoryRouter.get('/assets', getAssets)
inventoryRouter.post('/assets', createAsset)
inventoryRouter.get('/assets/:id', getAsset)
inventoryRouter.patch('/assets/:id', updateAsset)
inventoryRouter.delete('/assets/:id', deleteAsset)
inventoryRouter.post('/assets/:id/ship', requestShipment)

// Manufacturers
inventoryRouter.get('/manufacturers', getManufacturers)
inventoryRouter.post('/manufacturers', createManufacturer)
inventoryRouter.patch('/manufacturers/:id', updateManufacturer)
inventoryRouter.delete('/manufacturers/:id', deleteManufacturer)

// Shipments
inventoryRouter.get('/shipments', getShipments)
inventoryRouter.patch('/shipments/:id', updateShipment)
