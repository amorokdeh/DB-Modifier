function showAlert(message, color) {
    const alertBox = document.getElementById('alert-box');
    const alertMessage = document.getElementById('alert-message');

    alertMessage.textContent = message;
    alertBox.className = `alert-box ${color || ''}`;
    alertBox.style.display = 'block';
}

function closeAlertBox() {
    const alertBox = document.getElementById('alert-box');
    alertBox.style.display = 'none';
}