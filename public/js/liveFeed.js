class LiveFeedClient {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.feedItems = [];
        this.maxFeedItems = 10;
    }

    connect() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        this.eventSource = new EventSource('/live-feed');
        
        this.eventSource.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            console.log('Live feed connected');
        };

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleLiveFeedEvent(data);
            } catch (error) {
                console.error('Error parsing live feed data:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('Live feed error:', error);
            this.isConnected = false;
            this.updateConnectionStatus('disconnected');
            this.handleReconnect();
        };
    }

    handleLiveFeedEvent(event) {
        console.log('Received event:', event);
        
        // Handle connection event
        if (event.type === 'connected') {
            this.updateConnectionStatus('connected');
            return;
        }
        
        // Add to feed items
        this.addFeedItem(event);
        
        // Show notification
        this.showNotification(event);
        
        // Update dashboard based on event type
        switch (event.type) {
            case 'product_added':
            case 'product_updated':
                this.refreshInventorySection();
                break;
            case 'product_assigned':
            case 'product_returned':
                this.refreshAssignmentsSection();
                this.refreshInventorySection();
                break;
            case 'request_submitted':
            case 'request_approved':
            case 'request_rejected':
                this.refreshRequestsSection();
                break;
            case 'user_registered':
                this.refreshUsersSection();
                break;
        }
    }

    addFeedItem(event) {
        this.feedItems.unshift(event);
        if (this.feedItems.length > this.maxFeedItems) {
            this.feedItems = this.feedItems.slice(0, this.maxFeedItems);
        }
        this.updateFeedDisplay();
    }

    updateFeedDisplay() {
        const container = document.getElementById('liveFeedContainer');
        if (!container) return;

        if (this.feedItems.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-gray-500">No recent activity</div>';
            return;
        }

        const feedHTML = this.feedItems.map(item => {
            const timeAgo = this.getTimeAgo(new Date(item.timestamp));
            const iconClass = this.getEventIcon(item.type);
            const colorClass = this.getEventColor(item.type);
            
            return `
                <div class="p-3 border-b border-gray-100 hover:bg-gray-50">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0">
                            <i class="${iconClass} ${colorClass}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-gray-900">${item.message}</p>
                            <p class="text-xs text-gray-500">${timeAgo}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = feedHTML;
    }

    getEventIcon(type) {
        const icons = {
            'product_added': 'fas fa-plus-circle',
            'product_updated': 'fas fa-edit',
            'product_assigned': 'fas fa-arrow-right',
            'product_returned': 'fas fa-arrow-left',
            'request_submitted': 'fas fa-paper-plane',
            'request_approved': 'fas fa-check-circle',
            'request_rejected': 'fas fa-times-circle',
            'user_registered': 'fas fa-user-plus'
        };
        return icons[type] || 'fas fa-info-circle';
    }

    getEventColor(type) {
        const colors = {
            'product_added': 'text-green-500',
            'product_updated': 'text-blue-500',
            'product_assigned': 'text-purple-500',
            'product_returned': 'text-orange-500',
            'request_submitted': 'text-blue-500',
            'request_approved': 'text-green-500',
            'request_rejected': 'text-red-500',
            'user_registered': 'text-indigo-500'
        };
        return colors[type] || 'text-gray-500';
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    showNotification(event) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm';
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-bell mr-2"></i>
                <div>
                    <div class="font-medium">Live Update</div>
                    <div class="text-sm">${event.message}</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    refreshInventorySection() {
        const inventorySection = document.querySelector('[data-section="inventory"]');
        if (inventorySection) {
            this.addRefreshIndicator(inventorySection);
        }
    }

    refreshAssignmentsSection() {
        const assignmentsSection = document.querySelector('[data-section="assignments"]');
        if (assignmentsSection) {
            this.addRefreshIndicator(assignmentsSection);
        }
    }

    refreshRequestsSection() {
        const requestsSection = document.querySelector('[data-section="requests"]');
        if (requestsSection) {
            this.addRefreshIndicator(requestsSection);
        }
    }

    refreshUsersSection() {
        const usersSection = document.querySelector('[data-section="users"]');
        if (usersSection) {
            this.addRefreshIndicator(usersSection);
        }
    }

    addRefreshIndicator(section) {
        const indicator = document.createElement('div');
        indicator.className = 'absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs';
        indicator.textContent = 'Updated';
        indicator.style.zIndex = '10';

        section.style.position = 'relative';
        section.appendChild(indicator);

        setTimeout(() => {
            indicator.remove();
        }, 3000);
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('liveFeedStatus');
        const container = document.getElementById('liveFeedContainer');
        
        if (statusElement) {
            if (status === 'connected') {
                statusElement.innerHTML = '<i class="fas fa-circle text-green-500"></i> Live';
                statusElement.className = 'flex items-center text-green-600 text-sm';
            } else {
                statusElement.innerHTML = '<i class="fas fa-circle text-red-500"></i> Offline';
                statusElement.className = 'flex items-center text-red-600 text-sm';
            }
        }
        
        if (container) {
            if (status === 'connected') {
                if (this.feedItems.length === 0) {
                    container.innerHTML = '<div class="p-4 text-center text-gray-500">Waiting for activity...</div>';
                }
            } else {
                container.innerHTML = '<div class="p-4 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Connecting to live feed...</div>';
            }
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
            const container = document.getElementById('liveFeedContainer');
            if (container) {
                container.innerHTML = '<div class="p-4 text-center text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>Connection failed</div>';
            }
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
        this.updateConnectionStatus('disconnected');
    }
}

// Activity Feed Popup
function showActivityPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i class="fas fa-rss text-blue-500 mr-2"></i>
                    Recent Activity
                </h3>
                <button id="closeActivityPopup" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="activityPopupContainer" class="max-h-64 overflow-y-auto">
                <div class="p-4 text-center text-gray-500">
                    <i class="fas fa-spinner fa-spin mr-2"></i>
                    Loading recent activity...
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    document.getElementById('closeActivityPopup').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    loadRecentActivity();
}

function loadRecentActivity() {
    fetch('/api/recent-activity')
        .then(response => response.json())
        .then(activities => {
            const container = document.getElementById('activityPopupContainer');
            if (!container) return;

            if (activities.length === 0) {
                container.innerHTML = '<div class="p-4 text-center text-gray-500">No recent activity</div>';
                return;
            }

            const feedHTML = activities.map(activity => {
                const timeAgo = getTimeAgo(new Date(activity.timestamp));
                const iconClass = getEventIcon(activity.type);
                const colorClass = getEventColor(activity.type);
                
                return `
                    <div class="p-3 border-b border-gray-100 hover:bg-gray-50">
                        <div class="flex items-start space-x-3">
                            <div class="flex-shrink-0">
                                <i class="${iconClass} ${colorClass}"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-gray-900">${activity.message}</p>
                                <p class="text-xs text-gray-500">${timeAgo}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = feedHTML;
        })
        .catch(error => {
            console.error('Error loading activity:', error);
            const container = document.getElementById('activityPopupContainer');
            if (container) {
                container.innerHTML = '<div class="p-4 text-center text-red-500">Error loading activity</div>';
            }
        });
}

function getEventIcon(type) {
    const icons = {
        'product_added': 'fas fa-plus-circle',
        'product_updated': 'fas fa-edit',
        'product_assigned': 'fas fa-arrow-right',
        'product_returned': 'fas fa-arrow-left',
        'request_submitted': 'fas fa-paper-plane',
        'request_approved': 'fas fa-check-circle',
        'request_rejected': 'fas fa-times-circle',
        'user_registered': 'fas fa-user-plus'
    };
    return icons[type] || 'fas fa-info-circle';
}

function getEventColor(type) {
    const colors = {
        'product_added': 'text-green-500',
        'product_updated': 'text-blue-500',
        'product_assigned': 'text-purple-500',
        'product_returned': 'text-orange-500',
        'request_submitted': 'text-blue-500',
        'request_approved': 'text-green-500',
        'request_rejected': 'text-red-500',
        'user_registered': 'text-indigo-500'
    };
    return colors[type] || 'text-gray-500';
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

// Initialize activity feed when page loads
document.addEventListener('DOMContentLoaded', () => {
    const activityBtn = document.getElementById('activityFeedBtn');
    if (activityBtn) {
        activityBtn.addEventListener('click', showActivityPopup);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.liveFeed) {
        window.liveFeed.disconnect();
    }
});