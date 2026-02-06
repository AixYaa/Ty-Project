import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RouteLocationNormalized } from 'vue-router';

export interface TagView extends Partial<RouteLocationNormalized> {
  title?: string;
  name?: string;
  fullPath?: string;
  meta?: any;
}

export const useTagsViewStore = defineStore('tagsView', () => {
  const visitedViews = ref<TagView[]>([]);
  const cachedViews = ref<string[]>([]);

  // Add View
  const addView = (view: TagView) => {
    addVisitedView(view);
    addCachedView(view);
  };

  const addVisitedView = (view: TagView) => {
    if (visitedViews.value.some((v) => v.path === view.path)) return;
    // Limit max tags? Maybe 20?
    // if (visitedViews.value.length >= 20) {
    //   visitedViews.value.shift();
    // }
    visitedViews.value.push(Object.assign({}, view, {
      title: view.meta?.title || 'no-name'
    }));
  };

  const addCachedView = (view: TagView) => {
    if (view.meta?.noCache) return;
    if (!view.name) return; // Cached views require name
    if (cachedViews.value.includes(view.name)) return;
    cachedViews.value.push(view.name);
  };

  // Delete View
  const delView = (view: TagView) => {
    return new Promise((resolve) => {
      delVisitedView(view);
      delCachedView(view);
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value]
      });
    });
  };

  const delVisitedView = (view: TagView) => {
    for (const [i, v] of visitedViews.value.entries()) {
      if (v.path === view.path) {
        visitedViews.value.splice(i, 1);
        break;
      }
    }
  };

  const delCachedView = (view: TagView) => {
    if (!view.name) return;
    const index = cachedViews.value.indexOf(view.name);
    index > -1 && cachedViews.value.splice(index, 1);
  };

  // Delete Others
  const delOthersViews = (view: TagView) => {
    return new Promise((resolve) => {
      delOthersVisitedViews(view);
      delOthersCachedViews(view);
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value]
      });
    });
  };

  const delOthersVisitedViews = (view: TagView) => {
    visitedViews.value = visitedViews.value.filter((v) => {
      return v.meta?.affix || v.path === view.path;
    });
  };

  const delOthersCachedViews = (view: TagView) => {
    if (!view.name) return;
    const index = cachedViews.value.indexOf(view.name);
    if (index > -1) {
      cachedViews.value = cachedViews.value.slice(index, index + 1);
    } else {
      cachedViews.value = [];
    }
  };

  // Delete All
  const delAllViews = () => {
    return new Promise((resolve) => {
      delAllVisitedViews();
      delAllCachedViews();
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value]
      });
    });
  };

  const delAllVisitedViews = () => {
    visitedViews.value = visitedViews.value.filter((tag) => tag.meta?.affix);
  };

  const delAllCachedViews = () => {
    cachedViews.value = [];
  };

  // Prune Invalid Views
  const pruneVisitedViews = (router: any) => {
    visitedViews.value = visitedViews.value.filter((view) => {
      if (view.meta?.affix) return true;
      if (!view.path) return false;
      
      const resolved = router.resolve(view.path);
      // Check if it matches the Catch-All route (assuming Catch-All has specific name or redirect)
      // Or simply check if it resolves to an existing route name that is not 'NotFound'
      // If the route is not found and no catch-all exists, matched might be empty or specific error? 
      // With catch-all, it always matches something.
      
      if (resolved.matched.length === 0) return false;
      
      // If it matches the catch-all route (we will name it 'NotFound' or check path pattern)
      const isNotFound = resolved.matched.some((record: any) => record.path === '/:pathMatch(.*)*' || record.name === 'NotFound');
      if (isNotFound) return false;

      return true;
    });
  };

  return {
    visitedViews,
    cachedViews,
    addView,
    addVisitedView,
    addCachedView,
    delView,
    delVisitedView,
    delCachedView,
    delOthersViews,
    delAllViews,
    pruneVisitedViews
  };
}, {
  persist: {
    pick: ['visitedViews'] // Correct property for pinia-plugin-persistedstate is 'pick' or just persist: true to persist state
  }
});
