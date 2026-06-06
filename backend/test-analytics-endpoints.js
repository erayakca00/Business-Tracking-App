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
    const email = `analytics_admin_${randomSuffix}@example.com`;
    const password = 'Password123!';
    const name = `Analytics Admin ${randomSuffix}`;

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
            name: 'Analytics Test Group',
            description: 'Testing analytics endpoints'
        })
    });
    const group = await res.json();
    const groupId = group.id;
    console.log('Group created:', groupId, group.name);

    // Create Sprint
    console.log('4. Creating sprint...');
    const sprintStart = new Date();
    const sprintEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days sprint
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/sprints`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'Sprint 1',
            goal: 'Complete analytics test',
            startDate: sprintStart.toISOString(),
            endDate: sprintEnd.toISOString()
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

    // Create Task 2 (Done, Effort 5)
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

    // Update Task 2 to 'done'
    console.log('Updating Task Two status to done...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${task2.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'done' })
    });
    console.log('Task Two updated status:', res.status);

    // Create Task 3 (Overdue task: status todo, dueDate in the past)
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    res = await fetch('http://localhost:3000/api/v1/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            groupId,
            title: 'Task Three (Overdue)',
            priority: 'high',
            effort: 2,
            dueDate: pastDate.toISOString()
        })
    });
    const task3 = await res.json();
    console.log('Task Three (Overdue) created:', task3.id);

    // Add Task 1 and Task 2 to Sprint
    console.log('6. Adding Task 1 and Task 2 to sprint...');
    await fetch(`http://localhost:3000/api/v1/sprints/${sprintId}/tasks/${task1.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    await fetch(`http://localhost:3000/api/v1/sprints/${sprintId}/tasks/${task2.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    // Start Sprint
    console.log('7. Starting the sprint...');
    res = await fetch(`http://localhost:3000/api/v1/sprints/${sprintId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Sprint started status:', res.status);

    // Trigger Snapshot for today
    console.log('8. Triggering daily snapshot...');
    const todayStr = new Date().toISOString().slice(0, 10);
    res = await fetch(`http://localhost:3000/api/v1/sprints/${sprintId}/snapshots/trigger`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: todayStr })
    });
    console.log('Snapshot triggered:', res.status);

    // Fetch Group Analytics
    console.log('9. Retrieving group analytics...');
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/analytics`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const analytics = await res.json();
    console.log('Analytics response structure:', Object.keys(analytics));
    console.log('Status Breakdown:', analytics.statusBreakdown);
    console.log('Overdue Tasks count:', analytics.overdueTasks?.length);
    console.log('Active Sprint info:', analytics.activeSprint);

    // Fetch Sprint Burndown
    console.log('10. Retrieving sprint burndown...');
    res = await fetch(`http://localhost:3000/api/v1/sprints/${sprintId}/burndown`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const burndown = await res.json();
    console.log('Burndown response structure:', Object.keys(burndown));
    console.log('First 3 burndown days:', burndown.burndownData?.slice(0, 3));

    await pgClient.end();
}

run().catch(console.error);
