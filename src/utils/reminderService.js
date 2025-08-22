const cron = require('node-cron');
const { sendProductRequestReminder, sendReturnRequestReminder } = require('./emailService');

// We'll receive the pool as a parameter instead of importing
let dbPool = null;

const setDatabasePool = (pool) => {
    dbPool = pool;
};

// Get monitor emails
const getMonitorEmails = async () => {
    const query = `
        SELECT DISTINCT u.email 
        FROM users u 
        WHERE u.role = 'monitor' AND u.is_active = 1
    `;
    const [monitors] = await dbPool.execute(query);
    return monitors.map(m => m.email);
};

// Check and send product request reminders
const checkProductRequestReminders = async () => {
    try {
        const [pendingRequests] = await dbPool.execute(
            'SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"'
        );
        
        const pendingCount = pendingRequests[0].count;
        
        if (pendingCount > 0) {
            const monitorEmails = await getMonitorEmails();
            if (monitorEmails.length > 0) {
                await sendProductRequestReminder(monitorEmails, pendingCount);
                console.log(`📧 Product request reminder sent: ${pendingCount} pending requests`);
            }
        }
    } catch (error) {
        console.error('Error sending product request reminder:', error);
    }
};

// Check and send return request reminders
const checkReturnRequestReminders = async () => {
    try {
        const [pendingReturns] = await dbPool.execute(`
            SELECT COUNT(*) as count 
            FROM product_assignments 
            WHERE (remarks = 'RETURN_REQUESTED' OR return_status = 'requested')
        `);
        
        const pendingCount = pendingReturns[0].count;
        
        if (pendingCount > 0) {
            const monitorEmails = await getMonitorEmails();
            if (monitorEmails.length > 0) {
                await sendReturnRequestReminder(monitorEmails, pendingCount);
                console.log(`📧 Return request reminder sent: ${pendingCount} pending returns`);
            }
        }
    } catch (error) {
        console.error('Error sending return request reminder:', error);
    }
};

// Start reminder service
const startReminderService = (pool) => {
    setDatabasePool(pool);
    
    // Send reminders every 2 hours during work hours (9 AM to 6 PM, Monday to Friday)
    cron.schedule('0 9,11,13,15,17 * * 1-5', async () => {
        console.log('🔔 Running scheduled reminder check...');
        await checkProductRequestReminders();
        await checkReturnRequestReminders();
    });
    
    console.log('📅 Reminder service started - emails will be sent every 2 hours during work hours');
};

module.exports = {
    startReminderService,
    checkProductRequestReminders,
    checkReturnRequestReminders,
    setDatabasePool
};