import type { DockAction, DockState } from './chat-dock.types';

export const initialDock: DockState = { slots: [null, null], queue: [] };

/** Quản lý slot cửa sổ chat (tối đa 2) và hàng đợi thread bị minimize. */
export function dockReducer(state: DockState, action: DockAction): DockState {
  const { slots, queue } = state;
  const [a, b] = slots;
  const k = action.threadKey;

  switch (action.type) {
    case 'OPEN': {
      if (k == null) return state;
      if (k === a || k === b) return state;
      if (a == null) {
        return { ...state, slots: [k, b], queue: queue.filter((id) => id !== k) };
      }
      if (b == null) {
        return { ...state, slots: [a, k], queue: queue.filter((id) => id !== k) };
      }
      const bumped = a;
      const nextQueue = [bumped, ...queue.filter((id) => id !== k && id !== bumped)];
      return { slots: [b, k], queue: nextQueue };
    }
    case 'CLOSE': {
      if (k == null) return state;
      let nextQueue = queue.filter((id) => id !== k);
      if (k !== a && k !== b) {
        return { ...state, queue: nextQueue };
      }
      let na = k === a ? null : a;
      let nb = k === b ? null : b;
      if (nextQueue.length > 0) {
        const promote = nextQueue[0]!;
        nextQueue = nextQueue.slice(1);
        if (k === a) na = promote;
        else nb = promote;
      }
      return { slots: [na, nb], queue: nextQueue };
    }
    case 'MINIMIZE': {
      if (k == null) return state;
      if (k === a) {
        return {
          ...state,
          slots: [null, b],
          queue: [k, ...queue.filter((id) => id !== k)],
        };
      }
      if (k === b) {
        return {
          ...state,
          slots: [a, null],
          queue: [k, ...queue.filter((id) => id !== k)],
        };
      }
      return state;
    }
    case 'PROMOTE': {
      if (k == null || !queue.includes(k)) return state;
      const rest = queue.filter((id) => id !== k);
      if (b == null && a != null) {
        return { ...state, slots: [a, k], queue: rest };
      }
      if (a == null) {
        return { ...state, slots: [k, b], queue: rest };
      }
      const bumped = a;
      return { slots: [k, b], queue: [bumped, ...rest] };
    }
    case 'RESET':
      return initialDock;
    default:
      return state;
  }
}
