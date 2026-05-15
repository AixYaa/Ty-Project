import { defineStore } from 'pinia';
import { getDictionaryByCode, type SysDictionary } from '../api/sys';

interface DictionaryState {
  dicts: Record<string, SysDictionary['items']>;
}

export const useDictionaryStore = defineStore('dictionary', {
  state: (): DictionaryState => ({
    dicts: {}
  }),
  actions: {
    async fetchDictionary(code: string) {
      if (this.dicts[code]) {
        return this.dicts[code];
      }
      try {
        const res = await getDictionaryByCode(code);
        if (res && res.items) {
          this.dicts[code] = res.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        }
      } catch (error) {
        console.error(`Failed to fetch dictionary: ${code}`, error);
      }
      return this.dicts[code] || [];
    },
    getDictLabel(code: string, value: string | number) {
      const items = this.dicts[code];
      if (!items) return value;
      const item = items.find((i) => i.value === value);
      return item ? item.label : value;
    },
    clearDicts() {
      this.dicts = {};
    }
  }
});
