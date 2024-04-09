import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './ChatWindow.css';

export interface ChatWindowProps {
  messages: Array<{ type: string; text: string }>;
  selectedAvatar: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, selectedAvatar }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const [minimizedMessages, setMinimizedMessages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(
      () => {
        console.log('Code copied to clipboard');
      },
      (err) => {
        console.error('Failed to copy code: ', err);
      }
    );
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(
      () => {
        console.log('Message copied to clipboard');
      },
      (err) => {
        console.error('Failed to copy message: ', err);
      }
    );
  };

  const toggleMessageMinimize = (index: number) => {
    setMinimizedMessages((prevState) => ({
      ...prevState,
      [index]: !prevState[index],
    }));
  };

  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="code-block">
          <SyntaxHighlighter
            style={tomorrow}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
          <button
            className="copy-code-button"
            onClick={() => handleCopyCode(String(children))}
          >
            Copy Code
          </button>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="chat-window" ref={chatWindowRef}>
      {messages.map((message, index) => (
        <div
          key={index}
          className={`message ${message.type === 'user' ? 'user-message' : 'ai-message'}`}
        >
          {message.type === 'ai' && (
            <img className="bot-avatar" src={`avatars/${selectedAvatar}.png`} alt="Bot Avatar" />
          )}
          <div className="message-content">
            <div className="message-header">
              <button
                className="minimize-button"
                onClick={() => toggleMessageMinimize(index)}
              >
                {minimizedMessages[index] ? <span>+</span> : <span>-</span>}
              </button>
            </div>
            <div className={`message-body ${minimizedMessages[index] ? 'minimized' : ''}`}>
            <ReactMarkdown components={components}>
  {message.text}
</ReactMarkdown>            </div>
            {!minimizedMessages[index] && (
              <button
                className="copy-message-button"
                title="Copy"
                onClick={() => handleCopyMessage(message.text)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatWindow;