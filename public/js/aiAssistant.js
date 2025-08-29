/**
 * AI Assistant Chatbot UI
 * Frontend JavaScript for the AI assistant functionality
 */

class ChatBot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.init();
    }

    init() {
        this.createChatWidget();
        this.bindEvents();
        this.loadWelcomeMessage();
    }

    createChatWidget() {
        // Create chat widget HTML
        const chatWidget = document.createElement('div');
        chatWidget.innerHTML = `
            <!-- Chat Toggle Button -->
            <div id="chatToggle" class="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-110">
                <i class="fas fa-robot text-xl"></i>
                <div class="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-full w-7 h-7 flex items-center justify-center animate-pulse shadow-lg">
                    🧠
                </div>
            </div>

            <!-- Chat Window -->
            <div id="chatWindow" class="fixed bottom-24 right-6 z-50 w-80 h-96 bg-white rounded-lg shadow-2xl border border-gray-200 transform translate-y-full opacity-0 transition-all duration-300 hidden">
                <!-- Chat Header -->
                <div class="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-robot"></i>
                        <span class="font-semibold">AI Assistant</span>
                    </div>
                    <button id="chatClose" class="text-white hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Chat Messages -->
                <div id="chatMessages" class="flex-1 p-4 overflow-y-auto h-64 bg-gray-50">
                    <div class="text-center text-gray-500 text-sm">
                        <i class="fas fa-robot text-2xl mb-2"></i>
                        <p>Loading AI Assistant...</p>
                    </div>
                </div>

                <!-- Chat Input -->
                <div class="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                    <div class="flex space-x-2">
                        <input 
                            type="text" 
                            id="chatInput" 
                            placeholder="Ask me anything about the system..."
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                        <button 
                            id="chatSend" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div class="mt-2 flex flex-wrap gap-1" id="quickButtons">
                        <button class="quick-question text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-2 py-1 rounded" data-question="Summarize this page">📋 Page Summary</button>
                        <button class="quick-question text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded" data-question="Stock summary">📦 Stock</button>
                        <button class="quick-question text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-1 rounded" data-question="Records summary">📋 Records</button>
                        <button class="quick-question text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded" data-question="System overview">🏢 System</button>
                    </div>
                    <div class="mt-2 text-xs text-gray-500">
                        🧠 Advanced AI with real-time data access
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(chatWidget);
    }

    bindEvents() {
        // Toggle chat window
        document.getElementById('chatToggle').addEventListener('click', () => {
            this.toggleChat();
        });

        // Close chat window
        document.getElementById('chatClose').addEventListener('click', () => {
            this.closeChat();
        });

        // Send message on Enter key
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Send message on button click
        document.getElementById('chatSend').addEventListener('click', () => {
            this.sendMessage();
        });

        // Quick questions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-question')) {
                const question = e.target.getAttribute('data-question');
                document.getElementById('chatInput').value = question;
                this.sendMessage();
            }
        });
    }

    async loadWelcomeMessage() {
        try {
            const response = await fetch('/api/ai-assistant/info');
            const data = await response.json();
            
            if (data.success) {
                this.addMessage('bot', data.welcomeMessage);
                
                let capabilitiesMsg = `🚀 **My Advanced Capabilities:**\n\n`;
                capabilitiesMsg += data.capabilities.map(cap => `• ${cap}`).join('\n');
                capabilitiesMsg += `\n\n🎆 **Powered by:**\n`;
                capabilitiesMsg += data.advancedFeatures.map(feature => `• ${feature}`).join('\n');
                
                this.addMessage('bot', capabilitiesMsg);
                
                // Update quick buttons based on role
                this.updateQuickButtons(data.role);
            }
        } catch (error) {
            console.error('Error loading AI assistant info:', error);
            this.addMessage('bot', 'Hello! I\'m your advanced AI assistant with real-time data access. How can I help you today?');
        }
    }

    updateQuickButtons(role) {
        const quickButtons = document.getElementById('quickButtons');
        if (!quickButtons) return;
        
        const roleButtons = {
            employee: [
                { text: 'Page Summary', question: 'Summarize this page', color: 'indigo' },
                { text: 'Stock Summary', question: 'Stock summary', color: 'green' },
                { text: 'My Records', question: 'Records summary', color: 'purple' },
                { text: 'System Overview', question: 'System overview', color: 'blue' }
            ],
            monitor: [
                { text: 'Page Summary', question: 'Summarize this page', color: 'indigo' },
                { text: 'Approvals Summary', question: 'Summarize approvals', color: 'red' },
                { text: 'Stock Summary', question: 'Stock summary', color: 'green' },
                { text: 'System Overview', question: 'System overview', color: 'blue' }
            ],
            admin: [
                { text: 'Page Summary', question: 'Summarize this page', color: 'indigo' },
                { text: 'Employees Summary', question: 'Employees summary', color: 'purple' },
                { text: 'Stock Summary', question: 'Stock summary', color: 'green' },
                { text: 'System Overview', question: 'System overview', color: 'blue' }
            ]
        };
        
        const buttons = roleButtons[role] || roleButtons.employee;
        quickButtons.innerHTML = buttons.map(btn => 
            `<button class="quick-question text-xs bg-${btn.color}-100 hover:bg-${btn.color}-200 text-${btn.color}-800 px-2 py-1 rounded transition-all duration-200" data-question="${btn.question}">${btn.text}</button>`
        ).join('');
    }

    toggleChat() {
        const chatWindow = document.getElementById('chatWindow');
        
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        const chatWindow = document.getElementById('chatWindow');
        chatWindow.classList.remove('hidden');
        
        setTimeout(() => {
            chatWindow.classList.remove('translate-y-full', 'opacity-0');
            chatWindow.classList.add('translate-y-0', 'opacity-100');
        }, 10);
        
        this.isOpen = true;
        document.getElementById('chatInput').focus();
    }

    closeChat() {
        const chatWindow = document.getElementById('chatWindow');
        chatWindow.classList.remove('translate-y-0', 'opacity-100');
        chatWindow.classList.add('translate-y-full', 'opacity-0');
        
        setTimeout(() => {
            chatWindow.classList.add('hidden');
        }, 300);
        
        this.isOpen = false;
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message to chat
        this.addMessage('user', message);
        input.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Get current page context from URL
            const currentPath = window.location.pathname;
            let pageContext = null;
            if (currentPath.includes('/dashboard')) pageContext = 'dashboard';
            else if (currentPath.includes('/stock')) pageContext = 'stock';
            else if (currentPath.includes('/records')) pageContext = 'records';
            else if (currentPath.includes('/requests')) pageContext = 'requests';
            else if (currentPath.includes('/approvals')) pageContext = 'approvals';
            else if (currentPath.includes('/employees')) pageContext = 'employees';
            
            const response = await fetch('/api/ai-assistant/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message, pageContext })
            });

            const data = await response.json();
            
            // Remove typing indicator
            this.hideTypingIndicator();

            if (data.success) {
                this.addMessage('bot', data.response);
                
                // Show advanced features if available
                if (data.intent && data.intent !== 'fallback') {
                    this.showAdvancedFeatures(data);
                }
                
                // Update suggestions
                if (data.suggestions && data.suggestions.length > 0) {
                    this.updateSuggestions(data.suggestions);
                }
            } else {
                this.addMessage('bot', data.error || 'Sorry, I couldn\'t process your request.');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.addMessage('bot', 'Sorry, I\'m having trouble connecting. Please try again.');
        }
    }

    addMessage(sender, text) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        
        const isBot = sender === 'bot';
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.className = `mb-3 ${isBot ? 'text-left' : 'text-right'}`;
        messageDiv.innerHTML = `
            <div class="inline-block max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${
                isBot 
                    ? 'bg-gray-200 text-gray-800' 
                    : 'bg-blue-600 text-white'
            }">
                <div class="whitespace-pre-wrap">${this.formatMessage(text)}</div>
                <div class="text-xs opacity-70 mt-1">${timestamp}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.messages.push({ sender, text, timestamp });
    }

    formatMessage(text) {
        // Enhanced message formatting with emojis and styling
        return text
            .replace(/\n• /g, '\n<br>• ')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/📋 \*\*(.*?)\*\*/g, '<div class="bg-indigo-50 p-3 rounded-lg mt-2 mb-2 border-l-4 border-indigo-400"><strong class="text-indigo-800">📋 $1</strong></div>')
            .replace(/📊 \*\*(.*?)\*\*/g, '<div class="bg-blue-50 p-2 rounded mt-2 mb-2"><strong class="text-blue-800">📊 $1</strong></div>')
            .replace(/📦 \*\*(.*?)\*\*/g, '<div class="bg-green-50 p-2 rounded mt-2 mb-2"><strong class="text-green-800">📦 $1</strong></div>')
            .replace(/📅 \*\*(.*?)\*\*/g, '<div class="bg-purple-50 p-2 rounded mt-2 mb-2"><strong class="text-purple-800">📅 $1</strong></div>')
            .replace(/👤 \*\*(.*?)\*\*/g, '<div class="bg-gray-50 p-2 rounded mt-2 mb-2"><strong class="text-gray-800">👤 $1</strong></div>')
            .replace(/🏢 \*\*(.*?)\*\*/g, '<div class="bg-teal-50 p-2 rounded mt-2 mb-2"><strong class="text-teal-800">🏢 $1</strong></div>')
            .replace(/💡 (.*?)(?=<br>|$)/g, '<div class="bg-yellow-50 p-2 rounded mt-1 text-yellow-800">💡 $1</div>')
            .replace(/⚠️ (.*?)(?=<br>|$)/g, '<div class="bg-orange-50 p-2 rounded mt-1 text-orange-800">⚠️ $1</div>')
            .replace(/✅ (.*?)(?=<br>|$)/g, '<div class="bg-green-50 p-1 rounded mt-1 text-green-800">✅ $1</div>')
            .replace(/❌ (.*?)(?=<br>|$)/g, '<div class="bg-red-50 p-1 rounded mt-1 text-red-800">❌ $1</div>');
    }

    showAdvancedFeatures(data) {
        if (data.entities && Object.keys(data.entities).length > 0) {
            const entityInfo = Object.entries(data.entities)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            
            // Add subtle indicator of AI understanding
            const lastMessage = document.querySelector('#chatMessages .mb-3:last-child');
            if (lastMessage) {
                const indicator = document.createElement('div');
                indicator.className = 'text-xs text-blue-500 mt-1 opacity-70';
                indicator.innerHTML = `🧠 Understood: ${entityInfo}`;
                lastMessage.appendChild(indicator);
            }
        }
    }

    updateSuggestions(suggestions) {
        const quickButtons = document.getElementById('quickButtons');
        if (!quickButtons || suggestions.length === 0) return;
        
        // Temporarily show AI suggestions
        const originalButtons = quickButtons.innerHTML;
        
        quickButtons.innerHTML = suggestions.slice(0, 4).map(suggestion => 
            `<button class="quick-question text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-2 py-1 rounded" data-question="${suggestion}">🧠 ${suggestion}</button>`
        ).join('');
        
        // Revert after 10 seconds
        setTimeout(() => {
            quickButtons.innerHTML = originalButtons;
        }, 10000);
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'mb-3 text-left';
        typingDiv.innerHTML = `
            <div class="inline-block bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}

// Initialize advanced chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new ChatBot();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to open chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (!chatbot.isOpen) {
                chatbot.openChat();
            }
        }
        
        // Escape to close chat
        if (e.key === 'Escape' && chatbot.isOpen) {
            chatbot.closeChat();
        }
    });
    
    // Add visual indicator for advanced features
    const chatToggle = document.getElementById('chatToggle');
    if (chatToggle) {
        chatToggle.title = 'Advanced AI Assistant (Ctrl+K)';
        
        // Add pulsing animation
        setInterval(() => {
            chatToggle.classList.add('animate-pulse');
            setTimeout(() => chatToggle.classList.remove('animate-pulse'), 2000);
        }, 10000);
    }
});