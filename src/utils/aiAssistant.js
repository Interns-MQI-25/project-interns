/**
 * Advanced AI Assistant for Inventory Management System
 * Provides intelligent contextual help with NLP and dynamic data queries
 */

class AIAssistant {
    constructor() {
        this.conversationHistory = new Map();
        this.contextMemory = new Map();
        this.intentClassifier = new IntentClassifier();
        this.entityExtractor = new EntityExtractor();
        
        this.knowledgeBase = {
            // General navigation and features
            navigation: {
                keywords: ['navigate', 'menu', 'sidebar', 'page', 'go to', 'find', 'where'],
                responses: [
                    "You can navigate using the sidebar menu on the left. Each role has different menu options.",
                    "Use the sidebar to access different features. The menu changes based on your role (Employee, Monitor, or Admin).",
                    "The main navigation is in the left sidebar. Click the hamburger menu on mobile devices to open it."
                ]
            },

            // Employee specific help
            employee: {
                dashboard: {
                    keywords: ['dashboard', 'overview', 'summary', 'home'],
                    responses: [
                        "Your dashboard shows key metrics: active products assigned to you, pending requests, and total requests made.",
                        "The dashboard provides a quick overview of your current product assignments and request status.",
                        "From the dashboard, you can see live activity feed and access all main features."
                    ]
                },
                requests: {
                    keywords: ['request', 'product request', 'ask for', 'need product', 'borrow'],
                    responses: [
                        "To request a product: Go to Stock → Find the product → Click 'Request Product' → Fill the form with purpose and return date.",
                        "Product requests need monitor approval. You can track status in Records page.",
                        "When requesting products, provide a clear purpose and realistic return date for faster approval."
                    ]
                },
                records: {
                    keywords: ['records', 'history', 'my requests', 'assignments', 'track'],
                    responses: [
                        "Records page shows your request history and current product assignments.",
                        "You can cancel pending requests using the Cancel button in the records table.",
                        "Track your product assignments and return status in the Records section."
                    ]
                },
                stock: {
                    keywords: ['stock', 'products', 'available', 'inventory', 'browse'],
                    responses: [
                        "Stock page shows all available products you can request.",
                        "Use filters to find specific products by category, type, or name.",
                        "Click on products to see details and attachments before requesting."
                    ]
                },
                monitors: {
                    keywords: ['monitors', 'who approves', 'contact', 'monitor list'],
                    responses: [
                        "View Monitors page shows all active monitors who can approve your requests.",
                        "Monitors are listed with their contact information and departments.",
                        "You can see which monitors are available to process your requests."
                    ]
                }
            },

            // Monitor specific help
            monitor: {
                approvals: {
                    keywords: ['approve', 'reject', 'pending requests', 'process requests'],
                    responses: [
                        "Approvals page shows all pending product requests that need your review.",
                        "You can approve or reject requests with optional remarks.",
                        "When approving, the product gets automatically assigned to the requester."
                    ]
                },
                stock: {
                    keywords: ['add product', 'new product', 'inventory management'],
                    responses: [
                        "Monitors can add new products to inventory using the 'Add Product' button.",
                        "Fill all required fields and optionally attach files (manuals, certificates).",
                        "You can also request products for yourself through the stock page."
                    ]
                },
                records: {
                    keywords: ['assignment records', 'monitor history', 'processed requests'],
                    responses: [
                        "Records page shows all product assignments and request history you've processed.",
                        "Track return requests and extension requests from employees.",
                        "You can cancel your own pending requests if needed."
                    ]
                }
            },

            // Admin specific help
            admin: {
                employees: {
                    keywords: ['manage employees', 'user management', 'employee list'],
                    responses: [
                        "Employee management allows you to view all users and their details.",
                        "You can see employee status, departments, and roles.",
                        "Manage user accounts and monitor system usage."
                    ]
                },
                registration: {
                    keywords: ['registration requests', 'new users', 'approve users'],
                    responses: [
                        "Process new user registration requests from the Registration Requests page.",
                        "You can approve, reject, or reactivate user accounts.",
                        "Email notifications are sent automatically when processing registrations."
                    ]
                },
                monitors: {
                    keywords: ['manage monitors', 'assign monitor', 'monitor roles'],
                    responses: [
                        "Manage Monitor roles allows you to assign or remove monitor privileges.",
                        "Only active employees can be assigned as monitors.",
                        "Monitor assignments help distribute workload for request approvals."
                    ]
                }
            },

            // Common features
            account: {
                keywords: ['account', 'profile', 'password', 'change password', 'personal info'],
                responses: [
                    "Access your account settings to view personal information and change password.",
                    "You can update your password anytime from the Account page.",
                    "Account page shows your role, department, and contact information."
                ]
            },

            // File attachments
            files: {
                keywords: ['files', 'attachments', 'download', 'upload', 'documents'],
                responses: [
                    "Products can have file attachments like manuals, certificates, or images.",
                    "Monitors and Admins can upload files when adding products.",
                    "Employees can view and download product attachments from the stock page."
                ]
            },

            // Troubleshooting
            troubleshooting: {
                keywords: ['error', 'problem', 'not working', 'issue', 'help', 'trouble'],
                responses: [
                    "If you encounter issues, try refreshing the page or logging out and back in.",
                    "Contact your system administrator if problems persist.",
                    "Check your internet connection and ensure you have the required permissions."
                ]
            },

            // General system info
            system: {
                keywords: ['what is this', 'about system', 'inventory system', 'purpose'],
                responses: [
                    "This is Marquardt India's Inventory Management System for tracking and managing company assets.",
                    "The system handles product requests, assignments, returns, and inventory tracking.",
                    "Different user roles (Employee, Monitor, Admin) have different access levels and capabilities."
                ]
            }
        };
    }

    /**
     * Process user query and return appropriate response (fallback method)
     */
    processQuery(query, userRole = 'employee') {
        const normalizedQuery = query.toLowerCase().trim();
        
        // Check for greetings
        if (this.isGreeting(normalizedQuery)) {
            return this.getGreetingResponse(userRole);
        }

        // Find matching knowledge base entry
        const response = this.findBestMatch(normalizedQuery, userRole);
        
        if (response) {
            return response;
        }

        // Default response with role-specific suggestions
        return this.getDefaultResponse(userRole);
    }

