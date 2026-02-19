import * as sql from 'mssql';

const config = {
  server: 'F4\\F4',
  database: 'attendanceTest',
  user: 'sa',
  password: 'ved@123',
  port: 1433,
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
    encrypt: false,
    connectionTimeout: 60000,
    requestTimeout: 60000
  },
  connectionTimeout: 60000,
  requestTimeout: 60000,
};

let pool;
let connectionRetries = 0;
const maxRetries = 3;

export async function getConnection() {
  if (!pool) {
    try {
      console.log(`Attempting database connection (attempt ${connectionRetries + 1})...`);
      pool = await sql.connect(config);
      console.log('Database connection successful');
      connectionRetries = 0; // Reset counter on successful connection
    } catch (error) {
      console.error(`Database connection attempt ${connectionRetries + 1} failed:`, error);
      connectionRetries++;
      
      if (connectionRetries >= maxRetries) {
        console.error('Max connection retries reached. Please check database server.');
        throw new Error('Database connection failed after multiple attempts');
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return getConnection(); // Retry recursively
    }
  }
  return pool;
}

export async function query(sqlQuery, params = []) {
  const pool = await getConnection();
  const request = pool.request();
  
  params.forEach((param, index) => {
    request.input(`param${index}`, param);
    // Replace ? with @param0, @param1, etc.
    sqlQuery = sqlQuery.replace('?', `@param${index}`);
  });
  
  const result = await request.query(sqlQuery);
  return result.recordset;
}

export async function closeConnection() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
