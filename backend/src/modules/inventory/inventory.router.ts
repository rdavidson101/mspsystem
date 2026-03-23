import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { getAssets, getAsset, createAsset, updateAsset, deleteAsset, requestShipment } from './assets.controller'
import { getManufacturers, createManufacturer, updateManufacturer, deleteManufacturer } from './manufacturers.controller'
import { getShipments, updateShipment, deleteShipment } from './shipments.controller'
import { getAssetTypes, createAssetType, updateAssetType, deleteAssetType } from './assetTypes.controller'
import { getVendors, createVendor, updateVendor, deleteVendor } from './vendors.controller'
import { getLicenses, createLicense, updateLicense, deleteLicense } from './licenses.controller'

export const inventoryRouter = Router()
inventoryRouter.use(authenticate)

// Assets
inventoryRouter.get('/assets', getAssets)
inventoryRouter.post('/assets', requireRole('ADMIN', 'MANAGER'), createAsset)
inventoryRouter.get('/assets/:id', getAsset)
inventoryRouter.patch('/assets/:id', requireRole('ADMIN', 'MANAGER'), updateAsset)
inventoryRouter.delete('/assets/:id', requireRole('ADMIN', 'MANAGER'), deleteAsset)
inventoryRouter.post('/assets/:id/ship', requireRole('ADMIN', 'MANAGER'), requestShipment)

// Manufacturers
inventoryRouter.get('/manufacturers', getManufacturers)
inventoryRouter.post('/manufacturers', requireRole('ADMIN', 'MANAGER'), createManufacturer)
inventoryRouter.patch('/manufacturers/:id', requireRole('ADMIN', 'MANAGER'), updateManufacturer)
inventoryRouter.delete('/manufacturers/:id', requireRole('ADMIN', 'MANAGER'), deleteManufacturer)

// Shipments
inventoryRouter.get('/shipments', getShipments)
inventoryRouter.patch('/shipments/:id', requireRole('ADMIN', 'MANAGER'), updateShipment)
inventoryRouter.delete('/shipments/:id', requireRole('ADMIN', 'MANAGER'), deleteShipment)

// Asset types
inventoryRouter.get('/asset-types', getAssetTypes)
inventoryRouter.post('/asset-types', requireRole('ADMIN', 'MANAGER'), createAssetType)
inventoryRouter.patch('/asset-types/:id', requireRole('ADMIN', 'MANAGER'), updateAssetType)
inventoryRouter.delete('/asset-types/:id', requireRole('ADMIN', 'MANAGER'), deleteAssetType)

// Vendors
inventoryRouter.get('/vendors', getVendors)
inventoryRouter.post('/vendors', requireRole('ADMIN', 'MANAGER'), createVendor)
inventoryRouter.patch('/vendors/:id', requireRole('ADMIN', 'MANAGER'), updateVendor)
inventoryRouter.delete('/vendors/:id', requireRole('ADMIN', 'MANAGER'), deleteVendor)

// Licenses
inventoryRouter.get('/licenses', getLicenses)
inventoryRouter.post('/licenses', requireRole('ADMIN', 'MANAGER'), createLicense)
inventoryRouter.patch('/licenses/:id', requireRole('ADMIN', 'MANAGER'), updateLicense)
inventoryRouter.delete('/licenses/:id', requireRole('ADMIN', 'MANAGER'), deleteLicense)
