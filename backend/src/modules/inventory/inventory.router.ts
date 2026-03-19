import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
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
inventoryRouter.delete('/shipments/:id', deleteShipment)

// Asset types
inventoryRouter.get('/asset-types', getAssetTypes)
inventoryRouter.post('/asset-types', createAssetType)
inventoryRouter.patch('/asset-types/:id', updateAssetType)
inventoryRouter.delete('/asset-types/:id', deleteAssetType)

// Vendors
inventoryRouter.get('/vendors', getVendors)
inventoryRouter.post('/vendors', createVendor)
inventoryRouter.patch('/vendors/:id', updateVendor)
inventoryRouter.delete('/vendors/:id', deleteVendor)

// Licenses
inventoryRouter.get('/licenses', getLicenses)
inventoryRouter.post('/licenses', createLicense)
inventoryRouter.patch('/licenses/:id', updateLicense)
inventoryRouter.delete('/licenses/:id', deleteLicense)
