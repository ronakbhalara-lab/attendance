import * as sql from 'mssql';

const config = {
  server: 'F4',
  database: 'attendance',
  user: 'sa',
  password: 'ved@123',
  port: 1433,
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
    encrypt: false
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool;

export async function getConnection() {
  if (!pool) {
    pool = await sql.connect(config);
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
