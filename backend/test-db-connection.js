const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'dev_user',
    password: 'dev_password',
    database: 'business_tracking',
});

console.log('Attempting to connect with:');
console.log('Host:', client.host);
console.log('Port:', client.port);
console.log('User:', client.user);
console.log('Password:', client.password);
console.log('Database:', client.database);

client.connect()
    .then(() => {
        console.log('✅ Connected successfully!');
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
        console.error('Full error:', err);
        process.exit(1);
    });
