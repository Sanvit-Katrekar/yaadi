export interface CheckItem {
  id: string;
  text: string;
  checked: boolean;
  doNotCarry?: boolean;
}

export interface Section {
  id: string;
  title: string;
  items: CheckItem[];
}

export interface TodoList {
  id: string;
  title: string;
  icon: string;
  description: string;
  sections: Section[];
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  lists: TodoList[];
  activeListId: string | null;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export const INITIAL_STATE: AppState = {
  activeListId: null,
  lists: []
}
