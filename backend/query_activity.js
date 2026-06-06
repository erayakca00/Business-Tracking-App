const { Client } = require('pg');
const client = new Client({ user: 'dev_user', password: 'dev_password', host: 'localhost', port: 5432, database: 'business_tracking' });
client.connect().then(() => client.query('SELECT type, data, created_at FROM task_activities WHERE task_id = \'bae8cafa-70dd-4da6-b125-169b0e5b8b39\' ORDER BY created_at ASC')).then(res => { console.log(res.rows); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });
