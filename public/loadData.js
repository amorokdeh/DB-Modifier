// Fetch table names from the server and update the HTML list
function fetchTableNames() {
    fetch('/table-names')
        .then(response => response.json())
        .then(tableNames => {
            const tableListContainer = document.getElementById('table-list-container');
            tableListContainer.innerHTML = ''; // Clear existing content

            tableNames.forEach(tableName => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<p class="table-name">${tableName}</p>`;
                tableListContainer.appendChild(card);
            });

            // Add event listener to each table name to fetch and display table info
            document.querySelectorAll('.card').forEach(tableNameElement => {
                tableNameElement.addEventListener('click', () => {
                    const tableName = tableNameElement.textContent;
                    fetchTableInfo(tableName);
                });
            });
        })
        .catch(error => {
            console.error('Error fetching table names', error);
            showAlert('Error fetching table names','red');
        });
}


// Fetch and display table info (columns and rows)
function fetchTableInfo(tableName) {
    const schemaSelect = document.getElementById('schema-select');
    const selectedSchema = schemaSelect.value;
    fetch(`/table-info?tableName=${tableName}&schema=${selectedSchema}`)
        .then(response => {
            if (!response.ok) {
                showAlert('Failed to fetch table info','red');
                throw new Error(`Failed to fetch table info for ${tableName}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(tableInfo => {
            const tableInfoContent = document.getElementById('table-info-content');
            tableInfoContent.innerHTML = `
                <h2>Table: ${tableName}</h2>
                <button id="delete-table-btn">Delete Table</button>
                <h3>Columns:</h3>
                <ul>
                    ${tableInfo.columns.map(column => `<li>${column}</li>`).join('')}
                </ul>
                <h3>Rows:</h3>
                <ul>
                    ${tableInfo.rows.map(row => `<li>${JSON.stringify(row)}</li>`).join('')}
                </ul>
            `;

            // Display the modal
            const tableInfoModal = document.getElementById('table-info-modal');
            tableInfoModal.style.display = 'block';

            // Add event listener to the delete table button
            document.getElementById('delete-table-btn').addEventListener('click', () => {
                // Call a function to handle the deletion of the current table
                confirmDeleteTable(tableName);
                // Close the modal after deletion
                tableInfoModal.style.display = 'none';
            });

            // Add event listener to close the modal
            document.querySelector('.close').addEventListener('click', () => {
                tableInfoModal.style.display = 'none';
            });
        })
        .catch(error => {
            console.error(`Error fetching info for table ${tableName}`, error);
            showAlert('Error fetching info for table','red');
            alert(`Error fetching info for table ${tableName}: ${error.message}`);
        });
}

//updatte fetchTableInfo
document.getElementById('table-list-container').addEventListener('click', (event) => {
    const target = event.target;
    if (target.classList.contains('card')) {
        const tableName = target.querySelector('.table-name').textContent;
        fetchTableInfo(tableName);
    }
});

function fetchSchemaNames() {
    fetch('/schema-names')
        .then(response => response.json())
        .then(schemaNames => {
            const schemaSelect = document.getElementById('schema-select');
            schemaSelect.innerHTML = ''; // Clear existing options

            schemaNames.forEach(schemaName => {
                const option = document.createElement('option');
                option.value = schemaName;
                option.textContent = schemaName;
                schemaSelect.appendChild(option);
            });

            // Trigger changeSchema on page load
            changeSchema();
        })
        .catch(error => {
            console.error('Error fetching schema names', error);
            showAlert('Error fetching schema names','red');
        });
}

function changeSchema() {
    const schemaSelect = document.getElementById('schema-select');
    const selectedSchema = schemaSelect.value;

    fetch(`/table-names?schema=${selectedSchema}`)
        .then(response => response.json())
        .then(tableNames => {
            const tableListContainer = document.getElementById('table-list-container');
            tableListContainer.innerHTML = ''; // Clear existing content

            if (Array.isArray(tableNames)) {
                tableNames.forEach(tableName => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `<p class="table-name">${tableName}</p>`;
                    tableListContainer.appendChild(card);
                });
            } else {
                console.error('Error: Received unexpected data format from server.');
                showAlert('Error: Received unexpected data format from server.','red');
            }
        })
        .catch(error => {
            console.error(`Error fetching table names for schema ${selectedSchema}`, error);
            showAlert('Error fetching table names for schema','red');
        });
}


// Fetch initial schema names and table names when the page loads
fetchSchemaNames();

