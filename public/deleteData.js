// Function to confirm and delete the table
function confirmDeleteTable(tableName) {
    const confirmation = confirm(`Are you sure you want to delete the table ${tableName}?`);
    const schemaSelect = document.getElementById('schema-select');
    const selectedSchema = schemaSelect.value;

    if (confirmation) {
        // Send a DELETE request to the server to delete the table
        fetch(`/delete-table/${tableName}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                schema: selectedSchema,
            })
        })
        .then(response => {
            if (response.ok) {
                console.log(`Table ${tableName} deleted successfully`);
                // Reload the page after successful deletion
                location.reload();
            } else {
                console.error(`Failed to delete table ${tableName}: ${response.statusText}`);
            }
        })
        .catch(error => console.error(`Error deleting table ${tableName}`, error));
    }
}