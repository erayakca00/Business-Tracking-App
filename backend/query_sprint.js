const { Client } = require('pg');
const client = new Client({ user: 'dev_user', password: 'dev_password', host: 'localhost', port: 5432, database: 'business_tracking' });
client.connect().then(() => client.query('SELECT name, status, end_date FROM sprints WHERE id = \'ec1117b8-d747-4033-bc0d-bde291dac87b\'')).then(res => { console.log(res.rows); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });
