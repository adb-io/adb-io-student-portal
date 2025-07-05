/**
 * ADB-IO Student Portal - Storage Utilities
 * Green Computing: Efficient local storage management
 */

class StorageManager {
    constructor() {
        this.prefix = 'adb_io_';
        this.version = '1.0';
        this.maxSize = 5 * 1024 * 1024; // 5MB limit
        this.compressionThreshold = 1024; // Compress data larger than 1KB
        
        this.init();
    }

    init() {
        this.checkStorageSupport();
        this.migrateOldData();
        this.cleanupExpiredData();
    }

    checkStorageSupport() {
        this.hasLocalStorage = this.isStorageAvailable('localStorage');
        this.hasSessionStorage = this.isStorageAvailable('sessionStorage');
        this.hasIndexedDB = 'indexedDB' in window;
        
        if (!this.hasLocalStorage && !this.hasSessionStorage) {
            console.warn('No storage support available');
        }
    }

    isStorageAvailable(type) {
        try {
            const storage = window[type];
            const test = '__storage_test__';
            storage.setItem(test, test);
            storage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Key management
    getKey(key) {
        return `${this.prefix}${key}`;
    }

    // Local Storage methods
    setLocal(key, value, options = {}) {
        if (!this.hasLocalStorage) {
            console.warn('localStorage not available');
            return false;
        }

        try {
            const data = this.prepareData(value, options);
            const serialized = JSON.stringify(data);
            
            // Check size limit
            if (serialized.length > this.maxSize) {
                console.warn('Data too large for localStorage');
                return false;
            }
            
            localStorage.setItem(this.getKey(key), serialized);
            return true;
        } catch (error) {
            console.error('Failed to set localStorage item:', error);
            return false;
        }
    }

    getLocal(key, defaultValue = null) {
        if (!this.hasLocalStorage) {
            return defaultValue;
        }

        try {
            const item = localStorage.getItem(this.getKey(key));
            if (item === null) return defaultValue;
            
            const data = JSON.parse(item);
            return this.processRetrievedData(data, defaultValue);
        } catch (error) {
            console.error('Failed to get localStorage item:', error);
            return defaultValue;
        }
    }

    removeLocal(key) {
        if (!this.hasLocalStorage) return false;
        
        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (error) {
            console.error('Failed to remove localStorage item:', error);
            return false;
        }
    }

    // Session Storage methods
    setSession(key, value, options = {}) {
        if (!this.hasSessionStorage) {
            console.warn('sessionStorage not available');
            return false;
        }

        try {
            const data = this.prepareData(value, options);
            const serialized = JSON.stringify(data);
            
            sessionStorage.setItem(this.getKey(key), serialized);
            return true;
        } catch (error) {
            console.error('Failed to set sessionStorage item:', error);
            return false;
        }
    }

    getSession(key, defaultValue = null) {
        if (!this.hasSessionStorage) {
            return defaultValue;
        }

        try {
            const item = sessionStorage.getItem(this.getKey(key));
            if (item === null) return defaultValue;
            
            const data = JSON.parse(item);
            return this.processRetrievedData(data, defaultValue);
        } catch (error) {
            console.error('Failed to get sessionStorage item:', error);
            return defaultValue;
        }
    }

    removeSession(key) {
        if (!this.hasSessionStorage) return false;
        
        try {
            sessionStorage.removeItem(this.getKey(key));
            return true;
        } catch (error) {
            console.error('Failed to remove sessionStorage item:', error);
            return false;
        }
    }

    // Generic storage methods (auto-select storage type)
    set(key, value, options = {}) {
        const { persistent = false, ...otherOptions } = options;
        
        if (persistent) {
            return this.setLocal(key, value, otherOptions);
        } else {
            return this.setSession(key, value, otherOptions);
        }
    }

    get(key, defaultValue = null) {
        // Try session storage first, then local storage
        let value = this.getSession(key);
        if (value === null) {
            value = this.getLocal(key);
        }
        return value !== null ? value : defaultValue;
    }

    remove(key) {
        const sessionRemoved = this.removeSession(key);
        const localRemoved = this.removeLocal(key);
        return sessionRemoved || localRemoved;
    }

    // Data preparation and processing
    prepareData(value, options = {}) {
        const { 
            expires = null, 
            compress = false,
            encrypt = false 
        } = options;

        let data = {
            value,
            timestamp: Date.now(),
            version: this.version
        };

        // Add expiration
        if (expires) {
            data.expires = Date.now() + (expires * 1000);
        }

        // Compression (simple base64 for demo - use proper compression in production)
        if (compress || JSON.stringify(data).length > this.compressionThreshold) {
            data.compressed = true;
            data.value = btoa(JSON.stringify(value));
        }

        // Encryption placeholder (implement proper encryption in production)
        if (encrypt) {
            data.encrypted = true;
            // data.value = this.encrypt(data.value);
        }

        return data;
    }

    processRetrievedData(data, defaultValue) {
        // Check version compatibility
        if (data.version !== this.version) {
            console.warn('Storage version mismatch, returning default value');
            return defaultValue;
        }

        // Check expiration
        if (data.expires && Date.now() > data.expires) {
            return defaultValue;
        }

        let value = data.value;

        // Decompress if needed
        if (data.compressed) {
            try {
                value = JSON.parse(atob(value));
            } catch (error) {
                console.error('Failed to decompress data:', error);
                return defaultValue;
            }
        }

        // Decrypt if needed
        if (data.encrypted) {
            // value = this.decrypt(value);
        }

        return value;
    }

    // Cache management
    setCache(key, value, ttlSeconds = 3600) {
        return this.setSession(key, value, { expires: ttlSeconds });
    }

    getCache(key, defaultValue = null) {
        return this.getSession(key, defaultValue);
    }

    clearCache(pattern = null) {
        if (!this.hasSessionStorage) return;

        const keys = Object.keys(sessionStorage);
        const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));

        prefixedKeys.forEach(key => {
            if (!pattern || key.includes(pattern)) {
                sessionStorage.removeItem(key);
            }
        });
    }

