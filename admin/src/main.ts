import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import IconSelect from '@/components/IconSelect/index.vue'

const app = createApp(App)

// 注册所有图标
try {
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
} catch (error) {
  console.error('Failed to register icons:', error);
}

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.component('IconSelect', IconSelect)

// 引入权限控制 (要在 use(router) 之后)
import './router/permission';

app.mount('#app')
