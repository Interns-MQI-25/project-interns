const EventEmitter = require('events');

class LiveFeedManager extends EventEmitter {
    constructor() {
        super();
        this.clients = new Map();
    }

    addClient(userId, userRole, res) {
        const clientId = `${userId}_${Date.now()}`;
        this.clients.set(clientId, { userId, userRole, res });
        
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        res.write('data: {"type":"connected","message":"Live feed connected","timestamp":"' + new Date().toISOString() + '"}\n\n');
        
        // Send initial test event
        setTimeout(() => {
            res.write('data: {"type":"system","message":"Live feed is working","timestamp":"' + new Date().toISOString() + '"}\n\n');
        }, 1000);

        res.on('close', () => {
            this.clients.delete(clientId);
        });

        return clientId;
    }

    broadcast(event) {
        const message = `data: ${JSON.stringify(event)}\n\n`;
        
        this.clients.forEach(({ userRole, res }) => {
            if (this.shouldReceiveEvent(userRole, event.type)) {
                try {
                    res.write(message);
                } catch (error) {
                    console.error('Error sending SSE message:', error);
                }
            }
        });
    }

    shouldReceiveEvent(userRole, eventType) {
        const permissions = {
            'admin': ['product_added', 'product_updated', 'product_assigned', 'product_returned', 'request_submitted', 'request_approved', 'request_rejected', 'user_registered'],
            'monitor': ['product_added', 'product_updated', 'product_assigned', 'product_returned', 'request_submitted'],
            'employee': ['request_approved', 'request_rejected', 'product_assigned', 'product_returned']
        };
        
        return permissions[userRole]?.includes(eventType) || false;
    }

    notifyProductAdded(product, addedBy) {
        this.broadcast({
            type: 'product_added',
            message: `New product "${product.product_name}" added by ${addedBy}`,
            data: { product, addedBy },
            timestamp: new Date().toISOString()
        });
    }

    notifyProductUpdated(product, updatedBy) {
        this.broadcast({
            type: 'product_updated',
            message: `Product "${product.product_name}" updated by ${updatedBy}`,
            data: { product, updatedBy },
            timestamp: new Date().toISOString()
        });
    }

    notifyProductAssigned(product, assignedTo, assignedBy) {
        this.broadcast({
            type: 'product_assigned',
            message: `Product "${product.product_name}" assigned to ${assignedTo} by ${assignedBy}`,
            data: { product, assignedTo, assignedBy },
            timestamp: new Date().toISOString()
        });
    }

    notifyProductReturned(product, returnedBy) {
        this.broadcast({
            type: 'product_returned',
            message: `Product "${product.product_name}" returned by ${returnedBy}`,
            data: { product, returnedBy },
            timestamp: new Date().toISOString()
        });
    }

    notifyRequestSubmitted(request, submittedBy) {
        this.broadcast({
            type: 'request_submitted',
            message: `New request for "${request.product_name}" submitted by ${submittedBy}`,
            data: { request, submittedBy },
            timestamp: new Date().toISOString()
        });
    }

    notifyRequestApproved(request, approvedBy) {
        this.broadcast({
            type: 'request_approved',
            message: `Request for "${request.product_name}" approved by ${approvedBy}`,
            data: { request, approvedBy },
            timestamp: new Date().toISOString()
        });
    }

    notifyRequestRejected(request, rejectedBy) {
        this.broadcast({
            type: 'request_rejected',
            message: `Request for "${request.product_name}" rejected by ${rejectedBy}`,
            data: { request, rejectedBy },
            timestamp: new Date().toISOString()
        });
    }

    notifyUserRegistered(user) {
        this.broadcast({
            type: 'user_registered',
            message: `New user registration: ${user.username}`,
            data: { user },
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = new LiveFeedManager();