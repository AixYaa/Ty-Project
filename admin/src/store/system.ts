import { defineStore } from 'pinia';
import { getSystemInfo, getCopyrightInfo, getMaintenanceStatus } from '@/api/common';

export interface SystemInfo {
  systemName: string;
  systemVersion: string;
  systemDescription: string;
  defaultLanguage: string;
  timezone: string;
  systemLogo: string;
}

export interface CopyrightInfo {
  copyright: string;
  icpLicense: string;
}

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
}

export const useSystemStore = defineStore('system', {
  state: () => ({
    systemName: '管理平台',
    systemVersion: '',
    systemDescription: '',
    defaultLanguage: 'zh-CN',
    timezone: 'Asia/Shanghai',
    systemLogo: '',
    copyright: '© 2024 AixProject. All rights reserved.',
    icpLicense: '',
    maintenanceEnabled: false,
    maintenanceMessage: '',
    isLoaded: false
  }),

  actions: {
    async loadSystemInfo() {
      try {
        const [sysInfo, copyright, maintenance] = await Promise.all([
          getSystemInfo(),
          getCopyrightInfo(),
          getMaintenanceStatus()
        ]);

        if (sysInfo) {
          this.systemName = sysInfo.systemName || '管理平台';
          this.systemVersion = sysInfo.systemVersion || '';
          this.systemDescription = sysInfo.systemDescription || '';
          this.defaultLanguage = sysInfo.defaultLanguage || 'zh-CN';
          this.timezone = sysInfo.timezone || 'Asia/Shanghai';
          this.systemLogo = sysInfo.systemLogo || '';
        }

        if (copyright) {
          this.copyright = copyright.copyright || '© 2024 AixProject. All rights reserved.';
          this.icpLicense = copyright.icpLicense || '';
        }

        if (maintenance) {
          this.maintenanceEnabled = maintenance.enabled;
          this.maintenanceMessage = maintenance.message || '系统正在维护中，请稍后再试...';
        }

        this.isLoaded = true;
      } catch (error) {
        console.error('Failed to load system info:', error);
        this.isLoaded = true;
      }
    },

    getSystemInfo() {
      return {
        systemName: this.systemName,
        systemVersion: this.systemVersion,
        systemDescription: this.systemDescription,
        defaultLanguage: this.defaultLanguage,
        timezone: this.timezone,
        systemLogo: this.systemLogo
      };
    },

    getCopyrightInfo() {
      return {
        copyright: this.copyright,
        icpLicense: this.icpLicense
      };
    },

    getMaintenanceStatus() {
      return {
        enabled: this.maintenanceEnabled,
        message: this.maintenanceMessage
      };
    },

    setMaintenanceMode(enabled: boolean, message: string = '') {
      this.maintenanceEnabled = enabled;
      if (message) {
        this.maintenanceMessage = message;
      }
    }
  }
});
