import * as Immutable from 'immutable'
import Promise from 'bluebird'

import {createSelector} from 'reselect'

import {createMiddleware, composeMiddleware} from 'mindfront-redux-utils'

import {LOADING, NOT_LOADED, LOADED} from './pluginTypes'

import type {Middleware} from './reduxTypes'

import {
  setPluginStatus,
  ADD_PLUGIN,
  LOAD_PLUGIN,
  installPlugin
} from './pluginActions'

const addPluginHandler: Middleware = store => next => action => {
  let result = next(action)

  let plugin = action.payload
  if (plugin) {
    let pluginWasAdded = plugin.get('pluginWasAdded')
    pluginWasAdded && pluginWasAdded(store)
  }
  
  return result
}

const loadPluginHandler: Middleware = store => next => action => {
  next(action)

  let key = action.payload
  let plugin = store.getState().getIn(['plugins', key])
  if (plugin) {
    if (plugin.get('loadStatus') === LOADED) {
      return Promise.resolve(plugin)
    }
    let load = plugin.get('load')
    if (!(load instanceof Function)) {
      return Promise.reject(new Error(`plugin must have loaded status or a load method`))
    }
    store.dispatch(setPluginStatus(key, {loadStatus: LOADING}))

    let returnedPromise
    let callbackPromise = Promise.fromNode(callback => {
      returnedPromise = load(store, callback)
    })

    return (returnedPromise || callbackPromise).catch((error: Error) => {
      store.dispatch(setPluginStatus(key, {loadStatus: NOT_LOADED, loadError: error}))
      throw error
    })
    .then((plugin: Immutable.Collection) => {
      if (plugin instanceof Immutable.Collection) {
        store.dispatch(installPlugin(plugin.set('key', key)))
        return plugin
      }
      else {
        throw new Error('plugin must be an Immutable.Collection')
      }
    })
  }
  else {
    return Promise.reject(new Error(`no plugin with key '${key}' exists`))
  }
}

const selectPluginMiddleware: (state: Immutable.Collection) => Middleware = createSelector(
  state => state.get('plugins'),
  plugins => plugins ?
    composeMiddleware(...plugins.map(p => p.get('middleware')).toArray()) :
    store => next => action => next(action)
)

export default composeMiddleware(
  createMiddleware({
    [ADD_PLUGIN]: addPluginHandler,
    [LOAD_PLUGIN]: loadPluginHandler
  }),
  store => next => action => selectPluginMiddleware(store.getState())(store)(next)(action)
)
