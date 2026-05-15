<template>
  <div :class="['tags-view-container', `style-${tagsViewStyle}`]">
    <el-scrollbar ref="scrollContainer" class="tags-view-wrapper" @wheel.prevent="handleScroll">
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
        <el-icon
          v-if="!isAffix(tag)"
          class="el-icon-close"
          @click.prevent.stop="closeSelectedTag(tag)"
        >
          <Close />
        </el-icon>
      </router-link>
    </el-scrollbar>

    <!-- Context Menu -->
    <ul v-show="visible" :style="{ left: left + 'px', top: top + 'px' }" class="contextmenu">
      <li @click="refreshSelectedTag(selectedTag)">
        <el-icon><RefreshRight /></el-icon> 重新加载
      </li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">
        <el-icon><Close /></el-icon> 关闭当前
      </li>
      <li @click="closeOthersTags">
        <el-icon><CircleClose /></el-icon> 关闭其他
      </li>
      <li @click="closeAllTags">
        <el-icon><FolderDelete /></el-icon> 关闭所有
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTagsViewStore, type TagView } from '@/store/tagsView';
import { useSettingStore } from '@/store/setting';
import { Close, RefreshRight, CircleClose, FolderDelete } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';

const route = useRoute();
const router = useRouter();
const tagsViewStore = useTagsViewStore();
const settingStore = useSettingStore();
const { visitedViews } = storeToRefs(tagsViewStore);
const { tagsViewStyle } = storeToRefs(settingStore);

const visible = ref(false);
const top = ref(0);
const left = ref(0);
const selectedTag = ref<any>({});
const affixTags = ref<any[]>([]);
const scrollContainer = ref();

