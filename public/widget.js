(function() {
  // Get the chatbot ID from the script tag
  const scriptTag = document.currentScript;
  const chatbotId = scriptTag.getAttribute('data-chatbot-id');

  if (!chatbotId) {
    console.error('Intaj AI Widget: data-chatbot-id attribute is missing.');
    return;
  }

  // Create a container for the chat widget
  const chatContainer = document.createElement('div');
  chatContainer.id = 'intaj-ai-widget-container';
  document.body.appendChild(chatContainer);

  // Style the container
  chatContainer.style.position = 'fixed';
  chatContainer.style.bottom = '20px';
  chatContainer.style.right = '20px';
  chatContainer.style.width = '350px';
  chatContainer.style.height = '500px';
  chatContainer.style.border = '1px solid #ccc';
  chatContainer.style.borderRadius = '10px';
  chatContainer.style.backgroundColor = '#fff';
  chatContainer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
  chatContainer.style.display = 'flex';
  chatContainer.style.flexDirection = 'column';
  chatContainer.style.overflow = 'hidden';
  chatContainer.style.zIndex = '9999';

  // Create the header
  const header = document.createElement('div');
  header.style.padding = '10px';
  header.style.backgroundColor = '#f1f1f1';
  header.style.borderBottom = '1px solid #ccc';
  header.innerHTML = '<strong>Intaj AI Chat</strong>';
  chatContainer.appendChild(header);

  // Create the message area
  const messagesDiv = document.createElement('div');
  messagesDiv.style.flexGrow = '1';
  messagesDiv.style.padding = '10px';
  messagesDiv.style.overflowY = 'auto';
  chatContainer.appendChild(messagesDiv);

  // Create the input area
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type your message...';
  input.style.border = 'none';
  input.style.padding = '10px';
  input.style.width = 'calc(100% - 20px)';
  input.style.borderTop = '1px solid #ccc';

  input.onkeydown = function(e) {
    if (e.key === 'Enter' && input.value.trim() !== '') {
      const userMessage = input.value;
      appendMessage('user', userMessage);
      input.value = '';

      // Send message to the API
      fetch('https://intaj.nabih.tech/api/widget/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          chatbotId: chatbotId,
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.reply) {
          appendMessage('bot', data.reply);
        }
      })
      .catch(error => {
        console.error('Error fetching chat reply:', error);
        appendMessage('bot', 'Sorry, I am having trouble connecting.');
      });
    }
  };

  chatContainer.appendChild(input);

  function appendMessage(sender, text) {
    const messageP = document.createElement('p');
    messageP.style.margin = '5px 0';
    messageP.style.padding = '8px';
    messageP.style.borderRadius = '5px';
    if (sender === 'user') {
      messageP.style.backgroundColor = '#e1f5fe';
      messageP.style.textAlign = 'right';
    } else {
      messageP.style.backgroundColor = '#f1f1f1';
      messageP.style.textAlign = 'left';
    }
    messageP.textContent = text;
    messagesDiv.appendChild(messageP);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to bottom
  }

  // Initial greeting
  appendMessage('bot', 'Hello! How can I help you today?');

})();
