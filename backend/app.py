from flask import Flask, render_template, request, jsonify
import uuid
import os
from config import Config
from database import db
from ai_service import ai_service

app = Flask(
    __name__,
    template_folder='../frontend',
    static_folder='../frontend',
    static_url_path='/static'
)

app.config.from_object(Config)

@app.route('/')
def index():
    """Serve the chat interface"""
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    """
    Handle chat messages
    
    Expected JSON:
    {
        "message": "user's message",
        "session_id": "unique session identifier (optional)"
    }
    
    Returns:
    {
        "success": bool,
        "response": "AI response or error message",
        "session_id": "session ID for future messages"
    }
    """
    
    try:
        data = request.get_json()
        
        # Validation
        if not data:
            return jsonify({
                'success': False,
                'response': 'No data provided'
            }), 400
        
        user_message = data.get('message', '').strip()
        if not user_message:
            return jsonify({
                'success': False,
                'response': 'Message cannot be empty'
            }), 400
        
        # Get or create session
        session_id = data.get('session_id') or str(uuid.uuid4())
        conversation_id = db.create_conversation(session_id)
        
        if not conversation_id:
            return jsonify({
                'success': False,
                'response': 'Failed to create conversation session'
            }), 500
        
        # Store user message in database
        db.add_message(conversation_id, 'user', user_message)
        
        # Get conversation history for context
        history = db.get_conversation_history(conversation_id)
        formatted_history = [
            {
                'sender': 'assistant' if msg[0] == 'bot' else msg[0],
                'message': msg[1]
            }
            for msg in history[:-1]  # Exclude the message we just added
        ]
        
        # Get AI response
        ai_result = ai_service.get_response(user_message, formatted_history)
        
        if not ai_result['success']:
            return jsonify({
                'success': False,
                'response': ai_result['response'],
                'session_id': session_id
            }), 500
        
        ai_response = ai_result['response']
        
        # Store bot response in database
        db.add_message(conversation_id, 'bot', ai_response)
        
        # Return success response
        return jsonify({
            'success': True,
            'response': ai_response,
            'session_id': session_id
        }), 200
    
    except Exception as e:
        print(f"✗ Error in /chat endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'response': 'An unexpected error occurred. Please try again.'
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 AI Customer Support Chatbot Starting...")
    print("=" * 50)
    print(f"Debug Mode: {app.debug}")
    print(f"Database: {Config.DATABASE_PATH}")
    print("=" * 50)
    
    app.run(debug=app.debug, host='0.0.0.0', port=5000)