const handleScroll = (e: WheelEvent) => {
  if (scrollContainer.value) {
    const wrap = scrollContainer.value.wrapRef;
    if (wrap) {
      wrap.scrollLeft += e.deltaY;
    }
  }
};

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

  // Create a blank/dummy route redirection to force component re-render
  // If no dedicated redirect page exists, we push to a non-existent path and catch it back to fullPath
  router
    .push({ path: '/redirect-dummy' })
    .catch(() => {})
    .finally(() => {
      nextTick(() => {
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
      router
        .push({ path: '/redirect-dummy' })
        .catch(() => {})
        .finally(() => {
          nextTick(() => {
            router.replace(view.fullPath);
          });
        });
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
  --tags-shell-bg: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
  --tags-shell-border: rgba(15, 23, 42, 0.08);
  --tags-item-bg: rgba(255, 255, 255, 0.72);
  --tags-item-hover-bg: rgba(var(--el-color-primary-rgb), 0.1);
  --tags-item-active-bg: #ffffff;
  --tags-item-color: #475569;
  --tags-item-hover-color: #1e293b;
  --tags-item-active-color: var(--el-color-primary);
  --tags-item-border: rgba(148, 163, 184, 0.18);
  --tags-item-active-border: rgba(var(--el-color-primary-rgb), 0.2);
  --tags-item-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
  --tags-item-active-shadow: 0 10px 24px rgba(var(--el-color-primary-rgb), 0.16);
  --tags-track-bg: rgba(148, 163, 184, 0.08);
  --tags-track-border: rgba(148, 163, 184, 0.12);
  height: 46px;
  width: 100%;
  display: flex;
  align-items: center;
  background: var(--tags-shell-bg);
  border-bottom: 1px solid var(--tags-shell-border);
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.6);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.tags-view-wrapper {
  flex: 1;
  min-width: 0;

  .tags-view-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    height: 32px;
    line-height: 32px;
    border: 1px solid var(--tags-item-border);
    color: var(--tags-item-color);
    background: var(--tags-item-bg);
    padding: 0 14px;
    font-size: 13px;
    font-weight: 500;
    margin-right: 8px;
    text-decoration: none;
    border-radius: 10px;
    transition: all 0.22s ease;
    user-select: none;
    box-shadow: var(--tags-item-shadow);
    white-space: nowrap;

    &:first-of-type {
      margin-left: 0;
    }

    &:hover {
      color: var(--tags-item-hover-color);
      border-color: rgba(var(--el-color-primary-rgb), 0.18);
      background: var(--tags-item-hover-bg);
      transform: translateY(-1px);
    }

    &.active {
      color: var(--tags-item-active-color);
      background: var(--tags-item-active-bg);
      border-color: var(--tags-item-active-border);
      box-shadow: var(--tags-item-active-shadow);
    }
  }
}

.tags-view-wrapper :deep(.el-scrollbar__view) {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  min-width: 100%;
  min-height: 46px;
  padding: 0 12px;
}

.tags-view-wrapper :deep(.el-scrollbar__wrap) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tags-view-wrapper :deep(.el-scrollbar__wrap::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}

.tags-view-wrapper :deep(.el-scrollbar__bar) {
  display: none !important;
}

.el-icon-close {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  text-align: center;
  transition: all 0.2s ease;
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  opacity: 0.66;

  &:before {
    transform: scale(0.8);
  }

  &:hover {
    opacity: 1;
    background-color: rgba(239, 68, 68, 0.14);
    color: #fff;
  }
}

.tags-view-item:hover .el-icon-close,
.tags-view-item.active .el-icon-close {
  opacity: 0.88;
}

.tags-view-item.active .el-icon-close:hover {
  background-color: rgba(239, 68, 68, 0.18);
  color: #ef4444;
}

.contextmenu {
  margin: 0;
  background: rgba(255, 255, 255, 0.92);
  z-index: 3000;
  position: absolute;
  list-style-type: none;
  padding: 8px 0;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
  border: 1px solid rgba(148, 163, 184, 0.18);
  min-width: 136px;
  backdrop-filter: blur(14px);

  li {
    margin: 0;
    padding: 10px 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 6px;
    border-radius: 8px;

    .el-icon {
      font-size: 15px;
      color: #94a3b8;
    }

    &:hover {
      background: rgba(var(--el-color-primary-rgb), 0.1);
      color: var(--el-color-primary);

      .el-icon {
        color: var(--el-color-primary);
      }
    }
  }
}

/* Style Overrides */

.style-button {
  .tags-view-item.active {
    background: linear-gradient(
      135deg,
      rgba(var(--el-color-primary-rgb), 0.16) 0%,
      rgba(var(--el-color-primary-rgb), 0.08) 100%
    );
  }
}

.style-google {
  .tags-view-container {
    height: 44px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  }

  .tags-view-wrapper .tags-view-item {
    height: 34px;
    line-height: 34px;
    margin-right: 6px;
    border-radius: 12px 12px 0 0;
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    color: #64748b;

    &:hover {
      background: rgba(148, 163, 184, 0.12);
      color: #0f172a;
      transform: none;
    }

    &.active {
      background: #ffffff;
      border-color: rgba(148, 163, 184, 0.18);
      border-bottom-color: #ffffff;
      color: var(--el-color-primary);
      box-shadow:
        0 -1px 0 rgba(255, 255, 255, 0.9),
        0 10px 20px rgba(15, 23, 42, 0.08);
      transform: translateY(1px);
    }
  }
}

.style-smooth {
  .tags-view-wrapper :deep(.el-scrollbar__view) {
    padding: 0 12px;
  }

  .tags-view-wrapper {
    margin: 0 12px;
    border: 1px solid var(--tags-track-border);
    border-radius: 14px;
    background: var(--tags-track-bg);
  }

  .tags-view-item {
    height: 30px;
    line-height: 30px;
    margin-right: 6px;
    border-radius: 10px;
    border-color: transparent;
    background: transparent;
    box-shadow: none;

    &:first-of-type {
      margin-left: 6px;
    }

    &:hover {
      transform: none;
      background: rgba(var(--el-color-primary-rgb), 0.08);
    }

    &.active {
      background: #ffffff;
      border-color: rgba(255, 255, 255, 0.6);
      box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
    }
  }
}

html.dark {
  .tags-view-container {
    --tags-shell-bg: linear-gradient(180deg, #111318 0%, #151922 100%);
    --tags-shell-border: rgba(148, 163, 184, 0.12);
    --tags-item-bg: rgba(30, 41, 59, 0.5);
    --tags-item-hover-bg: rgba(71, 85, 105, 0.36);
    --tags-item-active-bg: linear-gradient(
      135deg,
      rgba(30, 41, 59, 0.95) 0%,
      rgba(17, 24, 39, 0.98) 100%
    );
    --tags-item-color: #94a3b8;
    --tags-item-hover-color: #e2e8f0;
    --tags-item-active-color: #8ec5ff;
    --tags-item-border: rgba(148, 163, 184, 0.14);
    --tags-item-active-border: rgba(96, 165, 250, 0.28);
    --tags-item-shadow: none;
    --tags-item-active-shadow: 0 12px 28px rgba(2, 8, 23, 0.34);
    --tags-track-bg: rgba(15, 23, 42, 0.7);
    --tags-track-border: rgba(148, 163, 184, 0.12);
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.03);
  }

  .contextmenu {
    background: rgba(15, 23, 42, 0.92);
    color: #e2e8f0;
    border-color: rgba(148, 163, 184, 0.16);
    box-shadow: 0 18px 40px rgba(2, 8, 23, 0.42);

    li .el-icon {
      color: #94a3b8;
    }
  }

  .style-google {
    .tags-view-container {
      background: linear-gradient(180deg, #10131a 0%, #141922 100%);
    }

    .tags-view-wrapper .tags-view-item {
      color: #94a3b8;

      &:hover {
        background: rgba(51, 65, 85, 0.58);
        color: #e2e8f0;
      }

      &.active {
        background: #181d27;
        border-color: rgba(96, 165, 250, 0.2);
        border-bottom-color: #181d27;
        color: #8ec5ff;
        box-shadow:
          0 -1px 0 rgba(24, 29, 39, 0.92),
          0 12px 28px rgba(2, 8, 23, 0.28);
      }
    }
  }

  .style-smooth {
    .tags-view-item.active {
      background: rgba(30, 41, 59, 0.96);
      border-color: rgba(96, 165, 250, 0.16);
      box-shadow: 0 10px 24px rgba(2, 8, 23, 0.26);
    }
  }

  .el-icon-close:hover,
  .tags-view-item.active .el-icon-close:hover {
    background-color: rgba(239, 68, 68, 0.18);
    color: #fca5a5;
  }
}
</style>
