// Simple test to verify database connection and schema
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');

async function testDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    // Test basic query
    const result = await db.execute('SELECT COUNT(*) FROM appointments');
    console.log('✅ Database connection successful');
    console.log('📊 Appointments count:', result.rows[0].count);

    // Test table structure
    const columns = await db.execute(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'appointments'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Appointments table structure:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testDatabase();