const { Client } = require('pg');
const client = new Client({ user: 'dev_user', password: 'dev_password', host: 'localhost', port: 5432, database: 'business_tracking' });
client.connect().then(() => client.query('SELECT t.id, t.title, t.status, t.sprint_id, s.name as sprint_name FROM tasks t JOIN sprints s ON t.sprint_id = s.id WHERE t.status != \'done\' AND s.status = \'completed\'')).then(res => { console.log(res.rows); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });
