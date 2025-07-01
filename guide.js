document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.lucide) {
            lucide.createIcons();
        } else {
            console.error('Lucide library not found.');
        }
    }, 100);
});
