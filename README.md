# redux-plugins-immutable

Asynchronously load Redux reducers and middleware, React Components, etc. in app plugins.

## Requirements

* ES6 polyfills (corejs)
* Your Redux state must be an Immutable.js keyed collection.  If you want to use this library
  with POJOs, you'll have to port it to do so.

## Usage Example

```js
import Immutable from 'immutable';
import {createStore, applyMiddleware} from 'redux';
import {composeReducers} from 'mindfront-redux-utils';
import {pluginMiddleware, pluginReducer, pluginActions} from 'redux-plugins-immutable';
const {addPlugin, loadPlugin} = pluginActions;

import MyReducer from './MyReducer';

const store = applyMiddleware(pluginMiddleware)(createStore)(
  composeReducers(MyReducer, pluginReducer),
  Immutable.Map()
);

const PLUGIN_KEY = 'MyPlugin';

const Plugin = Immutable.fromJS({
  key: PLUGIN_KEY,

  // this method will be called when a loadPlugin action is dispatched with this plugin's key.
  // it is passed the Redux store and a node-style callback.
  // the result it passes to the callback will get shallow merged into this plugin in Redux state.
  load(store, callback) {
    require.ensure(['./MyPluginReducer', './MyPluginMiddleware', './MyPluginComponent'], require => {
      callback(undefined, Immutable.fromJS({
        reducer: require('./MyPluginReducer').default,
        middleware: require('./MyPluginMiddleware').default,
        components: {
          MyPluginComponent: require('./MyPluginComponent').default      
        }
      }));
    });
  } 
});

// this puts Plugin in the Redux state at ['plugins', PLUGIN_KEY]
store.dispatch(addPlugin(Plugin));

// ...

// Sometime later, when you need to load the plugin:

// this will call Plugin's load() method.
store.dispatch(loadPlugin(PLUGIN_KEY)).then(plugin => {
  // at this point the plugin is loaded (all the fields passed to the load() callback
  // have been merged into the Redux state for the plugin).

  // pluginReducer will apply Plugin's reducer, and pluginMiddleware will apply Plugin's middleware.

  // Plugin's MyPluginComponent will be available to use as well.
});

```