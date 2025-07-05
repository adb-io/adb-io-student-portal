/**
 * ADB-IO Student Portal - API Client
 * Green Computing: Efficient API communication with minimal resource usage
 */

class ADBIOApiClient {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.token = this.getStoredToken();
        this.refreshToken = this.getStoredRefreshToken();
        this.requestQueue = [];
        this.isRefreshing = false;
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        this.setupDefaultInterceptors();
    }

    getBaseURL() {
        // Determine API base URL based on environment
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        }
        
        // Production API URL - replace with actual production URL
        return 'https://adb-io-backend.herokuapp.com';
    }

    getStoredToken() {
        return localStorage.getItem('adb_token') || sessionStorage.getItem('adb_token');
    }

    getStoredRefreshToken() {
        return localStorage.getItem('adb_refresh_token') || sessionStorage.getItem('adb_refresh_token');
    }

    setTokens(token, refreshToken, remember = false) {
        const storage = remember ? localStorage : sessionStorage;
        
        if (token) {
            storage.setItem('adb_token', token);
            this.token = token;
        }
        
        if (refreshToken) {
            storage.setItem('adb_refresh_token', refreshToken);
            this.refreshToken = refreshToken;
        }
    }

    clearTokens() {
        localStorage.removeItem('adb_token');
        localStorage.removeItem('adb_refresh_token');
        sessionStorage.removeItem('adb_token');
        sessionStorage.removeItem('adb_refresh_token');
        this.token = null;
        this.refreshToken = null;
    }

    isAuthenticated() {
        return !!this.token;
    }

    setupDefaultInterceptors() {
        // Request interceptor for adding auth headers
        this.addRequestInterceptor((config) => {
            if (this.token) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${this.token}`
                };
            }
            return config;
        });

        // Response interceptor for handling auth errors
        this.addResponseInterceptor(
            (response) => response,
            async (error) => {
                if (error.status === 401 && this.refreshToken && !this.isRefreshing) {
                    return this.handleTokenRefresh(error.config);
                }
                return Promise.reject(error);
            }
        );
    }

    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(onFulfilled, onRejected) {
        this.responseInterceptors.push({ onFulfilled, onRejected });
    }

    async handleTokenRefresh(originalRequest) {
        if (this.isRefreshing) {
            // Queue the request while refreshing
            return new Promise((resolve, reject) => {
                this.requestQueue.push({ resolve, reject, config: originalRequest });
            });
        }

        this.isRefreshing = true;

        try {
            const response = await this.refreshAccessToken();
            this.setTokens(response.token, response.refreshToken);
            
            // Process queued requests
            this.requestQueue.forEach(({ resolve, config }) => {
                resolve(this.request(config));
            });
            this.requestQueue = [];
            
            // Retry original request
            return this.request(originalRequest);
        } catch (error) {
            // Refresh failed, clear tokens and redirect to login
            this.clearTokens();
            this.requestQueue.forEach(({ reject }) => {
                reject(error);
            });
            this.requestQueue = [];
            
            // Redirect to login
            window.location.href = '/auth/login';
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    async refreshAccessToken() {
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refreshToken: this.refreshToken
            })
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        return response.json();
    }

    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
        
        let config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Apply request interceptors
        for (const interceptor of this.requestInterceptors) {
            config = interceptor(config) || config;
        }

        try {
            const response = await fetch(url, config);
            
            // Apply response interceptors
            let result = response;
            for (const { onFulfilled } of this.responseInterceptors) {
                if (onFulfilled) {
                    result = onFulfilled(result) || result;
                }
            }

            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.response = response;
                error.config = config;
                
                // Apply error interceptors
                for (const { onRejected } of this.responseInterceptors) {
                    if (onRejected) {
                        return onRejected(error);
                    }
                }
                
                throw error;
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            }
            
            return response.text();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Authentication endpoints
    async login(phoneNumber, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber, password })
        });
    }

    async generatePassword(phoneNumber) {
        return this.request('/auth/generate', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber })
        });
    }

    async verifyPassword(phoneNumber, password) {
        return this.request('/auth/verify', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber, password })
        });
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.clearTokens();
        }
    }

    async getProfile() {
        return this.request('/auth/me');
    }

    // User data endpoints
    async getUserData() {
        return this.request('/data/user');
    }

    async updateUserData(userData) {
        return this.request('/data/user', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    // LMS endpoints
    async getCourses() {
        return this.request('/api/lms/courses');
    }

    async getCourse(courseId) {
        return this.request(`/api/lms/courses/${courseId}`);
    }

    async getEnrollments() {
        return this.request('/api/lms/enrollments');
    }

    async createEnrollment(courseId) {
        return this.request('/api/lms/enrollments', {
            method: 'POST',
            body: JSON.stringify({ courseId })
        });
    }

    async getContent() {
        return this.request('/api/lms/content');
    }

    async getContentById(contentId) {
        return this.request(`/api/lms/content/${contentId}`);
    }

    async getUserProgress(userId) {
        return this.request(`/api/lms/progress/user/${userId}`);
    }

    async updateProgress(progressData) {
        return this.request('/api/lms/progress', {
            method: 'POST',
            body: JSON.stringify(progressData)
        });
    }

    async getOverviewStats() {
        return this.request('/api/lms/stats/overview');
    }

    async getUserStats() {
        return this.request('/api/lms/stats/users');
    }

    async getCourseStats() {
        return this.request('/api/lms/stats/courses');
    }

    // AI endpoints
    async analyzeContent(contentData) {
        return this.request('/api/ai/content/analyze', {
            method: 'POST',
            body: JSON.stringify(contentData)
        });
    }

    async getContentRecommendations(userId, subject) {
        const params = new URLSearchParams({ user_id: userId, subject });
        return this.request(`/api/ai/content/recommendations?${params}`);
    }

    async getContentStats() {
        return this.request('/api/ai/content/stats');
    }

    async generateQuestions(params) {
        return this.request('/api/ai/assessment/generate', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }

    async saveQuestions(questions) {
        return this.request('/api/ai/assessment/save', {
            method: 'POST',
            body: JSON.stringify(questions)
        });
    }

    async getQuestions(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/api/ai/assessment/questions?${params}`);
    }

    async gradeResponse(responseData) {
        return this.request('/api/ai/assessment/grade', {
            method: 'POST',
            body: JSON.stringify(responseData)
        });
    }

    async createAssessment(assessmentData) {
        return this.request('/api/ai/assessment/create', {
            method: 'POST',
            body: JSON.stringify(assessmentData)
        });
    }

    async getAssessmentStats() {
        return this.request('/api/ai/assessment/stats');
    }

    async getLearningProfile(userId) {
        return this.request(`/api/ai/analytics/profile/${userId}`);
    }

    async getPersonalizedContent(userId, preferences) {
        return this.request('/api/ai/analytics/personalized', {
            method: 'POST',
            body: JSON.stringify({ userId, preferences })
        });
    }

    async getAnalyticsStats() {
        return this.request('/api/ai/analytics/stats');
    }

    async getGreenMetrics() {
        return this.request('/api/ai/green/metrics');
    }

    async getCarbonFootprint(userId) {
        return this.request(`/api/ai/green/carbon/${userId}`);
    }

    async getSustainabilityTips() {
        return this.request('/api/ai/green/tips');
    }

    async getGreenStats() {
        return this.request('/api/ai/green/stats');
    }

    // Utility methods
    async uploadFile(file, endpoint = '/upload') {
        const formData = new FormData();
        formData.append('file', file);

        return this.request(endpoint, {
            method: 'POST',
            headers: {
                // Don't set Content-Type for FormData, let browser set it
            },
            body: formData
        });
    }

    async downloadFile(url, filename) {
        try {
            const response = await fetch(url, {
                headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
            });
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('File download failed:', error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }
}

// Create and export singleton instance
const apiClient = new ADBIOApiClient();

export default apiClient;
export { ADBIOApiClient };
