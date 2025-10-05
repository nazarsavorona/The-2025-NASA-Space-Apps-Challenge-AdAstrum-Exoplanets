/**
 * Updates the information panel with celestial body data
 * 
 * @param {Object} data - The celestial body data to display
 */
export function updateInfoPanel(data) {
    const planetInfo = document.getElementById('planet-info');
    
    planetInfo.innerHTML = `
        <h2>${data.name}</h2>
        <p>${data.description}</p>
        <h3 style="margin-top: 15px; font-size: 16px; color: #88c0ff;">Facts</h3>
        <p><strong>Diameter:</strong> ${data.diameter || 'N/A'}</p>
        <p><strong>Mass:</strong> ${data.mass || 'N/A'}</p>
        ${data.orbitalPeriod ? `<p><strong>Orbital Period:</strong> ${data.orbitalPeriod}</p>` : ''}
        ${data.distanceFromSun ? `<p><strong>Distance from Sun:</strong> ${data.distanceFromSun}</p>` : ''}
        ${data.temperature ? `<p><strong>Temperature:</strong> ${data.temperature}</p>` : ''}
    `;
}

/**
 * Formats large numbers with appropriate suffixes (K, M, B)
 * 
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toString();
}

/**
 * Creates a notification toast
 * 
 * @param {string} message - The message to display
 * @param {string} type - Type of notification ('info', 'success', 'error')
 */
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? 'rgba(255, 0, 0, 0.9)' : 'rgba(74, 158, 255, 0.9)'};
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

/**
 * Updates the speed display
 * 
 * @param {number} speed - The current animation speed
 */
export function updateSpeedDisplay(speed) {
    const speedValue = document.getElementById('speed-value');
    if (speedValue) {
        speedValue.textContent = `${speed.toFixed(1)}x`;
    }
}
