export async function handleLogout() {
    const logoutButton = document.getElementById('logout-btn');
    if (!logoutButton) return;

    logoutButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) {
                window.location.href = '/';
            } else {
                alert("Failed to log out. Please try again.");
            }
        } catch (error) {
            console.error("Logout error:", error);
            alert("An error occurred while logging out.");
        }
    });
}

function handleMenuSelection() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('selected'));
            
            item.classList.add('selected');

            const pageTitle = document.querySelector('.page-title');
            const pageName = item.querySelector('span:last-child').textContent;
            pageTitle.textContent = pageName;
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    handleLogout();
    handleMenuSelection();
});
