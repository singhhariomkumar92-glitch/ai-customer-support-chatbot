// ==========================================
// AI CHATBOT - Frontend JavaScript
// ==========================================

class ChatBot {
    constructor() {
        // DOM Elements
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.statusEl = document.getElementById('status');
        this.charCount = document.getElementById('charCount');

        // Session Management
        this.sessionId = this.getOrCreateSessionId();

        // Initialize Event Listeners
        this.initEventListeners();

        // Auto-resize textarea
        this.setupAutoResize();
    }

    /**
     * Initialize all event listeners
     */
    initEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        this.userInput.addEventListener('keypress', (e) => {
            // Send on Enter (not Shift+Enter)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.userInput.addEventListener('input', () => {
            this.updateCharCount();
            this.adjustTextareaHeight();
        });
    }

    /**
     * Get or create a unique session ID
     */
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('chatbot_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chatbot_session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * Update character count display
     */
    updateCharCount() {
        const count = this.userInput.value.length;
        this.charCount.textContent = count;

        // Warn if getting close to limit
        if (count > 4500) {
            this.charCount.style.color = '#d32f2f';
        } else {
            this.charCount.style.color = '#666666';
        }
    }

    /**
     * Auto-resize textarea based on content
     */
    setupAutoResize() {
        this.adjustTextareaHeight();
    }

    adjustTextareaHeight() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    }

    /**
     * Send message to backend
     */
    async sendMessage() {
        const message = this.userInput.value.trim();

        // Validation
        if (!message) {
            this.showError('Please type a message');
            return;
        }

        if (message.length > 5000) {
            this.showError('Message is too long (max 5000 characters)');
            return;
        }

        // Disable send button and show loading
        this.sendBtn.disabled = true;
        this.userInput.disabled = true;

        // Display user message immediately
        this.displayMessage('user', message);
        this.userInput.value = '';
        this.updateCharCount();
        this.adjustTextareaHeight();

        // Show loading indicator
        this.showLoading(true);
        this.updateStatus('Waiting for response...');

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionId
                })
            });

            const data = await response.json();

            if (data.success) {
                // Update session ID if provided
                if (data.session_id) {
                    this.sessionId = data.session_id;
                    localStorage.setItem('chatbot_session_id', this.sessionId);
                }

                // Display bot response
                this.displayMessage('bot', data.response);
                this.updateStatus('Ready to help');
                this.scrollToBottom();
            } else {
                this.displayMessage('bot', '❌ ' + (data.response || 'An error occurred'));
                this.updateStatus('Error occurred');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            const errorMsg = this.getErrorMessage(error);
            this.displayMessage('bot', '❌ ' + errorMsg);
            this.updateStatus('Connection error');
        } finally {
            // Re-enable send button
            this.sendBtn.disabled = false;
            this.userInput.disabled = false;
            this.showLoading(false);
            this.userInput.focus();
        }
    }

    /**
     * Display a message in the chat
     */
    displayMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const pTag = document.createElement('p');
        pTag.textContent = text;

        contentDiv.appendChild(pTag);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * Show error message
     */
    showError(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message error-message';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const pTag = document.createElement('p');
        pTag.textContent = message;

        contentDiv.appendChild(pTag);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
        if (show) {
            this.scrollToBottom();
        }
    }

    /**
     * Update status text
     */
    updateStatus(text) {
        this.statusEl.textContent = text;
    }

    /**
     * Scroll to bottom of chat
     */
    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 0);
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (error instanceof TypeError) {
            if (error.message.includes('Failed to fetch')) {
                return 'Network error. Please check your connection.';
            }
        }
        return 'Failed to connect to the server. Please try again.';
    }
}

// ==========================================
// INITIALIZE CHATBOT ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.chatBot = new ChatBot();
        console.log('✓ Chatbot initialized successfully');
    } catch (error) {
        console.error('✗ Error initializing chatbot:', error);
        alert('Failed to initialize chatbot. Please refresh the page.');
    }
});

// Handle page visibility to save session
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - session preserved');
    } else {
        console.log('Page visible - session restored');
    }
});
