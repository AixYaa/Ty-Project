export interface ProTableColumn {
  prop?: string;
  label?: string;
  width?: string | number;
  type?: 'selection' | 'index' | 'expand' | 'operation';
  fixed?: 'left' | 'right';
  sortable?: boolean | 'custom';
  search?: SearchProps; // Search configuration
  isShow?: boolean | ((row: any) => boolean); // Whether to show this column (or specific row cell?) - Usually column level
  [key: string]: any;
}

export interface SearchProps {
  el?: 'input' | 'select' | 'date-picker' | 'time-picker' | 'switch';
  props?: any; // Props passed to the search component (e.g. placeholder, clearable)
  key?: string; // Key map if different from prop
  label?: string; // Label if different from column label
  defaultValue?: any;
  options?: any[]; // Options for select/radio/checkbox
}

export interface Pageable {
  pageNum: number;
  pageSize: number;
  total: number;
}
