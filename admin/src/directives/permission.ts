import { useUserStore } from '@/store/user';
import type { Directive, DirectiveBinding } from 'vue';

export const permissionDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding;
    const userStore = useUserStore();

    if (value) {
      const requiredPermissions = Array.isArray(value) ? value : [value];
      const hasPermission =
        requiredPermissions.some((p) => userStore.permissions.includes(p)) ||
        userStore.permissions.includes('*');

      if (!hasPermission) {
        el.parentNode?.removeChild(el);
      }
    }
  }
};

export const vPermission = permissionDirective;

export const checkPermission = (permission: string | string[]): boolean => {
  const userStore = useUserStore();
  const requiredPermissions = Array.isArray(permission) ? permission : [permission];
  return (
    requiredPermissions.some((p) => userStore.permissions.includes(p)) ||
    userStore.permissions.includes('*')
  );
};
