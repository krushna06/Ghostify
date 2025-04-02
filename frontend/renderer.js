document.addEventListener('DOMContentLoaded', () => {
    const chatList = document.getElementById('chat-list');
    const toggleButton = document.getElementById('toggle-btn');
    const chatButton = document.getElementById('chat-btn');
  
    function updateChat(chat) {
      const chatItem = document.createElement('div');
      chatItem.classList.add('chat-item');
      chatItem.innerHTML = `<strong>You:</strong> ${chat.user} <br> <strong>Ollama:</strong> ${chat.ollama}`;
      chatList.appendChild(chatItem);
    }
  
    function showChatHistory(history) {
      chatList.innerHTML = '';
      history.forEach(updateChat);
    }
  
    window.api.onUpdateChat(updateChat);
    window.api.onShowChatHistory(showChatHistory);
  
    toggleButton.addEventListener('click', () => {
      window.api.toggleWindow();
    });
  
    chatButton.addEventListener('click', async () => {
      const history = await window.api.getChatHistory();
      showChatHistory(history);
    });
  });
  