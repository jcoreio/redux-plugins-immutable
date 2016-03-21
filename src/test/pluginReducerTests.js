/* @flow */

import Immutable from 'immutable';
import {createReducer} from 'mindfront-redux-utils';
import pluginReducer from '../lib/pluginReducer';

import {NOT_LOADED, LOADED} from '../lib/pluginTypes';

import {addPlugin, installPlugin, setPluginStatus} from '../lib/pluginActions';

describe('pluginReducer', () => {
  it('works when there are no plugins', () => {
    let state = Immutable.Map();
    state = pluginReducer(state, {type: 'fake'});
  });
  describe('addPlugin handler', () => {
    it("adds plugin iff not present", () => {
      let state = Immutable.Map();
      let plugin = Immutable.fromJS({
        key: 'p1',
        name: 'Plugin 1'
      });

      state = pluginReducer(state, addPlugin(plugin));
      expect(state.toJS().plugins.p1).toEqual(jasmine.objectContaining(plugin.toJS()));

      // now make sure another addPlugin won't overwrite it
      let newPlugin = Immutable.fromJS({
        key: 'p1',
        name: 'Plugin 2'
      });

      state = pluginReducer(state, addPlugin(newPlugin));
      expect(state.toJS().plugins.p1).toEqual(jasmine.objectContaining(plugin.toJS()));
    });
    it("sets loadStatus to NOT_LOADED if missing", () => {
      let state = Immutable.Map();
      let plugin: Plugin = Immutable.fromJS({
        key: 'p1',
        name: 'Plugin 1'
      });

      state = pluginReducer(state, addPlugin(plugin));
      expect(state.toJS().plugins.p1.loadStatus).toEqual(NOT_LOADED);
    });
  });
  describe('installPlugin handler', () => {
    it("adds plugin if not present", () => {
      let state = Immutable.Map();
      let plugin = Immutable.fromJS({
        key: 'p1',
        name: 'Plugin 1',
        reducer: (state, action) => state
      });

      state = pluginReducer(state, installPlugin(plugin));
      expect(state.toJS().plugins.p1).toEqual(jasmine.objectContaining(plugin.toJS()));
    });
    it("merges into existing", () => {
      let state = Immutable.Map();
      let plugin = Immutable.fromJS({
        key: 'p1',
        name: 'Plugin 1',
        reducer: (state, action) => state
      });

      state = pluginReducer(state, addPlugin(plugin));
      expect(state.toJS().plugins.p1).toEqual(jasmine.objectContaining(plugin.toJS()));

      let loadedPlugin = Immutable.fromJS({
        key: 'p1',
        name: 'Plugin 1+',
        middleware: store => next => action => next(action)
      });

      state = pluginReducer(state, installPlugin(loadedPlugin));
      expect(state.toJS().plugins.p1).toEqual(jasmine.objectContaining(loadedPlugin.toJS()));
    });
    it("marks plugin loaded without errors", () => {
      let state = Immutable.Map();

      let loadedPlugin = Immutable.fromJS({
        key: 'p1',
        name: 'Plugin 1+',
        loadStatus: NOT_LOADED,
        loadError: new Error('this should get deleted'),
        middleware: store => next => action => next(action)
      });

      state = pluginReducer(state, installPlugin(loadedPlugin));
      expect(state.toJS().plugins.p1.loadStatus).toEqual(LOADED);
      expect(state.toJS().plugins.p1.loadError).toBeUndefined();
    });
  });

  describe('setPluginStatus handler', () => {
    let initialState = Immutable.fromJS({
      plugins: {
        p1: {
          key: 'p1',
          name: 'Plugin 1',
          loadStatus: NOT_LOADED
        },
        p2: {
          key: 'p2',
          name: 'Plugin 2',
          loadStatus: NOT_LOADED,
          loadError: new Error('delete me')
        }
      }
    });

    it('only affects plugin with given key', () => {
      let state = pluginReducer(initialState, setPluginStatus('p2', {loadStatus: LOADED}));
      expect(state.toJS().plugins.p1.loadStatus).toEqual(NOT_LOADED);
      expect(state.toJS().plugins.p2.loadStatus).toEqual(LOADED);

      state = pluginReducer(state, setPluginStatus('p1', {loadStatus: LOADED}));
      expect(state.toJS().plugins.p1.loadStatus).toEqual(LOADED);
      expect(state.toJS().plugins.p2.loadStatus).toEqual(LOADED);
    });
    it("doesn't set loadStatus if not present", () => {
      let state = pluginReducer(initialState, setPluginStatus('p1', {}));
      expect(state.toJS().plugins.p1.loadStatus).toBe(NOT_LOADED);
    });
    it("sets loadError if present", () => {
      let loadError = new Error('this should get set');
      let state = pluginReducer(initialState, setPluginStatus('p1', {loadError}));
      expect(state.toJS().plugins.p1.loadError).toBe(loadError);
    });
    it("deletes loadError if not present", () => {
      let state = pluginReducer(initialState, setPluginStatus('p2', {}));
      expect('loadError' in state.toJS().plugins.p1).toBe(false);
    });
  });

  it("applies plugins' reducers", () => {
    let state = Immutable.fromJS({
      plugins: {
        p1: {
          key: 'p1',
          name: 'Plugin 1',
          reducer: createReducer({
            a: (state, action) => state.set('a', action.payload)
          })
        },
        p2: {
          key: 'p2',
          name: 'Plugin 2'
          // reducer left out, to make sure this doesn't trip up pluginReducer
        },
        p3: {
          key: 'p3',
          name: 'Plugin 3',
          reducer: createReducer({
            a: (state, action) => state.update('a', a => a + 1),
            b: (state, action) => state.set('b', action.payload)
          })
        }
      }
    });

    state = pluginReducer(state, {type: 'a', payload: 3});
    expect(state.get('a')).toBe(4);

    state = pluginReducer(state, {type: 'b', payload: 10});
    expect(state.get('a')).toBe(4);
    expect(state.get('b')).toBe(10);
  });
});
