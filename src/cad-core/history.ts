import type { CadCommand } from "./command";

export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function executeCommand<T>(state: HistoryState<T>, cmd: CadCommand & { apply: (doc: T) => T }): HistoryState<T> {
  const next = cmd.apply(state.present);
  if (next === state.present) return state;
  return { past: [...state.past, state.present], present: next, future: [] };
}

export function undo<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.past.length === 0) return state;
  const past = state.past.slice();
  const previous = past.pop()!;
  return { past, present: previous, future: [state.present, ...state.future] };
}

export function redo<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.future.length === 0) return state;
  const [next, ...rest] = state.future;
  return { past: [...state.past, state.present], present: next, future: rest };
}

