import * as Immutable from 'immutable'
import {createStore, applyMiddleware} from 'redux'

import pluginMiddleware from '../src/pluginMiddleware'

import {addPlugin, loadPlugin, installPlugin, setPluginStatus} from '../src/pluginActions'
import {NOT_LOADED, LOADING, LOADED} from '../src/pluginTypes'

describe('pluginMiddleware', () => {
  function createTestStore(initialState = Immutable.Map({plugins: Immutable.Map()})) {
    let actions = jasmine.createSpy()
    let store = applyMiddleware(pluginMiddleware)(createStore)((state, action) => {
      actions(action)
      return state
    }, initialState)
    store.actions = actions
    return store
  }
  
  describe('addPluginHandler', () => {
    it('calls pluginWasAdded iff it exists after plugin was added', done => {
      const initialState = Immutable.Map({plugins: Immutable.Map()})
      const store = applyMiddleware(pluginMiddleware)(createStore)((state, action) => state, initialState)
      const plugin = Immutable.fromJS({
        key: 'p1',
        name: 'Plugin 1',
        pluginWasAdded(store) {
          expect(store.dispatch instanceof Function).toBe(true)
          expect(store.getState instanceof Function).toBe(true)
          done()
        }
      }) 
      store.dispatch(addPlugin(plugin))
    })
  })

  describe('loadPluginHandler', () => {
    it("returns rejected Promise for missing plugin", (done) => {
      let store = createTestStore()
      store.dispatch(loadPlugin('p1'))
        .then(() => done.fail("Promise should have been rejected"))
        .catch(() => done())
    })
    it("returns rejected Promise for NOT_LOADED plugin without load method", (done) => {
      let store = createTestStore(Immutable.fromJS({
        plugins: {
          p1: {
            key: 'p1',
            name: 'Plugin 1'
          },
          p2: {
            key: 'p2',
            name: 'Plugin 2',
            load: 'invalid'
          }
        }
      }))
      store.dispatch(loadPlugin('p1'))
        .then(() => done.fail("Promise should have been rejected"))
        .catch(() => store.dispatch(loadPlugin('p2')))
        .then(() => done.fail("Promise should have been rejected"))
        .catch(() => done())
    })
    it("returns Promise that resolves to plugin if valid", (done) => {
      let loadedPlugin = Immutable.fromJS({key: 'p1', name: 'Plugin 1', hello: 'world'})
      let store = createTestStore(Immutable.fromJS({
        plugins: {
          p1: {
            key: 'p1',
            name: 'Plugin 1',
            load: (store, callback) => callback(undefined, loadedPlugin)
          }
        }
      }))
      store.dispatch(loadPlugin('p1'))
        .then(plugin => {
          expect(plugin).toBe(loadedPlugin)
          done()
        })
        .catch(error => done.fail(error))
    })
    it("dispatches setPluginStatus with LOADING and no error before calling plugin's load()", (done) => {
      let store = createTestStore(Immutable.fromJS({
        plugins: {
          p1: {
            key: 'p1',
            name: 'Plugin 1',
            loadStatus: NOT_LOADED,
            loadError: new Error('this should get deleted'),
            load: (store2, callback) => {
              expect(store.actions).toHaveBeenCalledWith(setPluginStatus('p1', {
                loadStatus: LOADING
              }))
              done()
            }
          }
        }
      }))
      store.dispatch(loadPlugin('p1'))
       .then(plugin => {
         expect(store.actions).toHaveBeenCalledWith(setPluginStatus('p1', {
           loadStatus: LOADING,
           loadError: undefined
         }))
         done()
       })
      .catch(error => done.fail(error))
    })
    it("dispatches setPluginStatus with NOT_LOADING/error and rejects Promise if load() errors", (done) => {
      let loadError = new Error('this should get deleted')
      let store = createTestStore(Immutable.fromJS({
        plugins: {
          p1: {
            key: 'p1',
            name: 'Plugin 1',
            loadStatus: NOT_LOADED,
            load: (store, callback) => callback(loadError)
          }
        }
      }))
      store.dispatch(loadPlugin('p1'))
       .then(plugin => done.fail('Promise should have been rejected, instead got: ' + JSON.stringify(plugin)))
       .catch(error => {
         expect(store.actions).toHaveBeenCalledWith(setPluginStatus('p1', {
           loadStatus: NOT_LOADED,
           loadError
         }))
         done()
       })
    })
    it("dispatches installPlugin if plugin loaded successfully", (done) => {
      let loadedPlugin = Immutable.fromJS({key: 'p1', name: 'Plugin 1', hello: 'world'})
      let store = createTestStore(Immutable.fromJS({
        plugins: {
          p1: {
            key: 'p1',
            name: 'Plugin 1',
            load: (store, callback) => callback(undefined, loadedPlugin)
          }
        }
      }))
      store.dispatch(loadPlugin('p1'))
        .then(() => {
          expect(store.actions).toHaveBeenCalledWith(installPlugin(loadedPlugin))
          done()
        })
        .catch(error => done.fail(error))
    })
    it("returns resolved promise with plugin if it's already loaded", (done) => {
      let loadedPlugin = Immutable.fromJS({
        key: 'p1',
        name: 'Plugin 1',
        loadStatus: LOADED
      })
      let store = createTestStore(Immutable.fromJS({
        plugins: {
          p1: loadedPlugin
        }
      }))
      store.dispatch(loadPlugin('p1'))
        .then(plugin => {
          expect(plugin).toBe(loadedPlugin)
          done()
        })
        .catch(error => done.fail(error))
    })
  })
  it("applies plugins' middleware", () => {
    let index = 0
    let callsA = []
    let callsB = []
    let middlewareA = store => next => action => callsA.push({action, index: index++}) && next(action)
    let middlewareB = store => next => action => callsB.push({action, index: index++}) && next(action)

    let store = createTestStore(Immutable.fromJS({
      plugins: {
        a: {
          key: 'a',
          name: 'Plugin A',
          middleware: middlewareA
        },
        c: {
          key: 'c',
          name: 'Plugin C'
        },
        b: {
          key: 'b',
          name: 'Plugin B',
          middleware: middlewareB
        }
      }
    }))

    let action = {type: 'action1'}
    store.dispatch(action)
    expect(callsA).toEqual([{action, index: 0}])
    expect(callsB).toEqual([{action, index: 1}])
  })
})
