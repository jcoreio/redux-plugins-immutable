/* @flow */

export type Action = any;

export type State = any;

export type Dispatch = (action: Action) => any;

export type Store = {
  dispatch: Dispatch,
  getState: () => State,
};

export type Reducer = (state: State, action: Action) => State;

export type Middleware = (store: Store) => (next: (action: Action) => any) => (action: Action) => any;
