/**
 * AI Assistant Routes
 * Handles chatbot functionality for user assistance
 */

const express = require('express');
const router = express.Router();
const AIAssistant = require('../utils/aiAssistant');

module.exports = (pool, requireAuth, requireRole) => {
    const aiAssistant = new AIAssistant();

    // AI Chat endpoint with advanced processing
    router.post('/chat', requireAuth, async (req, res) => {
        try {
            const { message, pageContext } = req.body;
            const userRole = req.session.user.role;
            const userId = req.session.user.user_id;

            if (!message || message.trim().length === 0) {
                return res.json({
                    success: false,
                    error: 'Message is required'
                });
            }

            // Try advanced processing first
            let result;
            try {
                // Set page context for better summaries
                if (pageContext) {
                    aiAssistant.currentPageContext = pageContext;
                }
                result = await aiAssistant.processAdvancedQuery(message, userRole, userId, pool);
            } catch (advancedError) {
                console.log('Advanced processing failed, using fallback:', advancedError.message);
                
                // Check if it's a summary request and provide fallback
                if (message.toLowerCase().includes('summary') || message.toLowerCase().includes('summarize')) {
                    const fallbackSummary = aiAssistant.getFallbackPageSummary(pageContext, userRole);
                    result = {
                        response: fallbackSummary,
                        intent: 'summary_fallback',
                        entities: { page: pageContext },
                        suggestions: ['Refresh page', 'Try again', 'Visit specific pages']
                    };
                } else {
                    // Regular fallback
                    const response = aiAssistant.processQuery(message, userRole) + 
                        `\n\n🔧 **Database temporarily unavailable**\n\n📋 **Alternative Actions:**\n• Visit the **Stock** page for product information\n• Check **Records** page for your assignments\n• Contact monitors for real-time assistance\n• Try your query again in a moment`;
                    result = {
                        response,
                        intent: 'fallback',
                        entities: {},
                        suggestions: ['Visit Stock page', 'Check Records', 'Contact monitors', 'Try again later']
                    };
                }
            }

            res.json({
                success: true,
                response: result.response,
                intent: result.intent,
                entities: result.entities,
                suggestions: result.suggestions,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('AI Assistant error:', error);
            res.json({
                success: true,
                response: `I'm having trouble processing your request right now. Here's what you can do:\n\n📋 **Manual Steps:**\n• Visit **Stock** page to browse products\n• Check **Records** page for your history\n• Contact monitors for assistance\n• Use the navigation menu to find what you need\n\n🔄 Please try asking again in a moment.`,
                intent: 'error_fallback',
                suggestions: ['Visit Stock page', 'Check Records', 'Contact monitors', 'How to navigate']
            });
        }
    });

    // Get AI Assistant info with advanced capabilities
    router.get('/info', requireAuth, (req, res) => {
        const userRole = req.session.user.role;
        
        const roleCapabilities = {
            employee: [
                "🔍 Real-time product search and information",
                "📊 Personal request and assignment status",
                "🎯 Smart product recommendations", 
                "👥 Monitor contact and availability",
                "📋 Step-by-step process guidance",
                "💡 Contextual tips and suggestions"
            ],
            monitor: [
                "⚡ Pending approval insights",
                "📦 Dynamic inventory analytics",
                "🔄 Assignment tracking and history",
                "📈 Workload distribution analysis",
                "🛠️ Product management guidance",
                "📊 Real-time system statistics"
            ],
            admin: [
                "👥 Comprehensive user analytics",
                "📋 Registration queue management",
                "🔐 Role and permission insights", 
                "📊 System-wide performance metrics",
                "🎛️ Advanced configuration help",
                "📈 Usage patterns and trends"
            ]
        };

        const advancedFeatures = [
            "🧠 Natural Language Processing",
            "🔍 Dynamic Database Queries",
            "💭 Conversation Memory",
            "🎯 Intent Recognition",
            "📊 Real-time Data Integration",
            "💡 Smart Suggestions"
        ];

        res.json({
            success: true,
            capabilities: roleCapabilities[userRole] || roleCapabilities.employee,
            advancedFeatures,
            role: userRole,
            welcomeMessage: `Hello ${req.session.user.full_name}! I'm your advanced AI assistant with real-time data access and intelligent conversation capabilities. I can help you with ${userRole} tasks and much more!`
        });
    });

    // Get conversation history
    router.get('/history/:sessionId', requireAuth, (req, res) => {
        const sessionId = req.params.sessionId;
        const history = aiAssistant.conversationHistory.get(sessionId) || [];
        
        res.json({
            success: true,
            history: history.slice(-10) // Last 10 messages
        });
    });

    // Clear conversation history
    router.delete('/history/:sessionId', requireAuth, (req, res) => {
        const sessionId = req.params.sessionId;
        aiAssistant.conversationHistory.delete(sessionId);
        
        res.json({
            success: true,
            message: 'Conversation history cleared'
        });
    });

    return router;
};