    // User preferences
    setPreference(key, value) {
        const preferences = this.getLocal('user_preferences', {});
        preferences[key] = value;
        return this.setLocal('user_preferences', preferences);
    }

    getPreference(key, defaultValue = null) {
        const preferences = this.getLocal('user_preferences', {});
        return preferences[key] !== undefined ? preferences[key] : defaultValue;
    }

    getAllPreferences() {
        return this.getLocal('user_preferences', {});
    }

    removePreference(key) {
        const preferences = this.getLocal('user_preferences', {});
        delete preferences[key];
        return this.setLocal('user_preferences', preferences);
    }

    // Offline data management
    setOfflineData(key, value) {
        return this.setLocal(`offline_${key}`, value);
    }

    getOfflineData(key, defaultValue = null) {
        return this.getLocal(`offline_${key}`, defaultValue);
    }

    clearOfflineData() {
        if (!this.hasLocalStorage) return;

        const keys = Object.keys(localStorage);
        const offlineKeys = keys.filter(key => key.startsWith(`${this.prefix}offline_`));

        offlineKeys.forEach(key => {
            localStorage.removeItem(key);
        });
    }

    // Storage analytics
    getStorageUsage() {
        const usage = {
            localStorage: { used: 0, available: 0, items: 0 },
            sessionStorage: { used: 0, available: 0, items: 0 }
        };

        if (this.hasLocalStorage) {
            const localKeys = Object.keys(localStorage);
            const localSize = localKeys.reduce((size, key) => {
                return size + key.length + (localStorage.getItem(key) || '').length;
            }, 0);
            
            usage.localStorage = {
                used: localSize,
                available: this.maxSize - localSize,
                items: localKeys.filter(key => key.startsWith(this.prefix)).length
            };
        }

        if (this.hasSessionStorage) {
            const sessionKeys = Object.keys(sessionStorage);
            const sessionSize = sessionKeys.reduce((size, key) => {
                return size + key.length + (sessionStorage.getItem(key) || '').length;
            }, 0);
            
            usage.sessionStorage = {
                used: sessionSize,
                available: this.maxSize - sessionSize,
                items: sessionKeys.filter(key => key.startsWith(this.prefix)).length
            };
        }

        return usage;
    }

    // Cleanup methods
    cleanupExpiredData() {
        this.cleanupStorage(localStorage);
        this.cleanupStorage(sessionStorage);
    }

    cleanupStorage(storage) {
        if (!storage) return;

        const keys = Object.keys(storage);
        const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));

        prefixedKeys.forEach(key => {
            try {
                const item = storage.getItem(key);
                if (item) {
                    const data = JSON.parse(item);
                    if (data.expires && Date.now() > data.expires) {
                        storage.removeItem(key);
                    }
                }
            } catch (error) {
                // Remove corrupted items
                storage.removeItem(key);
            }
        });
    }

    migrateOldData() {
        // Migrate data from previous versions if needed
        // This is a placeholder for future migrations
    }

    // Clear all app data
    clearAll() {
        this.clearCache();
        this.clearOfflineData();
        
        if (this.hasLocalStorage) {
            const keys = Object.keys(localStorage);
            keys.filter(key => key.startsWith(this.prefix))
                .forEach(key => localStorage.removeItem(key));
        }

        if (this.hasSessionStorage) {
            const keys = Object.keys(sessionStorage);
            keys.filter(key => key.startsWith(this.prefix))
                .forEach(key => sessionStorage.removeItem(key));
        }
    }

    // Export/Import data
    exportData() {
        const data = {};
        
        if (this.hasLocalStorage) {
            const keys = Object.keys(localStorage);
            keys.filter(key => key.startsWith(this.prefix))
                .forEach(key => {
                    data[key] = localStorage.getItem(key);
                });
        }

        return JSON.stringify(data);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            Object.entries(data).forEach(([key, value]) => {
                if (key.startsWith(this.prefix)) {
                    localStorage.setItem(key, value);
                }
            });
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}

// Create and export singleton instance
const storageManager = new StorageManager();

export default storageManager;
export { StorageManager };
