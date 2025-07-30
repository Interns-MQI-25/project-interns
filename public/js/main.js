document.addEventListener('DOMContentLoaded', function() {
    // Set active page
    const currentPath = window.location.pathname;
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath || 
            (currentPath.includes('dashboard') && link.getAttribute('data-page') === 'dashboard')) {
            link.classList.add('bg-primary-100', 'text-primary-700', 'border-r-4', 'border-primary-600');
        }
    });
});