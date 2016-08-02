/* @flow */

import * as Immutable from 'immutable'
import type {LoadStatus} from './pluginTypes'
import type {Action} from './reduxTypes'

export const ADD_PLUGIN = 'ADD_PLUGIN'
export const REPLACE_PLUGIN = 'REPLACE_PLUGIN'
export const LOAD_PLUGIN = 'LOAD_PLUGIN'
export const INSTALL_PLUGIN = 'INSTALL_PLUGIN'
export const SET_PLUGIN_STATUS = 'SET_PLUGIN_STATUS'

export function addPlugin(plugin: Immutable.Collection<any, any>): Action {
  return {
    type: ADD_PLUGIN,
    payload: plugin
  }
}

export function replacePlugin(plugin: Immutable.Collection<any, any>): Action {
  return {
    type: REPLACE_PLUGIN,
    payload: plugin
  }
}

export function loadPlugin(key: string): Action {
  return {
    type: LOAD_PLUGIN,
    payload: key
  }
}

export function installPlugin(plugin: Immutable.Collection<any, any>): Action {
  return {
    type: INSTALL_PLUGIN,
    payload: plugin
  }
}

export function setPluginStatus(key: string, payload: {loadStatus?: LoadStatus, loadError?: Error}): Action {
  return {
    type: SET_PLUGIN_STATUS,
    payload,
    meta: {key}
  }
}
