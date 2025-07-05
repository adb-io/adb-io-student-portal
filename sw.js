/**
 * ADB-IO Student Portal - Service Worker
 * Green Computing: Optimized caching for minimal resource usage
 */

const CACHE_NAME = 'adb-io-student-portal-v1.0.0';
const STATIC_CACHE_NAME = 'adb-io-static-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/script.js',
    '/style.css',
    '/css/shared/main.css',
    '/css/base/variables.css',
    '/css/base/reset.css',
    '/css/components/dashboard.css',
    '/css/components/navigation.css',
    '/css/components/cards.css',
    '/css/components/courses.css',
    '/css/pages/student-portal.css',
    '/js/components/modal.js',
    '/js/modules/dashboard.js',
    '/js/modules/courses.js',
    '/js/modules/course-detail.js',
    '/js/modules/course-materials.js',
    '/js/modules/progress.js',
    '/js/modules/course-progress.js',
    '/js/modules/ai-assistant.js',
    '/assets/images/default-avatar.png',
    '/assets/favicon.ico'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache static files', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip external requests (API calls to backend)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached version if available
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return cachedResponse;
                }

                // Otherwise fetch from network
                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Cache the response for future use
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.error('Service Worker: Network fetch failed', error);
                        
                        // Return offline page for navigation requests
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        
                        throw error;
                    });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Handle offline actions when back online
            handleBackgroundSync()
        );
    }
});

// Push notifications (for future use)
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New notification from ADB-IO LMS',
        icon: '/assets/favicon.ico',
        badge: '/assets/favicon.ico',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('ADB-IO LMS', options)
    );
});

// Handle background sync
async function handleBackgroundSync() {
    try {
        // Check for pending offline actions
        const pendingActions = await getStoredActions();
        
        for (const action of pendingActions) {
            try {
                await processAction(action);
                await removeStoredAction(action.id);
            } catch (error) {
                console.error('Service Worker: Failed to process action', error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
    }
}

// Helper functions for offline storage
async function getStoredActions() {
    // Implementation would depend on IndexedDB or localStorage
    return [];
}

async function processAction(action) {
    // Process the offline action
    console.log('Processing offline action:', action);
}

async function removeStoredAction(actionId) {
    // Remove processed action from storage
    console.log('Removing processed action:', actionId);
}

// Green Computing: Efficient resource management
console.log('Service Worker: Loaded with green computing optimizations');
