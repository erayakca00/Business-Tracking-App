const { Client } = require('pg');

async function run() {
    const pgClient = new Client({
        user: 'dev_user',
        password: 'dev_password',
        host: 'localhost',
        port: 5432,
        database: 'business_tracking'
    });
    await pgClient.connect();

    const randomSuffix = Math.floor(Math.random() * 10000);
    const email = `sprint_admin_${randomSuffix}@example.com`;
    const password = 'Password123!';
    const name = `Sprint Admin ${randomSuffix}`;

    console.log(`1. Registering user: ${email}...`);
    let res = await fetch('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
    });
    console.log('Register status:', res.status);

    // Verify user in DB
    await pgClient.query("UPDATE users SET is_verified = true, verification_token = null WHERE email = $1", [email]);
    console.log('User verified in DB.');

    // Login
    console.log('2. Logging in...');
    res = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const loginData = await res.json();
    const token = loginData.access_token;
    console.log('Login status:', res.status, 'Token acquired:', !!token);

    // Create Group
    console.log('3. Creating group...');
    res = await fetch('http://localhost:3000/api/v1/groups', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'Snapshot Test Group',
            description: 'Testing sprint snapshots'
        })
    });
    const group = await res.json();
    const groupId = group.id;
    console.log('Group created:', groupId, group.name);

    // Create Sprint
    console.log('4. Creating sprint...');
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/sprints`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'Sprint 1',
            goal: 'Complete snapshot test',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
    });
    const sprint = await res.json();
    const sprintId = sprint.id;
    console.log('Sprint created:', sprintId, sprint.name);

    // Create Task 1 (Todo, Effort 3)
    console.log('5. Creating tasks...');
    res = await fetch('http://localhost:3000/api/v1/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            groupId,
            title: 'Task One',
            priority: 'medium',
            effort: 3
        })
    });
    const task1 = await res.json();
    console.log('Task One created:', task1.id);

    // Create Task 2 (Effort 5, will update status to done)
    res = await fetch('http://localhost:3000/api/v1/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            groupId,
            title: 'Task Two',
            priority: 'high',
            effort: 5
        })
    });
    const task2 = await res.json();
    console.log('Task Two created:', task2.id);

    // Update Task 2 to 'done'
    console.log('Updating Task Two status to done...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${task2.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            status: 'done'
        })
    });
    console.log('Task Two updated status:', res.status);

    // Add Tasks to Sprint
    console.log('6. Adding tasks to sprint...');
    const addRes1 = await fetch(`http://localhost:3000/api/v1/sprints/${sprintId}/tasks/${task1.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Add Task 1 Status:', addRes1.status);

    const addRes2 = await fetch(`http://localhost:3000/api/v1/sprints/${sprintId}/tasks/${task2.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Add Task 2 Status:', addRes2.status);

    // Trigger Manual Snapshot
    console.log('7. Triggering manual snapshot...');
    res = await fetch(`http://localhost:3000/api/v1/sprints/${sprintId}/snapshots/trigger`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: '2026-06-04' })
    });
    const snapshotRes = await res.json();
    console.log('Snapshot triggered status:', res.status, 'response:', snapshotRes);

    // Fetch Snapshots
    console.log('8. Retrieving snapshots...');
    res = await fetch(`http://localhost:3000/api/v1/sprints/${sprintId}/snapshots`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const snapshots = await res.json();
    console.log('Snapshots in DB:', JSON.stringify(snapshots, null, 2));

    await pgClient.end();
}

run().catch(console.error);
