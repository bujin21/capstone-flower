
        let isChatbotOpen = false;
        
        function toggleChatbot() {
            const container = document.getElementById('chatbotContainer');
            isChatbotOpen = !isChatbotOpen;
            
            if (isChatbotOpen) {
                container.style.display = 'flex';
                document.getElementById('chatInput').focus();
            } else {
                container.style.display = 'none';
            }
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        async function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message) return;
            
            // 사용자 메시지 추가
            addMessage(message, 'user');
            input.value = '';
            
            // 전송 버튼 비활성화 및 타이핑 표시
            const sendButton = document.getElementById('sendButton');
            const typingIndicator = document.getElementById('typingIndicator');
            
            sendButton.disabled = true;
            typingIndicator.style.display = 'block';
            scrollToBottom();

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message })
                });

                const data = await response.json();
                
                // 타이핑 표시 숨기기
                typingIndicator.style.display = 'none';
                
                if (data.error) {
                    addMessage('죄송합니다. 오류가 발생했습니다: ' + data.error, 'bot');
                } else {
                    addMessage(data.response, 'bot');
                }
                
            } catch (error) {
                typingIndicator.style.display = 'none';
                addMessage('죄송합니다. 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.', 'bot');
            } finally {
                sendButton.disabled = false;
            }
        }

        function addMessage(text, sender) {
            const messagesContainer = document.getElementById('chatbotMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}`;
            messageDiv.textContent = text;
            
            messagesContainer.appendChild(messageDiv);
            scrollToBottom();
        }

        function scrollToBottom() {
            const messagesContainer = document.getElementById('chatbotMessages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // 창 외부 클릭시 챗봇 닫기
        document.addEventListener('click', function(event) {
            const chatbotContainer = document.getElementById('chatbotContainer');
            const chatbotToggle = document.querySelector('.chatbot-toggle');
            
            if (isChatbotOpen && 
                !chatbotContainer.contains(event.target) && 
                !chatbotToggle.contains(event.target)) {
                toggleChatbot();
            }
        });
