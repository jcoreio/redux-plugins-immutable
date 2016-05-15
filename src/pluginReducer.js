/* @flow */

import * as Immutable from 'immutable'
import warning from 'warning'

import {createSelector} from 'reselect'

import {createReducer, composeReducers} from 'mindfront-redux-utils'

import { ADD_PLUGIN, REPLACE_PLUGIN, INSTALL_PLUGIN, SET_PLUGIN_STATUS } from './pluginActions'
import type {Action, Reducer} from './reduxTypes'

import {LOADED, NOT_LOADED} from './pluginTypes'

const selectPluginReducers: (state: Immutable.Map) => Reducer = createSelector(
  state => state.get('plugins'),
  plugins => (plugins ?
    composeReducers(...plugins.map(p => p.get('reducer')).toArray()) :
      (state => state))
)

const pluginReducer: Reducer = composeReducers(
  createReducer({
    [ADD_PLUGIN]: (state: Immutable.Map, action: Action) => {
      let plugin = action.payload
      warning(plugin instanceof Immutable.Map, 'plugin must be an Immutable.Map')
      if (!(plugin instanceof Immutable.Map)) {
        return state
      }

      let key = plugin.get('key')
      warning(typeof key === 'string' && key.length, 'plugin.get("key") must be a non-empty string')
      if (!key) return state

      return state.updateIn(['plugins', key], existing => {
        warning(!existing, 'plugin already exists for key: %s', key)
        return existing || plugin.update('loadStatus', loadStatus => loadStatus || NOT_LOADED)
      })
    },
    [REPLACE_PLUGIN]: (state: Immutable.Map, action: Action) => {
      let plugin = action.payload
      warning(plugin instanceof Immutable.Map, 'plugin must be an Immutable.Map')
      if (!(plugin instanceof Immutable.Map)) {
        return state
      }

      let key = plugin.get('key')
      warning(typeof key === 'string' && key.length, 'plugin.get("key") must be a non-empty string')
      if (!key) return state

      return state.updateIn(['plugins', key], existing => {
        warning(existing, "plugin doesn't exist for key: %s", key)
        return existing && plugin.update('loadStatus', loadStatus => loadStatus || NOT_LOADED)
      })
    },
    [INSTALL_PLUGIN]: (state: Immutable.Map, action: Action) => {
      let plugin = action.payload
      warning(plugin instanceof Immutable.Map, 'plugin must be an Immutable.Map')
      if (!(plugin instanceof Immutable.Map)) {
        return state
      }

      let key = plugin.get('key')
      warning(typeof key === 'string' && key.length, 'plugin.get("key") must be a non-empty string')
      if (!key) return state

      return state.updateIn(['plugins', key], existing => {
        let result = existing ? existing.mergeDeep(plugin) : plugin
        return result.set('loadStatus', LOADED).delete('loadError')
      })
    },
    [SET_PLUGIN_STATUS]: (state: Immutable.Map, action: Action) => {
      let {meta: {key}, payload: {loadStatus, loadError}} = action
      return state.updateIn(['plugins', key], plugin => {
        warning(plugin, 'missing plugin for key: %s', key)
        return plugin && plugin.withMutations(plugin => {
          if (loadStatus) {
            plugin.set('loadStatus', loadStatus)
          }
          if (loadError) {
            plugin.set('loadError', loadError)
          }
          else {
            plugin.delete('loadError')
          }
        })
      })
    }
  }),
  // apply the plugins' reducers
  (state: Immutable.Map, action: Action) => selectPluginReducers(state)(state, action)
)

export default pluginReducer
