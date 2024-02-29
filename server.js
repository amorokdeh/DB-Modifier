const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const pyPath = '/usr/local/datenwerft/datenwerft/datenmanagement/models/models_complex.py'

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'datenmanagement',
  password: 'postgres',
  port: 5432,
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


app.get('/schema-names', async (req, res) => {
  try {
      const result = await pool.query('SELECT schema_name FROM information_schema.schemata;');
      const schemaNames = result.rows.map(row => row.schema_name);
      res.json(schemaNames);
  } catch (error) {
      console.error('Error fetching schema names', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/table-names', async (req, res) => {
  const { schema } = req.query;

  try {
    let query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
    `;

    if (schema) {
      query += ` AND table_schema = '${schema}'`;
    }

    const result = await pool.query(query);

    const tableNames = result.rows.map(row => row.table_name);

    res.json(tableNames);
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.get('/table-info', async (req, res) => {
  const { tableName, schema } = req.query; // Extract the query parameters from the request

  try {
      // Construct the schema-qualified table name
      const qualifiedTableName = schema ? `${schema}.${tableName}` : tableName;

      // Query for column names
      const columnsResult = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1;`, [qualifiedTableName]);

      // Query for rows
      const rowsResult = await pool.query(`SELECT * FROM ${qualifiedTableName};`);

      const columns = columnsResult.rows.map(row => row.column_name);
      const rows = rowsResult.rows;

      res.json({ columns, rows });
  } catch (error) {
      console.error(`Error fetching info for table ${tableName} in schema ${schema}`, error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/add-table', async (req, res) => {
  const { tableName, tableDescription, schema, geometryType, columns } = req.body;

  try {
      // Build the column definitions string
      const columnDefinitions = columns.map(column => `${column.columnName} ${column.dataType}`).join(', ');


      // Construct the schema-qualified table name
      const qualifiedTableName = schema ? `"${schema}"."${tableName}"` : tableName;

      // Create a new table with the provided columns and data types
      await pool.query(`
          CREATE TABLE ${qualifiedTableName} (
              uuid UUID DEFAULT uuid_generate_v4(),
              erstellt DATE DEFAULT (now())::date,
              aktualisiert DATE DEFAULT (now())::date,
              aktiv BOOLEAN DEFAULT true,
              ${columnDefinitions},
              geometrie GEOMETRY
          );
      `);

      // Call a function to update the Python file with table information
      updatePythonFile(tableName, schema, tableDescription, geometryType, columns);

      res.sendStatus(200); // Success response
  } catch (error) {
      console.error('Error adding new table', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

  app.delete('/delete-table/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const { schema } = req.body;
    try {
        // Drop the table from the 'fachdaten' schema
        await pool.query(`DROP TABLE IF EXISTS ${schema}.${tableName};`);
        // Remove the corresponding class from the Python file
        removePythonClass(tableName);
        res.sendStatus(200); // Success response
    } catch (error) {
        console.error(`Error deleting table '${tableName}' from schema '${schema}'`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Function to update the Python file
function updatePythonFile(tableName, schema, tableDescription, geometryColumn, columns) {

  // Read the existing content of the Python file
  fs.readFile(pyPath, 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading Python file', err);
          return;
      }

      // Modify the content to include the new table information
      const allColumnNames = columns.map(column => `      '${column.columnName}': '${column.columnName.charAt(0).toUpperCase()}${column.columnName.slice(1)}',`).join('\n');
      const columnsInfo = columns.map(column => {
        let columnInfo;
        if (column.dataType === 'character varying') {
            columnInfo = `  ${column.columnName} = CharField(
    verbose_name='${column.columnName}',
    validators=standard_validators
  )`;
        } else if (column.dataType === 'text') {
          columnInfo = `  ${column.columnName} = NullTextField(
    verbose_name='${column.columnName}',
    max_length=500,
    blank=True,
    null=True,
    validators=standard_validators
  )`;
        } else if (column.dataType === 'integer') {
          columnInfo = `  ${column.columnName} = PositiveIntegerRangeField(
    verbose_name='${column.columnName}',
    blank=True,
    default=0
  )`;
        }else if (column.dataType === 'smallint') {
          columnInfo = `  ${column.columnName} = PositiveSmallIntegerRangeField(
    verbose_name='${column.columnName}',
    min_value=1,
    blank=True,
    null=True
  )`;
        } else if (column.dataType === 'boolean') {
          columnInfo = `  ${column.columnName} = BooleanField(
    verbose_name='${column.columnName}',
    blank=True,
    null=True
  )`;
        } else if (column.dataType === 'date') {
          columnInfo = `  ${column.columnName} = DateField(
    verbose_name='${column.columnName}',
  )`;
        } else if (column.dataType === 'decimal') {
          columnInfo = `  ${column.columnName} = DecimalField(
    verbose_name='${column.columnName}',
    max_digits=7,
    decimal_places=2,
    default=0
  )`;
        }
        return columnInfo;
    }).join('\n');

    let geometryType;

    if(geometryColumn === 'point_field'){
      geometryType = 'Point'
    } else if(geometryColumn === 'multipolygon_field'){
      geometryType = 'MultiPolygon'
    }

      // Construct the new content
      const newContent = `
${data}
#start class ${tableName}
class ${tableName}(ComplexModel):
  """
  ${tableDescription}
  """
${columnsInfo}
  geometry = ${geometryColumn}
  class Meta(ComplexModel.Meta):
    db_table = '${schema}\\".\\"${tableName}'
    verbose_name = '${tableName}'
    verbose_name_plural = '${tableName}'
  class BasemodelMeta(ComplexModel.BasemodelMeta):
    description = '${tableDescription}'
    geometry_type = '${geometryType}'
    list_fields = {
      'aktiv': 'aktiv?',
${allColumnNames}
    }
    map_filter_fields = {
${allColumnNames}
    }
#end class ${tableName}`;

      // Write the updated content back to the Python file
      fs.writeFile(pyPath, newContent, 'utf8', (err) => {
          if (err) {
              console.error('Error writing to Python file', err);
          } else {
              console.log('Python file updated successfully');
          }
      });
  });
}

// Function to remove the corresponding Python class
function removePythonClass(tableName) {
  // Read the existing content of the Python file
  fs.readFile(pyPath, 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading Python file', err);
          return;
      }

      // Identify the lines of the class to be removed
      const startComment = `#start class ${tableName}`;
      const endComment = `#end class ${tableName}`;
      const startIndex = data.indexOf(startComment);
      const endIndex = data.indexOf(endComment) + endComment.length;

      if (startIndex !== -1 && endIndex !== -1) {
          // Remove the identified lines from the Python file
          const updatedContent = data.substring(0, startIndex) + data.substring(endIndex);

          // Remove empty lines
          const cleanedContent = removeEmptyLines(updatedContent);
          
          // Write the updated content back to the Python file
          fs.writeFile(pyPath, cleanedContent, 'utf8', (writeErr) => {
              if (writeErr) {
                  console.error('Error writing to Python file', writeErr);
              } else {
                  console.log(`Python class for table '${tableName}' removed successfully`);
              }
          });
      } else {
          console.log(`Python class for table '${tableName}' not found`);
      }
  });
}

// Function to remove empty lines from a string
function removeEmptyLines(content) {
  return content.replace(/^\s*[\r\n]/gm, '');
}

app.get('*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
