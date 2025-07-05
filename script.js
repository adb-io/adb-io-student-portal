/**
 * ADB-IO Student Portal - Main Application
 * Green Computing: Optimized for performance and minimal resource usage
 */

// Import utilities and modules
import apiClient from './js/utils/api-client.js';
import authManager from './js/utils/auth.js';
import storageManager from './js/utils/storage.js';
import Dashboard from './js/modules/dashboard.js';
import Courses from './js/modules/courses.js';
import Progress from './js/modules/progress.js';
import AIAssistant from './js/modules/ai-assistant.js';

// Import shared components
import { Modal, showAlert } from 'https://adb-io.github.io/adb-io-shared-components/js/components/modal.js';

class StudentPortalApp {
    constructor() {
        this.apiClient = apiClient;
        this.authManager = authManager;
        this.storageManager = storageManager;
        this.currentUser = null;
        this.modules = {};
        this.currentSection = 'dashboard';
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoadingScreen();

            // Check authentication first
            if (!this.checkAuthentication()) {
                this.redirectToLogin();
                return;
            }

            // Initialize modules
            await this.loadUserData();
            await this.initializeModules();
            this.setupNavigation();
            this.setupEventListeners();
            this.trackGreenMetrics();

            // Hide loading screen
            this.hideLoadingScreen();

            // Setup auto-logout
            this.setupAutoLogout();

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.hideLoadingScreen();
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    checkAuthentication() {
        return this.authManager.isAuthenticated();
    }

    redirectToLogin() {
        window.location.href = 'https://adb-io.github.io/adb-io-auth/';
    }

    async loadUserData() {
        try {
            this.currentUser = this.authManager.getCurrentUser();

            if (!this.currentUser) {
                // Try to load from API
                this.currentUser = await this.authManager.loadCurrentUser();
            }

            this.updateUserInterface();
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.showError('Failed to load user data. Please try again.');
        }
    }

    async initializeModules() {
        try {
            // Initialize all modules
            this.modules.dashboard = new Dashboard(this.apiClient);
            this.modules.courses = new Courses(this.apiClient);
            this.modules.progress = new Progress(this.apiClient);
            this.modules.aiAssistant = new AIAssistant(this.apiClient);

            console.log('All modules initialized successfully');
        } catch (error) {
            console.error('Failed to initialize modules:', error);
            throw error;
        }
    }

    updateUserInterface() {
        // Update user info in header
        const userNameElement = document.getElementById('user-name');
        const userAvatarElement = document.getElementById('user-avatar');

        // Update user info in sidebar
        const sidebarUserNameElement = document.getElementById('sidebar-user-name');
        const sidebarUserAvatarElement = document.getElementById('sidebar-user-avatar');
        const sidebarUserRoleElement = document.getElementById('sidebar-user-role');

        if (this.currentUser) {
            const userName = this.currentUser.name || 'Student';
            const userAvatar = this.currentUser.avatar || 'assets/images/default-avatar.png';
            const userRole = this.currentUser.role || 'Student';

            // Update header
            if (userNameElement) userNameElement.textContent = userName;
            if (userAvatarElement) userAvatarElement.src = userAvatar;

            // Update sidebar
            if (sidebarUserNameElement) sidebarUserNameElement.textContent = userName;
            if (sidebarUserAvatarElement) sidebarUserAvatarElement.src = userAvatar;
            if (sidebarUserRoleElement) sidebarUserRoleElement.textContent = userRole;
        }
    }

    setupNavigation() {
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');

        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('sidebar--open');

                // Close sidebar when clicking outside on mobile
                if (sidebar.classList.contains('sidebar--open')) {
                    document.addEventListener('click', this.handleOutsideClick.bind(this));
                }
            });
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('data-target');
                this.navigateToSection(target);
            });
        });
    }

    handleOutsideClick(e) {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');

        if (sidebar && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('sidebar--open');
            document.removeEventListener('click', this.handleOutsideClick.bind(this));
        }
    }

    navigateToSection(section) {
        // Store current section
        this.currentSection = section;

        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(s => s.classList.remove('active'));

        // Show target section
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update active nav link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));

        const activeLink = document.querySelector(`[data-target="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update page title in header
        this.updatePageTitle(section);

        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('sidebar--open');
        }

        // Save current section to storage
        this.storageManager.setPreference('currentSection', section);

        // Track page view for analytics
        this.trackPageView(section);
    }

    updatePageTitle(section) {
        const titles = {
            dashboard: { title: 'Dashboard', subtitle: 'Welcome back to your learning journey' },
            courses: { title: 'My Courses', subtitle: 'Manage your enrolled courses' },
            assignments: { title: 'Assignments', subtitle: 'View and submit your assignments' },
            progress: { title: 'Progress Tracking', subtitle: 'Monitor your learning achievements' },
            'ai-assistant': { title: 'AI Assistant', subtitle: 'Get personalized learning support' },
            library: { title: 'Library', subtitle: 'Access learning resources' },
            profile: { title: 'Profile', subtitle: 'Manage your account settings' },
            settings: { title: 'Settings', subtitle: 'Customize your learning experience' }
        };

        const pageInfo = titles[section] || { title: 'Student Portal', subtitle: 'ADB-IO Green LMS' };

        const titleElement = document.getElementById('page-title');
        const subtitleElement = document.getElementById('page-subtitle');

        if (titleElement) titleElement.textContent = pageInfo.title;
        if (subtitleElement) subtitleElement.textContent = pageInfo.subtitle;

        // Update document title
        document.title = `${pageInfo.title} - ADB-IO Green LMS`;
    }

    setupEventListeners() {
        // Logout functionality
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Auth state changes
        this.authManager.onAuthStateChange((event, user) => {
            if (event === 'logout') {
                this.redirectToLogin();
            } else if (event === 'login') {
                this.currentUser = user;
                this.updateUserInterface();
            }
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Online/offline status
        window.addEventListener('online', () => {
            this.handleOnlineStatus(true);
        });

        window.addEventListener('offline', () => {
            this.handleOnlineStatus(false);
        });
    }

    handleKeyboardShortcuts(e) {
        // Alt + number keys for navigation
        if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            const shortcuts = {
                '1': 'dashboard',
                '2': 'courses',
                '3': 'assignments',
                '4': 'progress',
                '5': 'ai-assistant',
                '6': 'profile'
            };

            if (shortcuts[e.key]) {
                e.preventDefault();
                this.navigateToSection(shortcuts[e.key]);
            }
        }
    }

    handleOnlineStatus(isOnline) {
        const statusIndicator = document.querySelector('.online-status');
        if (statusIndicator) {
            statusIndicator.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
        }

        if (isOnline) {
            // Sync offline data when back online
            this.syncOfflineData();
        }
    }

    async logout() {
        try {
            await this.authManager.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    trackGreenMetrics() {
        // Track performance metrics for green computing
        if ('performance' in window) {
            const navigation = performance.getEntriesByType('navigation')[0];
            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
            console.log(`📊 Page Load Time: ${loadTime}ms`);

            // Store metrics for analysis
            this.storageManager.setCache('performance_metrics', {
                loadTime,
                timestamp: Date.now(),
                section: this.currentSection
            }, 3600);
        }

        // Track resource usage
        this.trackResourceUsage();
    }

    trackResourceUsage() {
        // Monitor memory usage
        if ('memory' in performance) {
            const memory = performance.memory;
            console.log(`💾 Memory Usage: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
        }

        // Track network usage
        if ('connection' in navigator) {
            const connection = navigator.connection;
            console.log(`📡 Connection: ${connection.effectiveType}, ${connection.downlink}Mbps`);
        }
    }

    trackPageView(section) {
        // Track page views for analytics
        const pageView = {
            section,
            timestamp: Date.now(),
            user: this.currentUser?.id,
            sessionId: this.getSessionId()
        };

        // Store locally for later sync
        const pageViews = this.storageManager.getCache('page_views', []);
        pageViews.push(pageView);
        this.storageManager.setCache('page_views', pageViews, 86400); // 24 hours
    }

    getSessionId() {
        let sessionId = this.storageManager.getSession('session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.storageManager.setSession('session_id', sessionId);
        }
        return sessionId;
    }
    // Loading screen management
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
        }
    }

    // Auto-logout setup
    setupAutoLogout() {
        // Setup auto-logout after 30 minutes of inactivity
        this.autoLogoutCleanup = this.authManager.setupAutoLogout(30);
    }

    // Offline data sync
    async syncOfflineData() {
        try {
            const offlineData = this.storageManager.getOfflineData('pending_sync', []);

            if (offlineData.length > 0) {
                console.log(`Syncing ${offlineData.length} offline items...`);

                for (const item of offlineData) {
                    try {
                        await this.apiClient.request(item.endpoint, item.options);
                    } catch (error) {
                        console.error('Failed to sync item:', error);
                    }
                }

                // Clear synced data
                this.storageManager.setOfflineData('pending_sync', []);
                this.showSuccess('Offline data synced successfully');
            }
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }

    // Restore user preferences
    restoreUserPreferences() {
        // Restore last visited section
        const lastSection = this.storageManager.getPreference('currentSection', 'dashboard');
        if (lastSection && lastSection !== 'dashboard') {
            setTimeout(() => {
                this.navigateToSection(lastSection);
            }, 100);
        }

        // Restore other preferences
        const preferences = this.storageManager.getAllPreferences();
        console.log('Restored user preferences:', preferences);
    }

    // Error handling
    showError(message) {
        console.error('Error:', message);
        showAlert(message, 'Error');
    }

    showSuccess(message) {
        console.log('Success:', message);
        // In a real implementation, this would show a toast notification
    }

    // Cleanup
    cleanup() {
        // Clean up modules
        Object.values(this.modules).forEach(module => {
            if (module.destroy) {
                module.destroy();
            }
        });

        // Clean up auto-logout
        if (this.autoLogoutCleanup) {
            this.autoLogoutCleanup();
        }

        // Save current state
        this.storageManager.setPreference('lastVisit', Date.now());
    }

    // Development helpers
    getDebugInfo() {
        return {
            currentUser: this.currentUser,
            currentSection: this.currentSection,
            modules: Object.keys(this.modules),
            storageUsage: this.storageManager.getStorageUsage(),
            isAuthenticated: this.authManager.isAuthenticated(),
            apiBaseURL: this.apiClient.baseURL
        };
    }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.studentPortalApp = new StudentPortalApp();
    });
} else {
    window.studentPortalApp = new StudentPortalApp();
}

// Export for potential external use
export default StudentPortalApp;