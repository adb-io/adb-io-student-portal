/**
 * ADB-IO Student Portal - Main Application
 * Green Computing: Optimized for performance and minimal resource usage
 */

// Import modules (simplified - no auth for now)
import Dashboard from './js/modules/dashboard.js';
import CourseDetail from './js/modules/course-detail.js';
import Courses from './js/modules/courses.js';
import CourseMaterials from './js/modules/course-materials.js';
import Progress from './js/modules/progress.js';
import CourseProgress from './js/modules/course-progress.js';
import AIAssistant from './js/modules/ai-assistant.js';

// Import local components (no longer shared)
import { Modal, showAlert } from './js/components/modal.js';

class StudentPortalApp {
    constructor() {
        this.currentUser = this.getMockUser(); // Mock user for development
        this.modules = {};
        this.currentSection = 'dashboard';
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoadingScreen();

            // Initialize modules with mock data
            await this.initializeModules();
            this.setupNavigation();
            this.setupEventListeners();
            this.updateUserInterface();
            this.trackGreenMetrics();

            // Hide loading screen
            this.hideLoadingScreen();

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.hideLoadingScreen();
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    getMockUser() {
        // Mock user data for development (no authentication needed)
        return {
            id: 'student_001',
            name: 'John Doe',
            email: 'john.doe@student.adb.io',
            role: 'student',
            avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=059669&color=fff',
            enrolledCourses: 5,
            completedCourses: 2,
            overallProgress: 75,
            studyStreak: 12,
            carbonSaved: 2.3
        };
    }

    async initializeModules() {
        try {
            // Initialize all modules with mock data (no API client needed)
            this.modules.dashboard = new Dashboard(this.currentUser);
            this.modules.courses = new Courses(this.currentUser);
            this.modules.progress = new Progress(this.currentUser);
            this.modules.courseMaterials = new CourseMaterials(this.currentUser);
            this.modules.courseProgress = new CourseProgress(this.currentUser);
            this.modules.aiAssistant = new AIAssistant(this.currentUser);

            // Initialize each module
            await Promise.all([
                this.modules.dashboard.init(),
                                this.modules.courses.init(),
                this.modules.progress.init(),
                this.modules.aiAssistant.init()
            ]);

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



    // Simplified sync (no offline data for now)
    async syncOfflineData() {
        console.log('Sync functionality disabled in simplified mode');
    }

    // Simplified preferences (no storage for now)
    restoreUserPreferences() {
        console.log('User preferences disabled in simplified mode');
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

        console.log('Application cleanup completed');
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