    /**
     * Advanced query processing with NLP and context awareness
     */
    async processAdvancedQuery(query, userRole, userId, pool) {
        const sessionId = `user_${userId}`;
        const normalizedQuery = query.toLowerCase().trim();
        
        // Store conversation history
        this.updateConversationHistory(sessionId, query, 'user');
        
        // Extract intent and entities
        const intent = this.intentClassifier.classify(normalizedQuery);
        const entities = this.entityExtractor.extract(normalizedQuery);
        
        // Handle different intents
        let response;
        switch (intent.type) {
            case 'data_query':
                response = await this.handleDataQuery(entities, userRole, userId, pool);
                break;
            case 'action_request':
                response = await this.handleActionRequest(entities, userRole, userId, pool);
                break;
            case 'status_check':
                response = await this.handleStatusCheck(entities, userRole, userId, pool);
                break;
            case 'help_request':
                response = this.handleHelpRequest(entities, userRole);
                break;
            case 'user_requests':
                response = await this.getUserRequests(userRole, userId, pool);
                break;
            case 'availability_check':
                response = await this.getProductAvailability(entities, userRole, pool);
                break;
            case 'booking_info':
                response = await this.getBookingInfo(entities, userRole, userId, pool);
                break;
            case 'summary':
                let pageContext = this.extractPageContext(query, entities);
                // If no specific page mentioned, use current page context
                if (!pageContext && (query.includes('this page') || query.includes('current page'))) {
                    pageContext = this.currentPageContext;
                }
                response = await this.getSummary(userRole, userId, pool, pageContext);
                break;
            default:
                response = this.processQuery(query, userRole);
        }
        
        // Store AI response
        this.updateConversationHistory(sessionId, response, 'assistant');
        
        return {
            response,
            intent: intent.type,
            entities,
            suggestions: this.generateSuggestions(intent, userRole)
        };
    }

    /**
     * Handle database queries dynamically with real-time data
     */
    async handleDataQuery(entities, userRole, userId, pool) {
        try {
            // Real-time product queries
            if (entities.product) {
                return await this.getProductInfo(entities.product, pool);
            }
            
            // Real-time request status
            if (entities.request_status) {
                return await this.getRequestStatus(userId, pool);
            }
            
            // Real-time assignment info
            if (entities.assignment_info) {
                return await this.getAssignmentInfo(userId, pool);
            }
            
            // Real-time monitor info
            if (entities.monitor_info) {
                return await this.getMonitorInfo(pool);
            }
            
            // Real-time stock info
            if (entities.stock_info) {
                return await this.getStockInfo(entities, pool);
            }
            
            // Real-time system statistics
            return await this.getSystemStats(userRole, pool);
            
        } catch (error) {
            console.error('Data query error:', error);
            return "I'm having trouble accessing that information right now. Please try again or contact support.";
        }
    }

    /**
     * Get user's pending and recent requests
     */
    async getUserRequests(userRole, userId, pool) {
        try {
            let query, params;
            
            if (userRole === 'employee') {
                query = `
                    SELECT pr.*, p.name as product_name, p.stock_quantity,
                           e.first_name, e.last_name
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.id
                    JOIN employees e ON pr.employee_id = e.id
                    WHERE e.user_id = ?
                    ORDER BY pr.request_date DESC
                    LIMIT 10
                `;
                params = [userId];
            } else if (userRole === 'monitor') {
                query = `
                    SELECT pr.*, p.name as product_name, p.stock_quantity,
                           e.first_name, e.last_name
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.id
                    JOIN employees e ON pr.employee_id = e.id
                    WHERE pr.status = 'pending'
                    ORDER BY pr.request_date DESC
                    LIMIT 10
                `;
                params = [];
            } else {
                query = `
                    SELECT pr.*, p.name as product_name, p.stock_quantity,
                           e.first_name, e.last_name
                    FROM product_requests pr
                    JOIN products p ON pr.product_id = p.id
                    JOIN employees e ON pr.employee_id = e.id
                    ORDER BY pr.request_date DESC
                    LIMIT 15
                `;
                params = [];
            }
            
            const [requests] = await pool.execute(query, params);
            
            if (requests.length === 0) {
                return userRole === 'employee' ? 
                    "You have no product requests yet. Visit the Stock page to request products." :
                    "No pending requests found.";
            }
            
            let response = userRole === 'employee' ? 
                `📋 **Your Recent Requests (${requests.length})**\n\n` :
                `📋 **Recent Requests (${requests.length})**\n\n`;
            
            requests.forEach(req => {
                const statusIcon = req.status === 'pending' ? '⏳' : 
                                 req.status === 'approved' ? '✅' : '❌';
                response += `${statusIcon} **${req.product_name}**\n`;
                if (userRole !== 'employee') {
                    response += `   Requested by: ${req.first_name} ${req.last_name}\n`;
                }
                response += `   Status: ${req.status.toUpperCase()}\n`;
                response += `   Purpose: ${req.purpose}\n`;
                if (req.expected_return_date) {
                    response += `   Return Date: ${new Date(req.expected_return_date).toLocaleDateString()}\n`;
                }
                response += `   Requested: ${new Date(req.request_date).toLocaleDateString()}\n\n`;
            });
            
            return response;
            
        } catch (error) {
            console.error('User requests error:', error);
            return "I couldn't retrieve your requests right now. Please check the Records page.";
        }
    }

    /**
     * Get comprehensive product availability and booking status
     */
    async getProductAvailability(entities, userRole, pool) {
        try {
            let query, params;
            
            if (entities.product) {
                query = `
                    SELECT p.*, 
                           COUNT(pa.id) as assigned_count,
                           GROUP_CONCAT(CONCAT(e.first_name, ' ', e.last_name) SEPARATOR ', ') as assigned_to,
                           MIN(pa.expected_return_date) as earliest_return
                    FROM products p
                    LEFT JOIN product_assignments pa ON p.id = pa.product_id AND pa.status = 'active'
                    LEFT JOIN employees e ON pa.employee_id = e.id
                    WHERE p.name LIKE ? OR p.description LIKE ?
                    GROUP BY p.id ORDER BY p.name
                `;
                params = [`%${entities.product}%`, `%${entities.product}%`];
            } else {
                query = `
                    SELECT p.*, 
                           COUNT(pa.id) as assigned_count,
                           GROUP_CONCAT(CONCAT(e.first_name, ' ', e.last_name) SEPARATOR ', ') as assigned_to,
                           MIN(pa.expected_return_date) as earliest_return
                    FROM products p
                    LEFT JOIN product_assignments pa ON p.id = pa.product_id AND pa.status = 'active'
                    LEFT JOIN employees e ON pa.employee_id = e.id
                    GROUP BY p.id ORDER BY p.name LIMIT 10
                `;
                params = [];
            }
            
            const [products] = await pool.execute(query, params);
            
            if (products.length === 0) {
                const fallbackResponse = entities.product ? 
                    `❌ No products found matching "${entities.product}".` :
                    "❌ No products found in inventory.";
                    
                return fallbackResponse + `\n\n📋 **What you can do:**\n• Visit the **Stock** page to browse all products\n• Try different search terms\n• Contact monitors for assistance\n• Check if the product name is spelled correctly`;
            }
            
            let response = `📦 **Product Availability Analysis**\n\n`;
            let availableCount = 0;
            let totalProducts = products.length;
            
            for (const product of products) {
                const available = product.stock_quantity - (product.assigned_count || 0);
                const availabilityIcon = available > 0 ? '✅' : '❌';
                
                if (available > 0) availableCount++;
                
                response += `${availabilityIcon} **${product.name}**\n`;
                response += `   📊 Total Stock: ${product.stock_quantity}\n`;
                response += `   🔄 Currently Assigned: ${product.assigned_count || 0}\n`;
                response += `   ✨ Available Now: ${available}\n`;
                
                if (product.assigned_to && available === 0) {
                    response += `   👥 Currently with: ${product.assigned_to}\n`;
                    if (product.earliest_return) {
                        const returnDate = new Date(product.earliest_return);
                        const today = new Date();
                        const daysUntilReturn = Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24));
                        
                        if (daysUntilReturn > 0) {
                            response += `   ⏰ Expected free in: ${daysUntilReturn} days (${returnDate.toLocaleDateString()})\n`;
                        } else if (daysUntilReturn === 0) {
                            response += `   🎯 Expected free: Today!\n`;
                        } else {
                            response += `   ⚠️ Overdue return (${Math.abs(daysUntilReturn)} days)\n`;
                        }
                    }
                }
                
                response += `   📍 Location: ${product.location || 'Not specified'}\n\n`;
            }
            
