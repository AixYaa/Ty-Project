<template>
  <div class="tags-view-container">
    <el-scrollbar class="tags-view-wrapper">
      <router-link
        v-for="tag in visitedViews"
        :key="tag.path"
        :to="{ path: tag.path, query: tag.query }"
        class="tags-view-item"
        :class="isActive(tag) ? 'active' : ''"
        @click.middle="closeSelectedTag(tag)"
        @contextmenu.prevent="openMenu(tag, $event)"
      >
        {{ $t(tag.title || '') }}
        <el-icon v-if="!isAffix(tag)" class="el-icon-close" @click.prevent.stop="closeSelectedTag(tag)">
          <Close />
        </el-icon>
      </router-link>
    </el-scrollbar>
    
    <!-- Context Menu -->
    <ul v-show="visible" :style="{ left: left + 'px', top: top + 'px' }" class="contextmenu">
      <li @click="refreshSelectedTag(selectedTag)">刷新</li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">关闭当前</li>
      <li @click="closeOthersTags">关闭其他</li>
      <li @click="closeAllTags">关闭所有</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTagsViewStore, type TagView } from '@/store/tagsView';
import { Close } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';

const route = useRoute();
const router = useRouter();
const tagsViewStore = useTagsViewStore();
const { visitedViews } = storeToRefs(tagsViewStore);

const visible = ref(false);
const top = ref(0);
const left = ref(0);
const selectedTag = ref<any>({});
const affixTags = ref<any[]>([]);

const isActive = (tag: any) => {
  return tag.path === route.path;
};

const isAffix = (tag: any) => {
  return tag.meta && tag.meta.affix;
};

const addTags = () => {
  const { name } = route;
  if (name) {
    // Cast route to TagView to avoid type mismatch for 'name' property
    tagsViewStore.addView({
      ...route,
      name: route.name as string,
      meta: route.meta,
      path: route.path,
      fullPath: route.fullPath,
      query: route.query,
      params: route.params
    } as TagView);
  }
  return false;
};

const closeSelectedTag = (view: any) => {
  tagsViewStore.delView(view).then(({ visitedViews }: any) => {
    if (isActive(view)) {
      toLastView(visitedViews, view);
    }
  });
};

const refreshSelectedTag = (view: any) => {
  tagsViewStore.delCachedView(view);
  const { fullPath } = view;
  nextTick(() => {
    router.replace({
      path: '/redirect' + fullPath
    }).catch(() => {
      // If redirect route doesn't exist, just reload current route
       router.replace(fullPath);
    });
  });
};

const closeOthersTags = () => {
  router.push(selectedTag.value);
  tagsViewStore.delOthersViews(selectedTag.value).then(() => {
    // moveToCurrentTag();
  });
};

const closeAllTags = () => {
  tagsViewStore.delAllViews().then(({ visitedViews }: any) => {
    if (affixTags.value.some((tag) => tag.path === route.path)) {
      return;
    }
    toLastView(visitedViews, route);
  });
};

const toLastView = (visitedViews: any[], view: any) => {
  const latestView = visitedViews.slice(-1)[0];
  if (latestView) {
    router.push(latestView.fullPath);
  } else {
    // now the default is to redirect to the home page if there is no tags-view,
    // you can adjust it according to your needs.
    if (view.name === 'Dashboard') {
      // to reload home page
      router.replace({ path: '/redirect' + view.fullPath });
    } else {
      router.push('/');
    }
  }
};

const openMenu = (tag: any, e: MouseEvent) => {
  // Logic to calculate position can be improved
  left.value = e.clientX; // e.clientX + 15
  top.value = e.clientY; 
  visible.value = true;
  selectedTag.value = tag;
};

const closeMenu = () => {
  visible.value = false;
};

watch(
  () => route.path,
  () => {
    addTags();
    // moveToCurrentTag();
  }
);

watch(visible, (value) => {
  if (value) {
    document.body.addEventListener('click', closeMenu);
  } else {
    document.body.removeEventListener('click', closeMenu);
  }
});

onMounted(() => {
  addTags();
});
</script>

<style scoped>
.tags-view-container {
  height: 38px;
  width: 100%;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  /* box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); */
}

.tags-view-wrapper {
  .tags-view-item {
    display: inline-block;
    position: relative;
    cursor: pointer;
    height: 30px;
    line-height: 30px;
    border: 1px solid #dcdfe6;
    color: #606266;
    background: #fff;
    padding: 0 12px;
    font-size: 12px;
    margin-left: 6px;
    margin-top: 4px;
    text-decoration: none;
    border-radius: 4px;
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
    
    &:first-of-type {
      margin-left: 15px;
    }
    
    &:last-of-type {
      margin-right: 15px;
    }

    &:hover {
      border-color: var(--el-color-primary-light-5);
      color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
    }

    &.active {
      background-color: var(--el-color-primary);
      color: #fff;
      border-color: var(--el-color-primary);
      box-shadow: 0 2px 4px 0 rgba(var(--el-color-primary-rgb), 0.3);
      
      &::before {
        content: '';
        background: #fff;
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        position: relative;
        margin-right: 4px;
        vertical-align: 1px;
      }
    }
  }
}

.tags-view-wrapper :deep(.el-scrollbar__view) {
  white-space: nowrap;
}

.el-icon-close {
  width: 14px;
  height: 14px;
  vertical-align: -1px;
  border-radius: 50%;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  transform-origin: 100% 50%;
  margin-left: 4px;
  
  &:before {
    transform: scale(0.7);
    display: inline-block;
    vertical-align: -2px;
  }
  
  &:hover {
    background-color: rgba(0,0,0,0.2);
    color: #fff;
  }
}

/* Modify hover style for active tag close icon */
.tags-view-item.active .el-icon-close:hover {
  background-color: rgba(255,255,255,0.3);
}

.contextmenu {
  margin: 0;
  background: #fff;
  z-index: 3000;
  position: absolute;
  list-style-type: none;
  padding: 5px 0;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 400;
  color: #333;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #ebeef5;
  
  li {
    margin: 0;
    padding: 7px 16px;
    cursor: pointer;
    transition: background 0.3s;
    
    &:hover {
      background: #f5f7fa;
      color: var(--el-color-primary);
    }
  }
}
</style>
