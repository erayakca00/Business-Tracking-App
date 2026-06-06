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
    const email = `ai_test_${randomSuffix}@example.com`;
    const password = 'Password123!';
    const name = `AI Tester ${randomSuffix}`;

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
            name: 'AI Test Group',
            description: 'Testing AI Summarizer'
        })
    });
    const group = await res.json();
    const groupId = group.id;
    console.log('Group created:', groupId, group.name);

    // Create Task
    console.log('4. Creating task...');
    res = await fetch('http://localhost:3000/api/v1/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            groupId,
            title: 'AI Caching Test Task',
            description: 'This is a description that will be summarized.',
            priority: 'medium'
        })
    });
    const task = await res.json();
    const taskId = task.id;
    console.log('Task created:', taskId, task.title);

    // Verify AI fields are null initially
    let dbRes = await pgClient.query("SELECT ai_summary, ai_summary_updated_at FROM tasks WHERE id = $1", [taskId]);
    console.log('Initial DB state:', dbRes.rows[0]);
    if (dbRes.rows[0].ai_summary !== null) {
        throw new Error('Initial ai_summary should be null');
    }

    // Call summarize endpoint
    console.log('\n5. Requesting AI Summary (Generation 1)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskId}/summarize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const taskWithSummary1 = await res.json();
    console.log('Summarize Status:', res.status);
    console.log('Generated Summary:', taskWithSummary1.aiSummary);
    console.log('Generated Timestamp:', taskWithSummary1.aiSummaryUpdatedAt);
    if (!taskWithSummary1.aiSummary || !taskWithSummary1.aiSummaryUpdatedAt) {
        throw new Error('aiSummary or aiSummaryUpdatedAt is missing');
    }

    // Verify DB columns are populated
    dbRes = await pgClient.query("SELECT ai_summary, ai_summary_updated_at FROM tasks WHERE id = $1", [taskId]);
    console.log('Post-Gen DB state:', dbRes.rows[0]);
    if (!dbRes.rows[0].ai_summary || !dbRes.rows[0].ai_summary_updated_at) {
        throw new Error('DB columns should be populated after summarization');
    }

    // Call summarize endpoint again (should hit cache)
    console.log('\n6. Requesting AI Summary again (Cache hit test)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskId}/summarize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const taskWithSummary2 = await res.json();
    console.log('Summarize 2 Status:', res.status);
    console.log('Cached Timestamp:', taskWithSummary2.aiSummaryUpdatedAt);
    if (taskWithSummary1.aiSummaryUpdatedAt !== taskWithSummary2.aiSummaryUpdatedAt) {
        throw new Error('Timestamps do not match! Cache hit failed.');
    }
    console.log('Cache hit verified (timestamps are identical).');

    // Invalidation on update task
    console.log('\n7. Updating task status (Cache invalidation test)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            status: 'in_progress'
        })
    });
    console.log('Update Task Status:', res.status);

    // Verify cache was invalidated in DB
    dbRes = await pgClient.query("SELECT ai_summary, ai_summary_updated_at FROM tasks WHERE id = $1", [taskId]);
    console.log('Post-Update DB state:', dbRes.rows[0]);
    if (dbRes.rows[0].ai_summary !== null || dbRes.rows[0].ai_summary_updated_at !== null) {
        throw new Error('Cache was not invalidated on task update!');
    }
    console.log('Cache invalidation on task update verified.');

    // Regenerate summary
    console.log('\n8. Re-generating summary...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskId}/summarize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const taskWithSummary3 = await res.json();
    console.log('Re-generated Timestamp:', taskWithSummary3.aiSummaryUpdatedAt);

    // Comment added invalidation test
    console.log('\n9. Adding a comment (Cache invalidation test)...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            content: 'This is a comment that invalidates summary.'
        })
    });
    const comment = await res.json();
    const commentId = comment.id;
    console.log('Comment Created:', commentId);

    // Verify cache was invalidated in DB
    dbRes = await pgClient.query("SELECT ai_summary, ai_summary_updated_at FROM tasks WHERE id = $1", [taskId]);
    console.log('Post-Comment DB state:', dbRes.rows[0]);
    if (dbRes.rows[0].ai_summary !== null || dbRes.rows[0].ai_summary_updated_at !== null) {
        throw new Error('Cache was not invalidated on comment creation!');
    }
    console.log('Cache invalidation on comment creation verified.');

    // Regenerate summary
    console.log('\n10. Re-generating summary...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskId}/summarize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const taskWithSummary4 = await res.json();
    console.log('Re-generated Timestamp:', taskWithSummary4.aiSummaryUpdatedAt);

    // Comment edit invalidation test
    console.log('\n11. Updating the comment (Cache invalidation test)...');
    res = await fetch(`http://localhost:3000/api/v1/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            content: 'This is an updated comment content.'
        })
    });
    console.log('Comment Update Status:', res.status);

    // Verify cache was invalidated in DB
    dbRes = await pgClient.query("SELECT ai_summary, ai_summary_updated_at FROM tasks WHERE id = $1", [taskId]);
    console.log('Post-Comment-Update DB state:', dbRes.rows[0]);
    if (dbRes.rows[0].ai_summary !== null || dbRes.rows[0].ai_summary_updated_at !== null) {
        throw new Error('Cache was not invalidated on comment update!');
    }
    console.log('Cache invalidation on comment update verified.');

    // Regenerate summary
    console.log('\n12. Re-generating summary...');
    res = await fetch(`http://localhost:3000/api/v1/tasks/${taskId}/summarize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const taskWithSummary5 = await res.json();
    console.log('Re-generated Timestamp:', taskWithSummary5.aiSummaryUpdatedAt);

    // Comment delete invalidation test
    console.log('\n13. Deleting the comment (Cache invalidation test)...');
    res = await fetch(`http://localhost:3000/api/v1/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    console.log('Comment Delete Status:', res.status);

    // Verify cache was invalidated in DB
    dbRes = await pgClient.query("SELECT ai_summary, ai_summary_updated_at FROM tasks WHERE id = $1", [taskId]);
    console.log('Post-Comment-Delete DB state:', dbRes.rows[0]);
    if (dbRes.rows[0].ai_summary !== null || dbRes.rows[0].ai_summary_updated_at !== null) {
        throw new Error('Cache was not invalidated on comment deletion!');
    }
    console.log('Cache invalidation on comment deletion verified.');

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
    await pgClient.end();
}

run().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
