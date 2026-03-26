import { useUserStore } from '@/store/user';

export const usePermission = () => {
  const userStore = useUserStore();

  const hasPermission = (permission: string): boolean => {
    return userStore.hasPermission(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return userStore.hasAnyPermission(permissions);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (userStore.permissions.includes('*')) return true;
    return permissions.every((p) => userStore.permissions.includes(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
};
