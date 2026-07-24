import { useState } from 'react';
import { Header } from '../../app/Header';
import { useSendChatMessage } from '../../api/agentApi';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const sendMessage = useSendChatMessage();

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    const userMessage: ChatMessage = { id: Date.now(), role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
    sendMessage.mutate(text, {
      onSuccess: (response) => {
        setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: response.reply }]);
      },
    });
  }

  return (
    <>
      <Header title="Chat" />
      <main className="main-single chat-screen">
        <div className="chat-messages" role="log" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`chat-message chat-message-${message.role}`}>
              {message.text}
            </div>
          ))}
        </div>
        <form
          className="chat-input-row"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
        >
          <label htmlFor="chat-input">Message</label>
          <input
            id="chat-input"
            aria-label="Message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </main>
    </>
  );
}
