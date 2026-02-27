const { Client } = require('pg');

// Try connecting WITHOUT password since we're using trust authentication
const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'dev_user',
    // NO PASSWORD - trust authentication should allow this
    database: 'business_tracking',
});

console.log('Attempting to connect WITHOUT password (trust auth):');
console.log('Host:', client.host);
console.log('Port:', client.port);
console.log('User:', client.user);
console.log('Database:', client.database);

client.connect()
    .then(() => {
        console.log('✅ Connected successfully WITHOUT password!');
        return client.query('SELECT current_database(), current_user;');
    })
    .then((res) => {
        console.log('Query result:', res.rows);
        return client.end();
    })
    .then(() => {
        console.log('Connection closed');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Connection failed:');
        console.error('Error message:', err.message);
        console.error('Error code:', err.code);
        process.exit(1);
    });
