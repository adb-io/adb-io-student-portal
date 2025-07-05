/**
 * ADB-IO Student Portal - Authentication Utilities
 * Green Computing: Efficient authentication management
 */

import apiClient from './api-client.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authCallbacks = [];
        this.init();
    }

    async init() {
        // Check if user is already authenticated
        if (apiClient.isAuthenticated()) {
            try {
                await this.loadCurrentUser();
            } catch (error) {
                console.error('Failed to load current user:', error);
                this.logout();
            }
        }
    }

    async loadCurrentUser() {
        try {
            const profile = await apiClient.getProfile();
            this.currentUser = profile.user || profile;
            this.notifyAuthCallbacks('login', this.currentUser);
            return this.currentUser;
        } catch (error) {
            console.error('Failed to load user profile:', error);
            throw error;
        }
    }

    async login(phoneNumber, password, remember = false) {
        try {
            const response = await apiClient.login(phoneNumber, password);
            
            if (response.status === 'success' && response.token) {
                // Store tokens
                apiClient.setTokens(response.token, response.refreshToken, remember);
                
                // Set current user
                this.currentUser = response.user;
                
                // Notify callbacks
                this.notifyAuthCallbacks('login', this.currentUser);
                
                return {
                    success: true,
                    user: this.currentUser,
                    message: response.message
                };
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message || 'Login failed'
            };
        }
    }

    async generatePassword(phoneNumber) {
        try {
            const response = await apiClient.generatePassword(phoneNumber);
            
            return {
                success: response.status === 'success',
                message: response.message || response.response
            };
        } catch (error) {
            console.error('Password generation error:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate password'
            };
        }
    }

    async verifyPassword(phoneNumber, password) {
        try {
            const response = await apiClient.verifyPassword(phoneNumber, password);
            
            if (response.status === 'success' && response.token) {
                // Store tokens
                apiClient.setTokens(response.token, response.refreshToken);
                
                // Set current user
                this.currentUser = response.user;
                
                // Notify callbacks
                this.notifyAuthCallbacks('login', this.currentUser);
                
                return {
                    success: true,
                    user: this.currentUser,
                    message: response.message
                };
            } else {
                throw new Error(response.message || 'Verification failed');
            }
        } catch (error) {
            console.error('Password verification error:', error);
            return {
                success: false,
                error: error.message || 'Verification failed'
            };
        }
    }

    async logout() {
        try {
            // Call logout endpoint
            await apiClient.logout();
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear local state regardless of API call result
            const user = this.currentUser;
            this.currentUser = null;
            apiClient.clearTokens();
            
            // Notify callbacks
            this.notifyAuthCallbacks('logout', user);
        }
    }

    isAuthenticated() {
        return !!this.currentUser && apiClient.isAuthenticated();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserRole() {
        return this.currentUser?.role || 'guest';
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const userRole = this.getUserRole();
        const permissions = this.getRolePermissions(userRole);
        
        return permissions.includes(permission) || permissions.includes('*');
    }

    getRolePermissions(role) {
        const rolePermissions = {
            admin: ['*'], // All permissions
            teacher: [
                'courses.create',
                'courses.edit',
                'courses.delete',
                'students.view',
                'assessments.create',
                'assessments.grade',
                'analytics.view'
            ],
            student: [
                'courses.view',
                'courses.enroll',
                'assignments.submit',
                'progress.view',
                'profile.edit'
            ],
            guest: []
        };
        
        return rolePermissions[role] || [];
    }

    // Authentication state management
    onAuthStateChange(callback) {
        this.authCallbacks.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.authCallbacks.indexOf(callback);
            if (index > -1) {
                this.authCallbacks.splice(index, 1);
            }
        };
    }

    notifyAuthCallbacks(event, user) {
        this.authCallbacks.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                console.error('Auth callback error:', error);
            }
        });
    }

    // Token management
    getToken() {
        return apiClient.getStoredToken();
    }

    isTokenExpired() {
        const token = this.getToken();
        if (!token) return true;
        
        try {
            // For PASETO tokens, you'd need a proper parser
            // For now, we'll assume the token is valid if it exists
            return false;
        } catch (error) {
            return true;
        }
    }

    // Session management
    extendSession() {
        // Refresh token if needed
        if (this.isTokenExpired()) {
            return this.refreshToken();
        }
        return Promise.resolve();
    }

    async refreshToken() {
        try {
            const response = await apiClient.refreshAccessToken();
            apiClient.setTokens(response.token, response.refreshToken);
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
            return false;
        }
    }

    // Utility methods
    validatePhoneNumber(phoneNumber) {
        // Indonesian phone number validation
        const phoneRegex = /^62\d{9,15}$/;
        return phoneRegex.test(phoneNumber);
    }

    formatPhoneNumber(phoneNumber) {
        // Remove any non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Add country code if not present
        if (cleaned.startsWith('0')) {
            return '62' + cleaned.substring(1);
        } else if (!cleaned.startsWith('62')) {
            return '62' + cleaned;
        }
        
        return cleaned;
    }

    // Security utilities
    generateSecurePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return password;
    }

    checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const score = Object.values(checks).filter(Boolean).length;
        
        let strength = 'weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 3) strength = 'medium';
        
        return {
            score,
            strength,
            checks,
            suggestions: this.getPasswordSuggestions(checks)
        };
    }

    getPasswordSuggestions(checks) {
        const suggestions = [];
        
        if (!checks.length) suggestions.push('Use at least 8 characters');
        if (!checks.uppercase) suggestions.push('Add uppercase letters');
        if (!checks.lowercase) suggestions.push('Add lowercase letters');
        if (!checks.numbers) suggestions.push('Add numbers');
        if (!checks.special) suggestions.push('Add special characters');
        
        return suggestions;
    }

    // Auto-logout on inactivity
    setupAutoLogout(timeoutMinutes = 30) {
        let timeoutId;
        
        const resetTimeout = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.logout();
                alert('Session expired due to inactivity. Please log in again.');
            }, timeoutMinutes * 60 * 1000);
        };
        
        // Reset timeout on user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, resetTimeout, true);
        });
        
        // Initial timeout
        resetTimeout();
        
        // Return cleanup function
        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => {
                document.removeEventListener(event, resetTimeout, true);
            });
        };
    }

    // Remember me functionality
    setRememberMe(remember) {
        if (remember) {
            localStorage.setItem('adb_remember_me', 'true');
        } else {
            localStorage.removeItem('adb_remember_me');
            // Move tokens from localStorage to sessionStorage
            const token = localStorage.getItem('adb_token');
            const refreshToken = localStorage.getItem('adb_refresh_token');
            
            if (token) {
                sessionStorage.setItem('adb_token', token);
                localStorage.removeItem('adb_token');
            }
            
            if (refreshToken) {
                sessionStorage.setItem('adb_refresh_token', refreshToken);
                localStorage.removeItem('adb_refresh_token');
            }
        }
    }

    isRememberMeEnabled() {
        return localStorage.getItem('adb_remember_me') === 'true';
    }
}

// Create and export singleton instance
const authManager = new AuthManager();

export default authManager;
export { AuthManager };
