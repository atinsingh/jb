import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  FaceSmileIcon,
  PaperClipIcon as PaperClipIconSolid,
  PaperAirplaneIcon as PaperAirplaneIconSolid,
  UserCircleIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { FaceSmileIcon as FaceSmileIconSolid } from '@heroicons/react/24/solid';
import EmployerLayout from '@/components/layout/EmployerLayout';
import Image from 'next/image';

// Function to generate avatar URL with initials
const getAvatarUrl = (name, size = 128) => {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=${size}`;
};

const conversations = [
  {
    id: 1,
    name: 'Alex Johnson',
    role: 'Senior React Developer',
    lastMessage: 'Looking forward to our interview!',
    time: '10:30 AM',
    unread: 2,
    avatar: getAvatarUrl('Alex Johnson'),
    online: true,
    lastActive: 'Just now'
  },
  {
    id: 2,
    name: 'Sarah Williams',
    role: 'UX/UI Designer',
    lastMessage: 'Thanks for the feedback!',
    time: 'Yesterday',
    unread: 0,
    avatar: getAvatarUrl('Sarah Williams'),
    online: false,
    lastActive: '2h ago'
  },
  {
    id: 3,
    name: 'Michael Chen',
    role: 'Backend Engineer',
    lastMessage: 'I\'ve sent the technical task.',
    time: 'Mon',
    unread: 0,
    avatar: getAvatarUrl('Michael Chen'),
    online: true,
    lastActive: '30m ago'
  },
];

const messages = [
  { 
    id: 1, 
    sender: 'them', 
    content: 'Hi! I came across your job posting and I\'m very interested in the Senior React Developer position.', 
    time: '10:00 AM',
    status: 'delivered',
    read: true
  },
  { 
    id: 2, 
    sender: 'me', 
    content: 'Hello Alex! Thanks for reaching out. What would you like to know about the position?', 
    time: '10:05 AM',
    status: 'read',
    read: true
  },
  { 
    id: 3, 
    sender: 'them', 
    content: 'Could you tell me more about the tech stack and the team I\'ll be working with?', 
    time: '10:10 AM',
    status: 'read',
    read: true
  },
  { 
    id: 4, 
    sender: 'me', 
    content: 'Absolutely! We use React with TypeScript, Redux for state management, and our backend is built with Node.js and PostgreSQL. The team consists of 5 developers, 2 designers, and a product manager.', 
    time: '10:15 AM',
    status: 'read',
    read: true
  },
  { 
    id: 5, 
    sender: 'them', 
    content: 'That sounds great! I have experience with all those technologies. When would be a good time for an interview?', 
    time: '10:30 AM',
    status: 'delivered',
    read: false
  },
];

// Custom hook for auto-scrolling to bottom of chat
const useAutoScroll = (deps = []) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, deps);

  return { messagesEndRef, scrollToBottom };
};

export default function EmployerMessages() {
  const [activeConversation, setActiveConversation] = useState(1);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const { messagesEndRef, scrollToBottom } = useAutoScroll([activeConversation]);
  
  const currentConversation = conversations.find(conv => conv.id === activeConversation);
  const filteredConversations = conversations.filter(conv => 
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (message.trim()) {
      // In a real app, you would send the message to your backend here
      console.log('Sending message:', message);
      setMessage('');
      scrollToBottom();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Handle file upload logic here
      console.log('File selected:', file.name);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <EmployerLayout>
      <Head>
        <title>Messages | Jobocate</title>
        <meta name="description" content="Manage your candidate conversations" />
      </Head>
      
      <div className="flex h-[calc(100vh-64px)] bg-white">
        {/* Sidebar */}
        <div className="w-full md:w-96 border-r border-gray-200 flex flex-col bg-gray-50">
          <div className="p-4 border-b bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
              <button className="p-1 rounded-full hover:bg-gray-100">
                <EllipsisHorizontalIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                placeholder="Search messages or candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-4 border-b cursor-pointer transition-colors duration-150 ${
                    activeConversation === conv.id 
                      ? 'bg-orange-50 border-l-4 border-l-orange-500' 
                      : 'hover:bg-gray-100 border-l-4 border-transparent'
                  }`}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <div className="flex items-start">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                        <Image 
                          src={conv.avatar} 
                          alt={conv.name} 
                          width={48} 
                          height={48} 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Fallback to initials if image fails to load
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.name)}&background=random&color=fff&size=128`;
                          }}
                        />
                      </div>
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></span>
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-gray-900">{conv.name}</h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {conv.time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-0.5">{conv.role}</p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {conv.lastMessage}
                      </p>
                      {conv.unread > 0 && (
                        <span className="inline-flex items-center justify-center mt-1 px-2 py-0.5 text-xs font-medium text-white bg-orange-500 rounded-full">
                          {conv.unread} new
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mb-2" />
                <h3 className="text-lg font-medium text-gray-900">No matches found</h3>
                <p className="text-gray-500 mt-1">Try adjusting your search or filter to find what you're looking for.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="hidden md:flex flex-col flex-1">
          {currentConversation ? (
            <>
              <div className="p-4 border-b flex items-center justify-between bg-white">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                      <Image 
                        src={currentConversation.avatar} 
                        alt={currentConversation.name} 
                        width={40} 
                        height={40} 
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentConversation.name)}&background=random&color=fff&size=128`;
                        }}
                      />
                    </div>
                    {currentConversation.online && (
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"></span>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">{currentConversation.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center">
                      {currentConversation.online ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                          Online
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-gray-300 mr-1"></span>
                          {currentConversation.lastActive}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-[url('/images/chat-bg-pattern.png')] bg-gray-50">
                <div className="max-w-3xl mx-auto space-y-4">
                  {/* Date separator */}
                  <div className="relative flex items-center justify-center my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative px-3 bg-gray-50 text-xs text-gray-500 rounded-lg border border-gray-200">
                      Today
                    </div>
                  </div>

                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-md rounded-2xl px-4 py-2 ${
                          msg.sender === 'me' 
                            ? 'bg-orange-500 text-white rounded-tr-none' 
                            : 'bg-white border border-gray-200 rounded-tl-none shadow-sm'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className={`mt-1 flex items-center justify-end space-x-1 text-xs ${
                          msg.sender === 'me' ? 'text-orange-100' : 'text-gray-400'
                        }`}>
                          <span>{msg.time}</span>
                          {msg.sender === 'me' && (
                            <span className="ml-1">
                              {msg.status === 'sent' ? (
                                <ClockIcon className="h-3 w-3" />
                              ) : msg.status === 'delivered' ? (
                                <CheckIcon className="h-3 w-3" />
                              ) : (
                                <CheckIcon className="h-3 w-3 text-blue-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex items-center space-x-1 p-2 rounded-full bg-white border border-gray-200 w-20">
                      <div className="h-2 w-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="p-4 border-t bg-white">
                <div className="relative">
                  <div className="flex items-end space-x-2">
                    <button 
                      type="button" 
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      <PaperClipIcon className="h-5 w-5" />
                      <span className="sr-only">Attach file</span>
                    </button>
                    
                    <div className="flex-1 relative">
                      <textarea
                        rows="1"
                        className="block w-full rounded-lg border-0 py-3 px-4 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6 resize-none"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setIsTyping(false)}
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                      />
                      
                      <div className="absolute right-2 bottom-2 flex space-x-1">
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-500"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                          {showEmojiPicker ? (
                            <FaceSmileIconSolid className="h-5 w-5 text-orange-500" />
                          ) : (
                            <FaceSmileIcon className="h-5 w-5" />
                          )}
                          <span className="sr-only">Add emoji</span>
                        </button>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center rounded-full h-10 w-10 ${
                        message.trim() 
                          ? 'bg-orange-500 text-white hover:bg-orange-600' 
                          : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      } transition-colors duration-150`}
                      disabled={!message.trim()}
                      onClick={handleSendMessage}
                    >
                      {message.trim() ? (
                        <PaperAirplaneIconSolid className="h-5 w-5" />
                      ) : (
                        <PaperAirplaneIcon className="h-5 w-5" />
                      )}
                      <span className="sr-only">Send message</span>
                    </button>
                  </div>
                  
                  {/* Emoji picker would go here */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 w-64 h-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 bg-gray-50 border-b">
                        <input
                          type="text"
                          placeholder="Search emojis..."
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      </div>
                      <div className="p-2 h-48 overflow-y-auto">
                        <p className="text-center text-gray-500 text-sm py-16">
                          Emoji picker would be implemented here
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <span>Press Enter to send</span>
                    <span>•</span>
                    <span>Shift+Enter for new line</span>
                  </div>
                  <div>
                    <span>{message.length}/1000</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
              <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No conversation selected</h3>
              <p className="text-gray-500 max-w-md">
                Select a conversation from the list or start a new one to begin messaging.
              </p>
              <button
                type="button"
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Message
              </button>
            </div>
          )}
        </div>
      </div>
    </EmployerLayout>
  );
}
