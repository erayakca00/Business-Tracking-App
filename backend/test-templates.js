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
    const adminEmail = `tpl_admin_${randomSuffix}@example.com`;
    const memberEmail = `tpl_member_${randomSuffix}@example.com`;
    const strangerEmail = `tpl_stranger_${randomSuffix}@example.com`;
    const password = 'Password123!';

    console.log('--- 1. Registering users ---');
    for (const email of [adminEmail, memberEmail, strangerEmail]) {
        console.log(`Registering ${email}...`);
        const res = await fetch('http://localhost:3000/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: email.split('@')[0] })
        });
        console.log(`Register ${email} status:`, res.status);
    }

    // Verify users in DB
    await pgClient.query("UPDATE users SET is_verified = true, verification_token = null WHERE email IN ($1, $2, $3)", [adminEmail, memberEmail, strangerEmail]);
    console.log('Users verified in DB.');

    // Login users to get tokens
    console.log('\n--- 2. Logging in users ---');
    const getTokens = async (email) => {
        const res = await fetch('http://localhost:3000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        return data.access_token;
    };

    const adminToken = await getTokens(adminEmail);
    const memberToken = await getTokens(memberEmail);
    const strangerToken = await getTokens(strangerEmail);
    console.log('Tokens obtained: Admin =', !!adminToken, ', Member =', !!memberToken, ', Stranger =', !!strangerToken);

    // Create Group
    console.log('\n--- 3. Creating group ---');
    let res = await fetch('http://localhost:3000/api/v1/groups', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            name: 'Templates Test Group',
            description: 'Testing task templates features'
        })
    });
    const group = await res.json();
    const groupId = group.id;
    console.log('Group created ID:', groupId);

    // Add Member to Group
    console.log('\n--- 4. Adding member to group ---');
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ email: memberEmail })
    });
    console.log('Add member status:', res.status);

    // Create a reference task in group
    console.log('\n--- 5. Creating reference task ---');
    res = await fetch('http://localhost:3000/api/v1/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            groupId,
            title: 'Reference Task Title',
            description: 'Cloned Task Description',
            priority: 'medium',
            effort: 4,
            projectTag: 'REF-99'
        })
    });
    const referenceTask = await res.json();
    const referenceTaskId = referenceTask.id;
    console.log('Reference task created ID:', referenceTaskId);

    // --- SECURITY CHECKS: CREATE TEMPLATE ---
    console.log('\n--- 6. Security Checks: Create Template ---');
    
    // Stranger tries to create manual template
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/templates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strangerToken}`
        },
        body: JSON.stringify({ name: 'Stranger Manual' })
    });
    console.log('Stranger create manual status (expect fail):', res.status);
    if (res.status === 200 || res.status === 201) throw new Error('Stranger should not be able to create a template');

    // Member tries to create manual template
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/templates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${memberToken}`
        },
        body: JSON.stringify({ name: 'Member Manual' })
    });
    console.log('Member create manual status (expect fail/403):', res.status);
    if (res.status === 200 || res.status === 201) throw new Error('Member should not be able to create a template');

    // --- TEMPLATE CREATION ---
    console.log('\n--- 7. Template Creation (Admin) ---');

    // Admin creates manual template
    console.log('Admin creating manual template...');
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/templates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            name: 'Manual Template',
            title: 'Manual Prefill Title',
            description: 'Manual Prefill Description',
            priority: 'high',
            effort: 3,
            projectTag: 'MAN-1'
        })
    });
    console.log('Admin create manual template status (expect 201):', res.status);
    const manualTemplate = await res.json();
    console.log('Manual template:', manualTemplate);
    const manualTemplateId = manualTemplate.id;

    // Admin creates template by cloning existing task
    console.log('Admin creating template from reference task...');
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/templates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            name: 'Cloned Template',
            taskId: referenceTaskId
        })
    });
    console.log('Admin create cloned template status (expect 201):', res.status);
    const clonedTemplate = await res.json();
    console.log('Cloned template:', clonedTemplate);
    const clonedTemplateId = clonedTemplate.id;

    // Verify cloned template fields copied correctly from reference task
    if (
        clonedTemplate.title !== 'Reference Task Title' ||
        clonedTemplate.description !== 'Cloned Task Description' ||
        clonedTemplate.priority !== 'medium' ||
        clonedTemplate.effort !== 4 ||
        clonedTemplate.projectTag !== 'REF-99'
    ) {
        throw new Error('Cloned template fields do not match reference task fields');
    }
    console.log('Cloned template fields verified successfully.');

    // --- TEMPLATE LISTING ---
    console.log('\n--- 8. Listing Templates & Permissions ---');

    // Stranger tries to list templates
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/templates`, {
        headers: { 'Authorization': `Bearer ${strangerToken}` }
    });
    console.log('Stranger list templates status (expect fail):', res.status);
    if (res.status === 200) throw new Error('Stranger should not be able to list group templates');

    // Member lists templates
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/templates`, {
        headers: { 'Authorization': `Bearer ${memberToken}` }
    });
    console.log('Member list templates status (expect 200):', res.status);
    const templatesList = await res.json();
    console.log('Templates list size (expect 2):', templatesList.length);
    if (templatesList.length !== 2) throw new Error('Templates list should contain exactly 2 templates');

    // --- INSTANTIATE TASK FROM TEMPLATE ---
    console.log('\n--- 9. Creating Task from Template ---');

    // Admin creates task from Manual Template (since regular members cannot create tasks in the base app rules)
    res = await fetch(`http://localhost:3000/api/v1/tasks/from-template/${manualTemplateId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('Admin create task from template status (expect 201):', res.status);
    const taskFromTemplate = await res.json();
    console.log('Task instantiated from template:', taskFromTemplate);

    // Verify values copied
    if (
        taskFromTemplate.title !== 'Manual Prefill Title' ||
        taskFromTemplate.description !== 'Manual Prefill Description' ||
        taskFromTemplate.priority !== 'high' ||
        taskFromTemplate.effort !== 3 ||
        taskFromTemplate.projectTag !== 'MAN-1' ||
        taskFromTemplate.status !== 'todo'
    ) {
        throw new Error('Task created from template does not match prefill values');
    }
    console.log('Task prefilled values verified successfully.');

    // --- SECURITY CHECKS: DELETE TEMPLATE ---
    console.log('\n--- 10. Security Checks & Template Deletion ---');

    // Stranger tries to delete manual template
    res = await fetch(`http://localhost:3000/api/v1/templates/${manualTemplateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${strangerToken}` }
    });
    console.log('Stranger delete template status (expect fail):', res.status);
    if (res.status === 200 || res.status === 204) throw new Error('Stranger should not be able to delete a template');

    // Member tries to delete manual template
    res = await fetch(`http://localhost:3000/api/v1/templates/${manualTemplateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${memberToken}` }
    });
    console.log('Member delete template status (expect fail/403):', res.status);
    if (res.status === 200 || res.status === 204) throw new Error('Member should not be able to delete a template');

    // Admin deletes manual template
    res = await fetch(`http://localhost:3000/api/v1/templates/${manualTemplateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('Admin delete template status (expect 200/204):', res.status);

    // Member lists templates again to verify deletion
    res = await fetch(`http://localhost:3000/api/v1/groups/${groupId}/templates`, {
        headers: { 'Authorization': `Bearer ${memberToken}` }
    });
    const finalTemplatesList = await res.json();
    console.log('Templates list size after delete (expect 1):', finalTemplatesList.length);
    if (finalTemplatesList.length !== 1 || finalTemplatesList[0].id !== clonedTemplateId) {
        throw new Error('Deletion failed to reflect correctly in group templates list');
    }

    console.log('\n======================================');
    console.log('🎉 ALL TASK TEMPLATES TESTS PASSED! 🎉');
    console.log('======================================');

    await pgClient.end();
}

run().catch(async (error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
