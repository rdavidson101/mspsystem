import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getTimeEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry } from './time.controller'

export const timeEntriesRouter = Router()
timeEntriesRouter.use(authenticate)
timeEntriesRouter.get('/', getTimeEntries)
timeEntriesRouter.post('/', createTimeEntry)
timeEntriesRouter.put('/:id', updateTimeEntry)
timeEntriesRouter.delete('/:id', deleteTimeEntry)
