// Main JavaScript file for the application

// Initialize the application
console.log('Main.js loaded successfully');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Set active page for sidebar
    const currentPath = window.location.pathname;
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath || 
            (currentPath.includes('dashboard') && link.getAttribute('data-page') === 'dashboard')) {
            link.classList.add('bg-primary-100', 'text-primary-700', 'border-r-4', 'border-primary-600');
        }
    });
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize form validation
    initializeFormValidation();
    
    // Initialize table functionality
    initializeTableFunctionality();
    
    // Auto-hide flash messages
    autoHideFlashMessages();
    
    // Initialize live counts
    initializeLiveCounts();
});

// Initialize tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Initialize form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('form[data-validate="true"]');
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

// Initialize table functionality
function initializeTableFunctionality() {
    // Select all checkbox functionality
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('input[name="employee_ids"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
    
    // Individual checkbox functionality
    const individualCheckboxes = document.querySelectorAll('input[name="employee_ids"]');
    individualCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const allChecked = Array.from(individualCheckboxes).every(cb => cb.checked);
            const someChecked = Array.from(individualCheckboxes).some(cb => cb.checked);
            
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = allChecked;
                selectAllCheckbox.indeterminate = someChecked && !allChecked;
            }
        });
    });
}

// Auto-hide flash messages
function autoHideFlashMessages() {
    const flashMessages = document.querySelectorAll('.alert');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.transition = 'opacity 0.5s';
            message.style.opacity = '0';
            setTimeout(() => {
                message.remove();
            }, 500);
        }, 5000);
    });
}

// Confirm delete actions
function confirmDelete(message = 'Are you sure you want to delete this item?') {
    return confirm(message);
}

// Show loading spinner
function showLoading(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    button.disabled = true;
    
    return function() {
        button.innerHTML = originalText;
        button.disabled = false;
    };
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = debounce(function(event) {
            const searchTerm = event.target.value.toLowerCase();
            const tableRows = document.querySelectorAll('tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }, 300);
        
        searchInput.addEventListener('input', debouncedSearch);
    }
}

// Modal functionality
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}



// Live counts functionality
function initializeLiveCounts() {
    console.log('Initializing live counts...');
    updateLiveCounts();
    // Update counts every 5 seconds for real-time updates
    setInterval(updateLiveCounts, 5000);
}

function updateLiveCounts() {
    fetch('/api/live-counts')
        .then(response => {
            if (!response.ok) {
                throw new Error('API response not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Live counts:', data);
            // Update pending requests count for monitors
            const pendingRequestsCount = document.getElementById('pendingRequestsCount');
            if (pendingRequestsCount) {
                pendingRequestsCount.textContent = data.pendingRequests;
                pendingRequestsCount.style.display = 'inline';
            }
            
            // Update pending registrations count for admin
            const pendingRegistrationsCount = document.getElementById('pendingRegistrationsCount');
            if (pendingRegistrationsCount) {
                if (data.pendingRegistrations > 0) {
                    pendingRegistrationsCount.textContent = data.pendingRegistrations;
                    pendingRegistrationsCount.style.display = 'inline';
                } else {
                    pendingRegistrationsCount.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error updating live counts:', error);
        });
}

// Export functions for global use
window.confirmDelete = confirmDelete;
window.showLoading = showLoading;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.openModal = openModal;
window.closeModal = closeModal;