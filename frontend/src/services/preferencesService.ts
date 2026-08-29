import { loadStylePreferences, persistStylePreferences } from '../storage'
import type { StylePreference } from '../types'
import { runLocalService } from './apiClient'
import type { PreferencesService } from './contracts'

let localPreferences = loadStylePreferences()

export const preferencesService: PreferencesService = {
  list: () => runLocalService(() => localPreferences),
  record: (preference: StylePreference) => runLocalService(() => {
    localPreferences = [preference, ...localPreferences]
    persistStylePreferences(localPreferences)
    return preference
  }),
}
