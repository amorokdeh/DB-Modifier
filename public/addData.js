// Store the elements in an array
const elements = [];

// Function to add a new set of elements (Label: Element and Select: Type)
function addElement() {
    const elementContainer = document.getElementById('element-container');

    const newElementDiv = document.createElement('div');
    newElementDiv.className = 'add-table-element'; // Add a class for styling
    newElementDiv.innerHTML = `
        <label class="add-table-element" for="new-label">Element</label>
        <input type="text" class="add-table-element" name="new-label" placeholder="Enter label">
        <label class="add-table-element" for="new-type">Type</label>
        <select class="add-table-element" name="new-type">
            <option value="character varying">Character varying</option>
            <option value="text">Text</option>
            <option value="integer">Integer</option>
            <option value="smallint">Small integer</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="decimal">Decimal</option>
            <!-- Add more options as needed -->
        </select>
        <button type="button" class="delete-element-btn">Delete</button>
    `;

    // Add event listener to the delete button
    newElementDiv.querySelector('.delete-element-btn').addEventListener('click', () => {
        elementContainer.removeChild(newElementDiv);
        // Remove the element from the elements array
        const index = elements.findIndex(element => element.div === newElementDiv);
        if (index !== -1) {
            elements.splice(index, 1);
        }
    });

    // Add the new element to the elements array
    elements.push({
        div: newElementDiv,
        label: newElementDiv.querySelector('input[name="new-label"]'),
        type: newElementDiv.querySelector('select[name="new-type"]')
    });

    elementContainer.appendChild(newElementDiv);
}

// Add event listener to the "Add Element" button
document.getElementById('add-element-btn').addEventListener('click', addElement);

// Add event listener to the 'Add Table' button
document.getElementById('add-table-btn').addEventListener('click', () => {
    const newTableName = document.getElementById('table-name').value;
    const newTableInfo = document.getElementById('table-info').value;
    const newGeometry = document.getElementById('geometry-type').value;

    // Validate input values
    if (newTableName && elements.length > 0) {
        const columnData = elements.map(element => ({
            columnName: element.label.value,
            dataType: element.type.value
        }));

        // Send a request to the server to add a new table with multiple elements
        const schemaSelect = document.getElementById('schema-select');
        const selectedSchema = schemaSelect.value;
        fetch('/add-table', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tableName: newTableName,
                tableDescription: newTableInfo,
                schema: selectedSchema,
                geometryType: newGeometry,
                columns: columnData,
            }),
        })
        .then(response => {
            if (response.ok) {
                console.log('New table added successfully!');
                showAlert('New table added successfully!', 'green');
                // Refresh the table list
                location.reload();
            } else {
                console.error('Failed to add new table:', response.statusText);
                showAlert('Failed to add new table:', 'red');
            }
        })
        .catch(error => {
            console.error('Error adding new table:', error)
            showAlert('Error adding new table:', 'red');
        });
    } else {
        console.error('Please fill in all fields.');
        showAlert('Please fill in all fields.', 'red');
    }
});