            // Add summary
            response += `📈 **Summary:**\n`;
            response += `• ${availableCount}/${totalProducts} products available now\n`;
            response += `• ${totalProducts - availableCount} products currently assigned\n\n`;
            
            // Add actionable steps
            response += `🎯 **Next Steps:**\n`;
            if (availableCount > 0) {
                response += `• Request available products from the **Stock** page\n`;
            }
            if (totalProducts - availableCount > 0) {
                response += `• Contact assigned users for early return if urgent\n`;
                response += `• Monitor return dates for upcoming availability\n`;
            }
            response += `• Check **Records** page for your current assignments\n`;
            response += `• Contact monitors for assistance with requests`;
            
            return response;
            
        } catch (error) {
            console.error('Product availability error:', error);
            return `❌ I couldn't check product availability right now.\n\n📋 **Alternative Steps:**\n• Visit the **Stock** page to browse products\n• Use the search function to find specific items\n• Contact monitors for real-time availability\n• Check **Records** page for your assignments\n• Try refreshing the page and asking again\n\n💡 **Tip:** The Stock page has the most up-to-date information!`;
        }
    }

    /**
     * Get comprehensive booking information with actionable insights
     */
    async getBookingInfo(entities, userRole, userId, pool) {
        try {
            let query, params;
            
            if (entities.product) {
                query = `
                    SELECT pa.*, p.name as product_name, p.location, p.stock_quantity,
                           e.first_name, e.last_name, e.email, e.department
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.id
                    JOIN employees e ON pa.employee_id = e.id
                    WHERE p.name LIKE ? AND pa.status = 'active'
                    ORDER BY pa.expected_return_date ASC
                `;
                params = [`%${entities.product}%`];
            } else {
                query = `
                    SELECT pa.*, p.name as product_name, p.location, p.stock_quantity,
                           e.first_name, e.last_name, e.email, e.department
                    FROM product_assignments pa
                    JOIN products p ON pa.product_id = p.id
                    JOIN employees e ON pa.employee_id = e.id
                    WHERE pa.status = 'active'
                    ORDER BY pa.expected_return_date ASC
                    LIMIT 15
                `;
                params = [];
            }
            
            const [assignments] = await pool.execute(query, params);
            
            if (assignments.length === 0) {
                const noBookingsMsg = entities.product ? 
                    `✅ Great news! "${entities.product}" is not currently assigned to anyone.` :
                    "✅ No active product assignments found.";
                    
                return noBookingsMsg + `\n\n🎯 **What this means:**\n• Product is available for immediate request\n• Visit **Stock** page to request it now\n• No waiting time required\n\n📋 **Next Steps:**\n• Go to **Stock** → Find the product → Click **Request Product**\n• Fill in purpose and expected return date\n• Submit for monitor approval`;
            }
            
            let response = `📅 **Current Bookings & Availability Timeline**\n\n`;
            let overdueCount = 0;
            let dueTodayCount = 0;
            let upcomingReturns = [];
            
            assignments.forEach(assignment => {
                const returnDate = assignment.expected_return_date ? new Date(assignment.expected_return_date) : null;
                const today = new Date();
                const daysLeft = returnDate ? Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24)) : null;
                
                let statusIcon = '📦';
                if (daysLeft !== null) {
                    if (daysLeft < 0) {
                        statusIcon = '🔴';
                        overdueCount++;
                    } else if (daysLeft === 0) {
                        statusIcon = '🟡';
                        dueTodayCount++;
                    } else if (daysLeft <= 3) {
                        statusIcon = '🟠';
                        upcomingReturns.push({...assignment, daysLeft});
                    } else {
                        statusIcon = '🟢';
                    }
                }
                
                response += `${statusIcon} **${assignment.product_name}**\n`;
                response += `   👤 Assigned to: ${assignment.first_name} ${assignment.last_name}`;
                if (assignment.department) {
                    response += ` (${assignment.department})`;
                }
                response += `\n`;
                
                if (userRole === 'admin' || userRole === 'monitor') {
                    response += `   📧 Contact: ${assignment.email}\n`;
                }
                
                response += `   📅 Assigned: ${new Date(assignment.assigned_date).toLocaleDateString()}\n`;
                
                if (returnDate) {
                    response += `   🔄 Return Date: ${returnDate.toLocaleDateString()}`;
                    if (daysLeft !== null) {
                        if (daysLeft > 0) {
                            response += ` (${daysLeft} days remaining)`;
                        } else if (daysLeft < 0) {
                            response += ` (⚠️ ${Math.abs(daysLeft)} days OVERDUE)`;
                        } else {
                            response += ` (⚠️ DUE TODAY)`;
                        }
                    }
                    response += `\n`;
                } else {
                    response += `   🔄 Return Date: Not specified\n`;
                }
                
                response += `   🎯 Purpose: ${assignment.purpose || 'Not specified'}\n`;
                response += `   📍 Location: ${assignment.location || 'Not specified'}\n\n`;
            });
            
            // Add summary and insights
            response += `📊 **Summary & Insights:**\n`;
            response += `• Total active assignments: ${assignments.length}\n`;
            if (overdueCount > 0) {
                response += `• 🔴 Overdue returns: ${overdueCount}\n`;
            }
            if (dueTodayCount > 0) {
                response += `• 🟡 Due today: ${dueTodayCount}\n`;
            }
            if (upcomingReturns.length > 0) {
                response += `• 🟠 Due within 3 days: ${upcomingReturns.length}\n`;
            }
            
            // Add actionable recommendations
            response += `\n🎯 **Recommendations:**\n`;
            if (entities.product && assignments.length > 0) {
                const earliestReturn = assignments[0];
                if (earliestReturn.expected_return_date) {
                    const returnDate = new Date(earliestReturn.expected_return_date);
                    const daysLeft = Math.ceil((returnDate - new Date()) / (1000 * 60 * 60 * 24));
                    
                    if (daysLeft <= 0) {
                        response += `• Contact ${earliestReturn.first_name} ${earliestReturn.last_name} - return is overdue\n`;
                    } else {
                        response += `• Product will be available in ${daysLeft} days\n`;
                    }
                }
                response += `• Request the product now - you'll be queued for when it's returned\n`;
            }
            
            if (userRole === 'monitor' || userRole === 'admin') {
                response += `• Follow up on overdue returns\n`;
                response += `• Send return reminders for items due soon\n`;
            }
            
            response += `• Visit **Records** page for detailed assignment history\n`;
            response += `• Contact monitors for assistance with urgent requests`;
            
            return response;
            
        } catch (error) {
            console.error('Booking info error:', error);
            return `❌ I couldn't retrieve booking information right now.\n\n📋 **Alternative Steps:**\n• Check the **Records** page for assignment details\n• Visit **Stock** page to see basic availability\n• Contact monitors for current booking status\n• Try asking about specific products by name\n\n💡 **Tip:** Monitors have access to real-time assignment information!`;
        }
    }

    /**
     * Get real-time product information with availability details
     */
    async getProductInfo(productName, pool) {
        try {
            const [products] = await pool.execute(
                'SELECT * FROM products WHERE name LIKE ? OR description LIKE ? LIMIT 5',
                [`%${productName}%`, `%${productName}%`]
            );
            
            if (products.length === 0) {
                return `I couldn't find any products matching "${productName}". Try searching with different keywords or visit the Stock page to browse all available products.`;
            }
            
            let response = `📦 **Found ${products.length} product(s) matching "${productName}":**\n\n`;
            
            for (const product of products) {
                // Get current assignments
                const [assignments] = await pool.execute(
                    'SELECT pa.*, e.first_name, e.last_name, e.email FROM product_assignments pa JOIN employees e ON pa.employee_id = e.id WHERE pa.product_id = ? AND pa.status = "active"',
                    [product.id]
                );
                
                const available = product.stock_quantity - assignments.length;
                const availabilityIcon = available > 0 ? '✅' : '❌';
                
                response += `${availabilityIcon} **${product.name}**\n`;
                response += `   📊 Total Stock: ${product.stock_quantity}\n`;
                response += `   🔄 Currently Assigned: ${assignments.length}\n`;
                response += `   ✨ Available Now: ${available}\n`;
                
                if (assignments.length > 0) {
                    response += `   👥 Currently with:\n`;
                    assignments.forEach(assignment => {
                        const returnDate = assignment.expected_return_date ? 
                            new Date(assignment.expected_return_date).toLocaleDateString() : 'No return date';
                        response += `      • ${assignment.first_name} ${assignment.last_name} (Return: ${returnDate})\n`;
                    });
                }
                
                response += `   📍 Location: ${product.location || 'Not specified'}\n\n`;
            }
            
            response += `💡 **Next Steps:**\n`;
            response += `• Visit Stock page to request available products\n`;
            response += `• Contact assigned users for early return if needed\n`;
            response += `• Check Records page for your request history`;
            
            return response;
        } catch (error) {
            console.error('Product info error:', error);
            return `I couldn't retrieve detailed product information right now. Here's what you can do:\n\n📋 **Alternative Steps:**\n• Visit the **Stock** page to browse all products\n• Use the search function to find specific items\n• Contact monitors for assistance with product availability\n• Check the **Records** page for your current assignments`;
        }
    }

    /**
     * Get user's request status
     */
    async getRequestStatus(userId, pool) {
        const [requests] = await pool.execute(`
            SELECT pr.*, p.product_name, pr.status, pr.requested_at
            FROM product_requests pr
            JOIN products p ON pr.product_id = p.product_id
            JOIN employees e ON pr.employee_id = e.employee_id
            WHERE e.user_id = ?
            ORDER BY pr.requested_at DESC
            LIMIT 5
        `, [userId]);
        
        if (requests.length === 0) {
            return "You haven't made any product requests yet. Visit the Stock page to request products.";
        }
        
        let response = "Here are your recent requests:\n\n";
        requests.forEach((req, index) => {
            const status = req.status.charAt(0).toUpperCase() + req.status.slice(1);
            const date = new Date(req.requested_at).toLocaleDateString();
            response += `${index + 1}. **${req.product_name}** - ${status} (${date})\n`;
        });
        
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        if (pendingCount > 0) {
            response += `\n💡 You have ${pendingCount} pending request(s) awaiting approval.`;
        }
        
        return response;
    }

    /**
     * Get assignment information
     */
    async getAssignmentInfo(userId, pool) {
        const [assignments] = await pool.execute(`
            SELECT pa.*, p.product_name, pa.assigned_at, pa.return_date, pa.is_returned
            FROM product_assignments pa
            JOIN products p ON pa.product_id = p.product_id
            JOIN employees e ON pa.employee_id = e.employee_id
            WHERE e.user_id = ? AND pa.is_returned = 0
            ORDER BY pa.assigned_at DESC
        `, [userId]);
        
        if (assignments.length === 0) {
            return "You don't have any active product assignments. Request products from the Stock page.";
        }
        
        let response = `You have ${assignments.length} active assignment(s):\n\n`;
        assignments.forEach((assignment, index) => {
            const assignedDate = new Date(assignment.assigned_at).toLocaleDateString();
            const returnDate = assignment.return_date ? new Date(assignment.return_date).toLocaleDateString() : 'Not set';
            response += `${index + 1}. **${assignment.product_name}**\n`;
            response += `   - Assigned: ${assignedDate}\n`;
            response += `   - Return by: ${returnDate}\n\n`;
        });
        
        return response + "Need help with returning products? Just ask!";
    }

    /**
     * Get monitor information
     */
    async getMonitorInfo(pool) {
        const [monitors] = await pool.execute(`
            SELECT u.full_name, u.email, d.department_name
            FROM users u
            JOIN employees e ON u.user_id = e.user_id
            JOIN departments d ON e.department_id = d.department_id
            WHERE u.role = 'monitor' AND u.is_active = 1
            ORDER BY u.full_name
        `);
        
        if (monitors.length === 0) {
            return "No active monitors found in the system.";
        }
        
        let response = `Here are the active monitors who can help you:\n\n`;
        monitors.forEach((monitor, index) => {
            response += `${index + 1}. **${monitor.full_name}**\n`;
            response += `   - Email: ${monitor.email}\n`;
            response += `   - Department: ${monitor.department_name}\n\n`;
        });
        
        return response + "You can contact any of these monitors for assistance with your requests.";
    }

    /**
     * Get stock information
     */
    async getStockInfo(entities, pool) {
        let query = 'SELECT COUNT(*) as total, SUM(quantity) as available FROM products WHERE quantity > 0';
        let params = [];
        
        if (entities.category) {
            query += ' AND product_category LIKE ?';
            params.push(`%${entities.category}%`);
        }
        
        const [stockData] = await pool.execute(query, params);
        const [categories] = await pool.execute(
            'SELECT product_category, COUNT(*) as count FROM products WHERE quantity > 0 GROUP BY product_category ORDER BY count DESC LIMIT 5'
        );
        
        let response = `📊 **Stock Overview:**\n`;
        response += `• Total available products: ${stockData[0].available}\n`;
        response += `• Product types: ${stockData[0].total}\n\n`;
        
        if (categories.length > 0) {
            response += `**Top Categories:**\n`;
            categories.forEach((cat, index) => {
                response += `${index + 1}. ${cat.product_category}: ${cat.count} items\n`;
            });
        }
        
        return response + "\n💡 Visit the Stock page to browse and request products!";
    }

    /**
     * Handle action requests
     */
    async handleActionRequest(entities, userRole, userId, pool) {
        if (entities.action === 'request_product') {
            return "To request a product:\n1. Go to **Stock** page\n2. Find the product you need\n3. Click **Request Product**\n4. Fill in purpose and return date\n5. Submit for approval\n\n💡 Tip: Provide clear purpose for faster approval!";
        }
        
        if (entities.action === 'cancel_request') {
            return "To cancel a pending request:\n1. Go to **Records** page\n2. Find your pending request\n3. Click the **Cancel** button\n\n⚠️ Note: You can only cancel pending requests, not approved ones.";
        }
        
        if (entities.action === 'return_product') {
            return "To return a product:\n1. Go to **My Products** page\n2. Find the assigned product\n3. Click **Request Return**\n4. Wait for monitor approval\n\n📋 The monitor will process your return request.";
        }
        
        return "I can help you with requesting products, canceling requests, or returning products. What would you like to do?";
    }

    /**
     * Handle status checks
     */
    async handleStatusCheck(entities, userRole, userId, pool) {
        if (entities.status_type === 'requests') {
            return await this.getRequestStatus(userId, pool);
        }
        
        if (entities.status_type === 'assignments') {
            return await this.getAssignmentInfo(userId, pool);
        }
        
        // General status check
        const [requestCount] = await pool.execute(
            'SELECT COUNT(*) as pending FROM product_requests pr JOIN employees e ON pr.employee_id = e.employee_id WHERE e.user_id = ? AND pr.status = "pending"',
            [userId]
        );
        
        const [assignmentCount] = await pool.execute(
            'SELECT COUNT(*) as active FROM product_assignments pa JOIN employees e ON pa.employee_id = e.employee_id WHERE e.user_id = ? AND pa.is_returned = 0',
            [userId]
        );
        
        return `📊 **Your Status:**\n• Pending requests: ${requestCount[0].pending}\n• Active assignments: ${assignmentCount[0].active}\n\nNeed more details? Ask about "my requests" or "my assignments".`;
    }

    /**
     * Generate contextual suggestions
     */
    generateSuggestions(intent, userRole) {
        const suggestions = {
            employee: [
                "Show my summary",
                "What products are available?",
                "Who has the laptop?",
                "Show my pending requests",
                "System overview",
                "Who are the monitors?"
            ],
            monitor: [
                "Show summary dashboard",
                "What products need attention?",
                "Who has overdue returns?",
                "Show pending approvals",
                "System overview"
            ],
            admin: [
                "Show admin summary",
                "System overview",
                "Who has the most assignments?",
                "Show registration requests",
                "Complete system report"
            ]
        };
        
        return suggestions[userRole] || suggestions.employee;
    }

    /**
     * Get real-time system statistics
     */
    async getSystemStats(userRole, pool) {
        try {
            const [totalProducts] = await pool.execute('SELECT COUNT(*) as count FROM products');
            const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
            const [pendingRequests] = await pool.execute('SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"');
            const [activeAssignments] = await pool.execute('SELECT COUNT(*) as count FROM product_assignments WHERE status = "active"');
            const [availableStock] = await pool.execute('SELECT SUM(stock_quantity) as total FROM products');
            
            let response = `📊 **Real-Time System Statistics**\n\n`;
            response += `🏢 **Inventory Overview:**\n`;
            response += `• Total Products: ${totalProducts[0].count}\n`;
            response += `• Available Stock: ${availableStock[0].total || 0} units\n`;
            response += `• Active Assignments: ${activeAssignments[0].count}\n\n`;
            
            response += `👥 **User Activity:**\n`;
            response += `• Active Users: ${totalUsers[0].count}\n`;
            response += `• Pending Requests: ${pendingRequests[0].count}\n\n`;
            
            if (userRole === 'admin' || userRole === 'monitor') {
                const [recentActivity] = await pool.execute(`
                    SELECT 'Request' as type, pr.request_date as date, CONCAT(e.first_name, ' ', e.last_name) as user, p.name as item
                    FROM product_requests pr 
                    JOIN employees e ON pr.employee_id = e.id 
                    JOIN products p ON pr.product_id = p.id 
                    WHERE pr.request_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    ORDER BY pr.request_date DESC LIMIT 5
                `);
                
                if (recentActivity.length > 0) {
                    response += `⚡ **Recent Activity (24h):**\n`;
                    recentActivity.forEach(activity => {
                        response += `• ${activity.user} requested ${activity.item}\n`;
                    });
                }
            }
            
            response += `\n🕐 **Last Updated:** ${new Date().toLocaleTimeString()}`;
            return response;
            
        } catch (error) {
            console.error('System stats error:', error);
            return "I couldn't retrieve system statistics right now. Please check the dashboard for current information.";
        }
    }

    /**
     * Get comprehensive summary based on user role and context
     */
    async getSummary(userRole, userId, pool, pageContext = null) {
        try {
            let response = pageContext ? 
                `📋 **${pageContext} Page Summary**\n\n` : 
                `📋 **Comprehensive Summary**\n\n`;
            
            // Page-specific summaries
            if (pageContext) {
                return await this.getPageSummary(pageContext, userRole, userId, pool);
            }
            
            if (userRole === 'employee') {
                // Personal summary for employees
                const [myRequests] = await pool.execute(`
                    SELECT COUNT(*) as total, 
                           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                           SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
                    FROM product_requests pr 
                    JOIN employees e ON pr.employee_id = e.id 
                    WHERE e.user_id = ?
                `, [userId]);
                
                const [myAssignments] = await pool.execute(`
                    SELECT COUNT(*) as active,
                           GROUP_CONCAT(p.name SEPARATOR ', ') as products
                    FROM product_assignments pa 
                    JOIN employees e ON pa.employee_id = e.id 
                    JOIN products p ON pa.product_id = p.id
                    WHERE e.user_id = ? AND pa.status = 'active'
                `, [userId]);
                
                response += `👤 **Your Activity:**\n`;
                response += `• Total Requests: ${myRequests[0].total}\n`;
                response += `• Pending: ${myRequests[0].pending} | Approved: ${myRequests[0].approved}\n`;
                response += `• Active Assignments: ${myAssignments[0].active}\n`;
                if (myAssignments[0].products) {
                    response += `• Current Products: ${myAssignments[0].products}\n`;
                }
                
            } else if (userRole === 'monitor') {
                // Monitor summary
                const [pendingApprovals] = await pool.execute('SELECT COUNT(*) as count FROM product_requests WHERE status = "pending"');
                const [overdueReturns] = await pool.execute(`
                    SELECT COUNT(*) as count FROM product_assignments 
                    WHERE status = 'active' AND expected_return_date < CURDATE()
                `);
                
                response += `🔍 **Monitor Dashboard:**\n`;
                response += `• Pending Approvals: ${pendingApprovals[0].count}\n`;
                response += `• Overdue Returns: ${overdueReturns[0].count}\n`;
                
            } else if (userRole === 'admin') {
                // Admin summary
                const [registrations] = await pool.execute('SELECT COUNT(*) as count FROM registration_requests WHERE status = "pending"');
                const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
                
                response += `👑 **Admin Overview:**\n`;
                response += `• Pending Registrations: ${registrations[0].count}\n`;
                response += `• Active Users: ${totalUsers[0].count}\n`;
            }
            
            // System-wide summary for all roles
            const [systemStats] = await pool.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM products) as total_products,
                    (SELECT SUM(stock_quantity) FROM products) as total_stock,
                    (SELECT COUNT(*) FROM product_assignments WHERE status = 'active') as active_assignments,
                    (SELECT COUNT(*) FROM product_requests WHERE status = 'pending') as pending_requests
            `);
            
            response += `\n🏢 **System Overview:**\n`;
            response += `• Total Products: ${systemStats[0].total_products}\n`;
            response += `• Available Stock: ${systemStats[0].total_stock} units\n`;
            response += `• Active Assignments: ${systemStats[0].active_assignments}\n`;
            response += `• Pending Requests: ${systemStats[0].pending_requests}\n`;
            
            // Recent activity
            const [recentActivity] = await pool.execute(`
                SELECT 'Request' as type, pr.request_date as date, 
                       CONCAT(e.first_name, ' ', e.last_name) as user, p.name as item
                FROM product_requests pr 
                JOIN employees e ON pr.employee_id = e.id 
                JOIN products p ON pr.product_id = p.id 
                WHERE pr.request_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY pr.request_date DESC LIMIT 3
            `);
            
            if (recentActivity.length > 0) {
                response += `\n⚡ **Recent Activity:**\n`;
                recentActivity.forEach(activity => {
                    response += `• ${activity.user} requested ${activity.item}\n`;
                });
            }
            
            response += `\n🕐 **Generated:** ${new Date().toLocaleString()}`;
            return response;
            
        } catch (error) {
            console.error('Summary error:', error);
            return "I couldn't generate a summary right now. Please check individual pages for detailed information.";
        }
    }

    /**
     * Get page-specific summary
     */
    async getPageSummary(page, userRole, userId, pool) {
        try {
            let response = `📋 **${page} Summary**\n\n`;
            
            switch (page.toLowerCase()) {
                case 'dashboard':
                    return await this.getDashboardSummary(userRole, userId, pool);
                case 'stock':
                    return await this.getStockSummary(userRole, pool);
                case 'records':
                    return await this.getRecordsSummary(userRole, userId, pool);
                case 'requests':
                    return await this.getRequestsSummary(userRole, userId, pool);
                case 'approvals':
                    return await this.getApprovalsSummary(userRole, pool);
                case 'employees':
                    return await this.getEmployeesSummary(userRole, pool);
                default:
                    return `📋 **Current Page Summary**\n\nI can provide summaries for:\n• Dashboard\n• Stock\n• Records\n• Requests\n• Approvals\n• Employees\n\nAsk: "Summarize [page name]"`;
            }
        } catch (error) {
            console.error('Page summary error:', error);
            return "I couldn't generate a page summary right now. Please refresh and try again.";
        }
    }

    async getDashboardSummary(userRole, userId, pool) {
        const [stats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM products) as total_products,
                (SELECT COUNT(*) FROM product_requests WHERE status = 'pending') as pending_requests,
                (SELECT COUNT(*) FROM product_assignments WHERE status = 'active') as active_assignments
        `);
        
        return `🏠 **Dashboard Overview**\n\n• Total Products: ${stats[0].total_products}\n• Pending Requests: ${stats[0].pending_requests}\n• Active Assignments: ${stats[0].active_assignments}\n\n💡 **Quick Actions:** Use navigation menu to access specific features`;
    }

    async getStockSummary(userRole, pool) {
        const [stock] = await pool.execute(`
            SELECT COUNT(*) as total_items, SUM(stock_quantity) as total_stock,
                   COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as available_items
            FROM products
        `);
        
        const [categories] = await pool.execute(`
            SELECT category, COUNT(*) as count FROM products 
            WHERE stock_quantity > 0 GROUP BY category ORDER BY count DESC LIMIT 3
        `);
        
        let response = `📦 **Stock Page Summary**\n\n• Total Items: ${stock[0].total_items}\n• Available Stock: ${stock[0].total_stock} units\n• Items in Stock: ${stock[0].available_items}\n\n`;
        
        if (categories.length > 0) {
            response += `🏆 **Top Categories:**\n`;
            categories.forEach(cat => response += `• ${cat.category}: ${cat.count} items\n`);
        }
        
        return response + `\n💡 **Tip:** Click on products to see details and request them`;
    }

    async getRecordsSummary(userRole, userId, pool) {
        if (userRole === 'employee') {
            const [records] = await pool.execute(`
                SELECT COUNT(*) as total_requests,
                       COUNT(CASE WHEN pr.status = 'approved' THEN 1 END) as approved,
                       (SELECT COUNT(*) FROM product_assignments pa 
                        JOIN employees e ON pa.employee_id = e.id 
                        WHERE e.user_id = ? AND pa.status = 'active') as active_assignments
                FROM product_requests pr 
                JOIN employees e ON pr.employee_id = e.id 
                WHERE e.user_id = ?
            `, [userId, userId]);
            
            return `📋 **Your Records Summary**\n\n• Total Requests: ${records[0].total_requests}\n• Approved Requests: ${records[0].approved}\n• Active Assignments: ${records[0].active_assignments}\n\n💡 **Actions:** Cancel pending requests or request returns`;
        } else {
            const [records] = await pool.execute(`
                SELECT COUNT(*) as total_assignments,
                       COUNT(CASE WHEN expected_return_date < CURDATE() THEN 1 END) as overdue
                FROM product_assignments WHERE status = 'active'
            `);
            
            return `📋 **Records Summary**\n\n• Total Active Assignments: ${records[0].total_assignments}\n• Overdue Returns: ${records[0].overdue}\n\n💡 **Actions:** Track assignments and follow up on overdue items`;
        }
    }

    async getRequestsSummary(userRole, userId, pool) {
        const [requests] = await pool.execute(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                   COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                   COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
            FROM product_requests pr
            JOIN employees e ON pr.employee_id = e.id
            WHERE e.user_id = ?
        `, [userId]);
        
        return `📋 **Requests Summary**\n\n• Total Requests: ${requests[0].total}\n• Pending: ${requests[0].pending}\n• Approved: ${requests[0].approved}\n• Rejected: ${requests[0].rejected}\n\n💡 **Tip:** Cancel pending requests if no longer needed`;
    }

    async getApprovalsSummary(userRole, pool) {
        const [approvals] = await pool.execute(`
            SELECT COUNT(*) as pending_count,
                   COUNT(CASE WHEN request_date < DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as old_requests
            FROM product_requests WHERE status = 'pending'
        `);
        
        return `⏳ **Approvals Summary**\n\n• Pending Approvals: ${approvals[0].pending_count}\n• Requests >24h old: ${approvals[0].old_requests}\n\n💡 **Action:** Review and process pending requests promptly`;
    }

    async getEmployeesSummary(userRole, pool) {
        const [employees] = await pool.execute(`
            SELECT COUNT(*) as total_users,
                   COUNT(CASE WHEN role = 'monitor' THEN 1 END) as monitors,
                   COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users
            FROM users
        `);
        
        return `👥 **Employees Summary**\n\n• Total Users: ${employees[0].total_users}\n• Active Users: ${employees[0].active_users}\n• Monitors: ${employees[0].monitors}\n\n💡 **Actions:** Manage user roles and monitor assignments`;
    }

    /**
     * Get fallback page summary when database is unavailable
     */
    getFallbackPageSummary(pageContext, userRole) {
        const pageSummaries = {
            dashboard: `🏠 **Dashboard Summary**\n\nThis is your main dashboard showing:\n• Key system metrics and statistics\n• Recent activity and notifications\n• Quick access to main features\n\n💡 **Navigation:** Use the sidebar to access different sections`,
            
            stock: `📦 **Stock Page Summary**\n\nThis page shows:\n• All available products in inventory\n• Product details and specifications\n• Request buttons for available items\n• File attachments and documentation\n\n💡 **Actions:** Browse products and submit requests`,
            
            records: `📋 **Records Summary**\n\nThis page displays:\n• Your request history and status\n• Current product assignments\n• Return dates and deadlines\n• Assignment tracking\n\n💡 **Actions:** Track your requests and manage returns`,
            
            requests: `📋 **Requests Summary**\n\nThis page shows:\n• All your product requests\n• Request status (pending/approved/rejected)\n• Request dates and purposes\n• Cancel options for pending requests\n\n💡 **Actions:** Monitor request status and cancel if needed`,
            
            approvals: `⏳ **Approvals Summary**\n\nThis page contains:\n• Pending product requests for review\n• Employee request details\n• Approve/reject options\n• Request history and tracking\n\n💡 **Actions:** Review and process pending requests`,
            
            employees: `👥 **Employees Summary**\n\nThis page shows:\n• All system users and their details\n• User roles and permissions\n• Active/inactive status\n• Department assignments\n\n💡 **Actions:** Manage user accounts and roles`
        };
        
        const summary = pageSummaries[pageContext] || `📋 **Page Summary**\n\nI can provide summaries for:\n• Dashboard - System overview\n• Stock - Product inventory\n• Records - Assignment tracking\n• Requests - Request management\n• Approvals - Pending reviews\n• Employees - User management`;
        
        return summary + `\n\n🔧 **Note:** Database temporarily unavailable - showing static summary. Refresh page and try again for live data.`;
    }

    /**
     * Update conversation history
     */
    updateConversationHistory(sessionId, message, sender) {
        if (!this.conversationHistory.has(sessionId)) {
            this.conversationHistory.set(sessionId, []);
        }
        
        const history = this.conversationHistory.get(sessionId);
        history.push({
            message,
            sender,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 10 messages
        if (history.length > 10) {
            history.shift();
        }
    }

    /**
     * Check if query is a greeting
     */
    isGreeting(query) {
        const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
        return greetings.some(greeting => query.includes(greeting));
    }

    /**
     * Get greeting response based on user role
     */
    getGreetingResponse(userRole) {
        const roleSpecific = {
            employee: "Hello! I'm your AI assistant. I can help you with requesting products, checking your records, browsing stock, and navigating the system. What would you like to know?",
            monitor: "Hi there! I can assist you with processing approvals, managing inventory, adding products, and understanding your monitor responsibilities. How can I help?",
            admin: "Hello! I'm here to help with user management, registration approvals, system administration, and any other admin tasks. What do you need assistance with?"
        };
        
        return roleSpecific[userRole] || roleSpecific.employee;
    }

    /**
     * Find best matching response from knowledge base
     */
    findBestMatch(query, userRole) {
        let bestMatch = null;
        let highestScore = 0;

        // Check role-specific knowledge first
        if (this.knowledgeBase[userRole]) {
            const roleMatch = this.searchInSection(query, this.knowledgeBase[userRole]);
            if (roleMatch && roleMatch.score > highestScore) {
                bestMatch = roleMatch;
                highestScore = roleMatch.score;
            }
        }

        // Check common sections
        const commonSections = ['navigation', 'account', 'files', 'troubleshooting', 'system'];
        for (const section of commonSections) {
            if (this.knowledgeBase[section]) {
                const match = this.searchInSection(query, { [section]: this.knowledgeBase[section] });
                if (match && match.score > highestScore) {
                    bestMatch = match;
                    highestScore = match.score;
                }
            }
        }

        return bestMatch ? bestMatch.response : null;
    }

    /**
     * Search within a knowledge base section
     */
    searchInSection(query, section) {
        let bestMatch = null;
        let highestScore = 0;

        for (const [key, data] of Object.entries(section)) {
            if (data.keywords && data.responses) {
                const score = this.calculateMatchScore(query, data.keywords);
                if (score > highestScore && score > 0.3) { // Minimum threshold
                    highestScore = score;
                    bestMatch = {
                        score: score,
                        response: data.responses[Math.floor(Math.random() * data.responses.length)]
                    };
                }
            }
        }

        return bestMatch;
    }

    /**
     * Calculate match score between query and keywords
     */
    calculateMatchScore(query, keywords) {
        let score = 0;
        const queryWords = query.split(' ');
        
        for (const keyword of keywords) {
            const keywordWords = keyword.split(' ');
            
            // Exact phrase match gets highest score
            if (query.includes(keyword)) {
                score += 1.0;
                continue;
            }
            
            // Partial word matches
            for (const keywordWord of keywordWords) {
                for (const queryWord of queryWords) {
                    if (queryWord.includes(keywordWord) || keywordWord.includes(queryWord)) {
                        score += 0.5;
                    }
                }
            }
        }
        
        return Math.min(score / keywords.length, 1.0);
    }

    /**
     * Get default response with role-specific suggestions
     */
    getDefaultResponse(userRole) {
        const suggestions = {
            employee: [
                "• How to request a product",
                "• Check my request status", 
                "• View available stock",
                "• See my product assignments",
                "• Contact monitors"
            ],
            monitor: [
                "• Process pending approvals",
                "• Add new products",
                "• Manage inventory",
                "• View assignment records",
                "• Handle return requests"
            ],
            admin: [
                "• Manage user accounts",
                "• Process registrations", 
                "• Assign monitor roles",
                "• View system history",
                "• Manage inventory"
            ]
        };

        const roleSuggestions = suggestions[userRole] || suggestions.employee;
        
        return `I'm not sure about that specific question, but I can help you with:\n\n${roleSuggestions.join('\n')}\n\nTry asking about any of these topics, or be more specific about what you need help with.`;
    }
}

/**
 * Intent Classifier for understanding user intentions
 */
class IntentClassifier {
    constructor() {
        this.intents = {
            data_query: {
                patterns: ['show', 'display', 'list', 'what', 'which', 'find', 'search', 'get', 'tell me about', 'current', 'real time', 'live'],
                entities: ['product', 'request', 'assignment', 'monitor', 'stock', 'statistics', 'activity']
            },
            action_request: {
                patterns: ['how to', 'how do i', 'how can i', 'help me', 'guide me', 'steps to'],
                entities: ['request', 'cancel', 'return', 'add', 'approve']
            },
            status_check: {
                patterns: ['status', 'check', 'my', 'current', 'pending', 'active'],
                entities: ['request', 'assignment', 'approval']
            },
            user_requests: {
                patterns: ['my requests', 'pending requests', 'show requests', 'request history', 'list requests'],
                entities: ['pending', 'approved', 'rejected']
            },
            availability_check: {
                patterns: ['available', 'free', 'in stock', 'can i get', 'is available'],
                entities: ['product', 'item', 'equipment']
            },
            booking_info: {
                patterns: ['who has', 'taken by', 'assigned to', 'booked by', 'till when', 'return date', 'when will', 'when return'],
                entities: ['product', 'assignment', 'booking']
            },
            summary: {
                patterns: ['summary', 'summarize', 'overview', 'report', 'dashboard', 'everything', 'this page', 'current page'],
                entities: ['system', 'my', 'personal', 'overall', 'page', 'current']
            },
            help_request: {
                patterns: ['help', 'assist', 'support', 'explain', 'what is', 'about']
            }
        };
    }
    
    classify(query) {
        const scores = {};
        
        for (const [intentType, config] of Object.entries(this.intents)) {
            let score = 0;
            
            // Check pattern matches
            for (const pattern of config.patterns) {
                if (query.includes(pattern)) {
                    score += 1;
                }
            }
            
            // Check entity matches
            if (config.entities) {
                for (const entity of config.entities) {
                    if (query.includes(entity)) {
                        score += 0.5;
                    }
                }
            }
            
            scores[intentType] = score;
        }
        
        // Find highest scoring intent
        const bestIntent = Object.entries(scores).reduce((a, b) => 
            scores[a[0]] > scores[b[0]] ? a : b
        );
        
        return {
            type: bestIntent[1] > 0 ? bestIntent[0] : 'help_request',
            confidence: bestIntent[1]
        };
    }
}

/**
 * Entity Extractor for identifying specific entities in queries
 */
class EntityExtractor {
    constructor() {
        this.entities = {
            product: ['product', 'item', 'equipment', 'device', 'tool', 'laptop', 'oscilloscope', 'multimeter'],
            request_status: ['request', 'requests', 'pending', 'approved', 'rejected'],
            assignment_info: ['assignment', 'assignments', 'assigned', 'my products'],
            monitor_info: ['monitor', 'monitors', 'approver', 'supervisor'],
            stock_info: ['stock', 'inventory', 'available', 'catalog'],
            booking: ['booking', 'booked', 'reserved', 'taken', 'assigned'],
            availability: ['available', 'free', 'open', 'vacant'],
            statistics: ['stats', 'statistics', 'numbers', 'count', 'total', 'system'],
            activity: ['activity', 'recent', 'latest', 'current', 'live', 'real time'],
            summary: ['summary', 'summarize', 'overview', 'report', 'dashboard', 'page', 'current'],
            page: ['page', 'current page', 'this page', 'here'],
            action: this.extractActions.bind(this),
            status_type: this.extractStatusType.bind(this),
            category: this.extractCategory.bind(this)
        };
    }
    
    extract(query) {
        const entities = {};
        
        for (const [entityType, patterns] of Object.entries(this.entities)) {
            if (typeof patterns === 'function') {
                const result = patterns(query);
                if (result) entities[entityType] = result;
            } else {
                for (const pattern of patterns) {
                    if (query.includes(pattern)) {
                        entities[entityType] = pattern;
                        break;
                    }
                }
            }
        }
        
        // Extract product names (enhanced approach)
        const productPatterns = [
            /(?:who has|taken by|assigned to|booked by)\s+(?:the\s+)?([\w\s-]+?)(?:\s+and|\?|$)/i,
            /(?:when will|when is)\s+(?:the\s+)?([\w\s-]+?)(?:\s+be|\s+available|\?|$)/i,
            /(?:product|item)\s+([\w\s-]+?)(?:\s|$|\?)/i,
            /(?:the\s+)?([\w\s-]+?)(?:\s+available|\s+free|\s+return|\?|$)/i
        ];
        
        for (const pattern of productPatterns) {
            const match = query.match(pattern);
            if (match && match[1]) {
                entities.product = match[1].trim();
                break;
            }
        }
        
        return entities;
    }
    
    extractActions(query) {
        const actions = {
            'request': ['request', 'ask for', 'need', 'want'],
            'cancel': ['cancel', 'remove', 'delete'],
            'return': ['return', 'give back', 'send back'],
            'approve': ['approve', 'accept', 'confirm'],
            'reject': ['reject', 'deny', 'decline']
        };
        
        for (const [action, patterns] of Object.entries(actions)) {
            for (const pattern of patterns) {
                if (query.includes(pattern)) {
                    return action;
                }
            }
        }
        return null;
    }
    
    extractStatusType(query) {
        if (query.includes('request')) return 'requests';
        if (query.includes('assignment') || query.includes('assigned')) return 'assignments';
        if (query.includes('approval')) return 'approvals';
        return null;
    }
    
    extractCategory(query) {
        const categories = ['power supply', 'multimeter', 'oscilloscope', 'software', 'hardware', 'laptop'];
        for (const category of categories) {
            if (query.includes(category)) {
                return category;
            }
        }
        return null;
    }
    
    extractPageContext(query) {
        const pages = ['dashboard', 'stock', 'records', 'requests', 'approvals', 'employees', 'monitors'];
        for (const page of pages) {
            if (query.includes(page)) {
                return page;
            }
        }
        if (query.includes('this page') || query.includes('current page') || query.includes('summarize')) {
            return this.currentPageContext || 'current';
        }
        return null;
    }
}

module.exports = AIAssistant;