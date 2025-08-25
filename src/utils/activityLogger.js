// Simple activity logger utility
class ActivityLogger {
    static async logLogin(userId, loginInfo) {
        // Log login activity
        console.log(`User ${userId} logged in:`, loginInfo);
        return Promise.resolve();
    }

    static async logActivity(userId, activity, details) {
        // Log general activity
        console.log(`User ${userId} activity:`, activity, details);
        return Promise.resolve();
    }

    static async logRequest(userId, requestData) {
        // Log request activity
        console.log(`User ${userId} made request:`, requestData);
        return Promise.resolve();
    }
}

module.exports = ActivityLogger;
