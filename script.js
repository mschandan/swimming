// Function to open a modal by ID
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.showModal();
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

// Function to close a modal by ID
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.close();
        document.body.style.overflow = ''; // Restore background scrolling
    }
}

// Close modal when clicking outside of it
document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', (e) => {
        const dialogDimensions = dialog.getBoundingClientRect();
        if (
            e.clientX < dialogDimensions.left ||
            e.clientX > dialogDimensions.right ||
            e.clientY < dialogDimensions.top ||
            e.clientY > dialogDimensions.bottom
        ) {
            dialog.close();
            document.body.style.overflow = '';
        }
    });
});

// Interactive Wave Tide Movement on Mouse Wave
const heroBanner = document.querySelector('.hero-banner');

if (heroBanner) {
    heroBanner.addEventListener('mousemove', (e) => {
        const rect = heroBanner.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
        const mouseY = (e.clientY - rect.top) / rect.height - 0.5;
        
        heroBanner.style.setProperty('--wave-x', mouseX);
        heroBanner.style.setProperty('--wave-y', mouseY);
    });

    heroBanner.addEventListener('mouseleave', () => {
        heroBanner.style.setProperty('--wave-x', 0);
        heroBanner.style.setProperty('--wave-y', 0);
    });
}

// Email support dropdown in navbar
function toggleEmailDropdown(e) {
    e.stopPropagation();
    const btn = document.getElementById('email-btn');
    const dropdown = document.getElementById('email-dropdown');
    const isOpen = dropdown.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('email-dropdown');
    const btn = document.getElementById('email-btn');
    if (dropdown && dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== btn) {
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
    }
});

