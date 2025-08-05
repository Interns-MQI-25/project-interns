// Password visibility toggle functionality
// This script provides password show/hide functionality for password fields

// Password visibility toggle function
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '_icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        button.setAttribute('title', 'Hide password');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        button.setAttribute('title', 'Show password');
    }
}

// Initialize tooltips for password visibility buttons
document.addEventListener('DOMContentLoaded', function() {
    const toggleButtons = document.querySelectorAll('[onclick^="togglePassword"]');
    toggleButtons.forEach(button => {
        button.setAttribute('title', 'Show password');
    });
});

// Auto-apply password toggle to any password field with data-toggle="password"
document.addEventListener('DOMContentLoaded', function() {
    const passwordFields = document.querySelectorAll('input[type="password"][data-toggle="password"]');
    
    passwordFields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative';
        
        // Wrap the input field
        field.parentNode.insertBefore(wrapper, field);
        wrapper.appendChild(field);
        
        // Add padding-right to input for button space
        field.classList.add('pr-10');
        
        // Create toggle button
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600';
        button.onclick = () => togglePassword(field.id, button);
        button.setAttribute('title', 'Show password');
        
        // Create icon
        const icon = document.createElement('i');
        icon.className = 'fas fa-eye';
        icon.id = field.id + '_icon';
        
        button.appendChild(icon);
        wrapper.appendChild(button);
    });
});
