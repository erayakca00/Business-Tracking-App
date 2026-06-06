const { Client } = require('pg');

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
    const email = `test_user_${randomSuffix}@example.com`;
    const password = 'Password123!';
    const name = `Test User ${randomSuffix}`;

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
            name: 'Dependency Test Group',
            description: 'Testing dependencies and timers'
        })
    });
    const group = await res.json();
    const groupId = group.id;
    console.log('Group created:', groupId, group.name);

    // Create Task A
    console.log('4. Creating Task A...');
    res = await fetch('http://localhost:3000/api/v1/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            groupId,
            title: 'Task A',
            status: 'todo',
            priority: 'medium'
        })
    });
    const taskA = await res.json();
    console.log('Task A created:', taskA.id);

    // Create Task B
    console.log('5. Creating Task B...');
    res = await fetch('http://localhost:3000/api/v1/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            groupId,
            title: 'Task B',
            status: 'todo',
            priority: 'high'
        })
    });
    const taskB = await res.json();
    console.log('Task B created:', taskB.id);

    // ==========================================
    // Dependency & Circular Dependency Tests
    // ==========================================
    console.log('\n--- Testing Dependencies ---');
    
    // Add blocker: B blocks A (A depends on B)
    console.log('6. Adding blocker: Task B blocks Task A...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskA.id}/dependencies`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            blockingTaskId: taskB.id
        })
    });
    console.log('Add blocker status:', res.status);
    const depData = await res.json();
    console.log('Task A now blockedBy length:', depData.blockedBy?.length);

    // Try circular blocker: A blocks B (would result in A -> B -> A loop)
    console.log('7. Trying circular blocker: Task A blocks Task B (should fail)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskB.id}/dependencies`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            blockingTaskId: taskA.id
        })
    });
    console.log('Circular blocker status (expected 400):', res.status);
    const circularErr = await res.json();
    console.log('Circular error message:', circularErr.message);

    // Try self blocker
    console.log('8. Trying self blocker: Task A blocks Task A (should fail)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskA.id}/dependencies`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            blockingTaskId: taskA.id
        })
    });
    console.log('Self blocker status (expected 400):', res.status);
    const selfErr = await res.json();
    console.log('Self error message:', selfErr.message);


    // ==========================================
    // State Transition Constraints Tests
    // ==========================================
    console.log('\n--- Testing State Transition Constraints ---');

    // Try moving Task A to 'in_progress' (should fail since B is unresolved/todo)
    console.log('9. Moving blocked Task A to in_progress (should fail)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskA.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            status: 'in_progress'
        })
    });
    console.log('Status change of blocked task (expected 400):', res.status);
    const blockedErr = await res.json();
    console.log('Blocked error message:', blockedErr.message);

    // Complete Task B
    console.log('10. Completing blocker Task B...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskB.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            status: 'done'
        })
    });
    console.log('Task B completion status (expected 200):', res.status);

    // Try moving Task A to 'in_progress' again (should now succeed since B is done)
    console.log('11. Moving Task A to in_progress (should now succeed)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskA.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            status: 'in_progress'
        })
    });
    console.log('Status change of freed task status (expected 200):', res.status);
    const freedTask = await res.json();
    console.log('Freed Task A status:', freedTask.status);


    // ==========================================
    // Time Tracking Tests
    // ==========================================
    console.log('\n--- Testing Time Tracking ---');

    // Start timer on Task A
    console.log('12. Starting timer on Task A...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskA.id}/time/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            note: 'Working on dependencies'
        })
    });
    console.log('Start timer status (expected 201):', res.status);
    
    console.log('Waiting 3 seconds...');
    await wait(3000);

    // Start timer on Task B (should stop timer on Task A automatically)
    console.log('13. Starting timer on Task B (should auto-stop timer A)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskB.id}/time/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            note: 'Testing autostop'
        })
    });
    console.log('Start timer B status:', res.status);

    console.log('Waiting 1 second...');
    await wait(1000);

    // Stop timer on Task B
    console.log('14. Stopping timer on Task B...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskB.id}/time/stop`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    console.log('Stop timer B status:', res.status);

    // Retrieve time logs for Task A
    console.log('15. Checking logs for Task A...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskA.id}/time`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const logsA = await res.json();
    console.log('Task A logs:', logsA.map(l => ({ note: l.note, duration: l.duration, ended: !!l.endedAt })));

    // Retrieve time logs for Task B
    console.log('16. Checking logs for Task B...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskB.id}/time`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const logsB = await res.json();
    console.log('Task B logs:', logsB.map(l => ({ note: l.note, duration: l.duration, ended: !!l.endedAt })));

    // Add manual time log
    console.log('17. Adding manual time log on Task A (1 hour)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskA.id}/time/manual`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            durationSeconds: 3600,
            note: 'Manual logs'
        })
    });
    console.log('Manual log status:', res.status);

    // Retrieve Group Time Report
    console.log('18. Retrieving Group Time Report...');
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/time-report`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const report = await res.json();
    console.log('Group Time Report entries count:', report.length);
    console.log('Group Time Report entries:', report.map(l => ({ task: l.task?.title, user: l.user?.name, duration: l.duration, note: l.note })));

    await pgClient.end();
    console.log('\nTests completed successfully!');
}

run().catch(console.error);
