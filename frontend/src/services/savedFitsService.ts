import { loadSavedFits, persistSavedFits } from '../storage'
import type { SavedFit } from '../types'
import { runLocalService } from './apiClient'
import type { SavedFitsService } from './contracts'

let localSavedFits = loadSavedFits()

export const savedFitsService: SavedFitsService = {
  list: () => runLocalService(() => localSavedFits),
  create: (fit: SavedFit) => runLocalService(() => {
    localSavedFits = [fit, ...localSavedFits]
    persistSavedFits(localSavedFits)
    return fit
  }),
  remove: (id: string) => runLocalService(() => {
    localSavedFits = localSavedFits.filter(fit => fit.id !== id)
    persistSavedFits(localSavedFits)
  }),
}
