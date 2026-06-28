'use client'

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/config/api';
import { 
  MicrophoneIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UserCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Select } from '@/components/catalyst/select';
import { toast } from 'react-toastify';

export default function InterviewBuddy() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchApplication, setSearchApplication] = useState('');
  const [showSelection, setShowSelection] = useState(true);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchApplications();
    fetchResumes();
    initializeSpeechRecognition();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => prev + (prev ? ' ' : '') + transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast.error('Speech recognition failed. Please try again.');
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/interview-buddy/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchResumes = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/resume-builder`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setResumes(data || []);
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
    }
  };

  const handleStartChat = () => {
    if (!selectedResume) {
      toast.error('Please select a resume to start');
      return;
    }

    setShowSelection(false);
    // Initialize chat with welcome message
    const welcomeMessage = {
      role: 'assistant',
      content: `Hello! I'm your Interview Buddy. I'm here to help you prepare for your interview${selectedResume ? ` using your resume: ${selectedResume.name || 'My Resume'}` : ''}${selectedApplication ? ` for ${selectedApplication.jobTitle} at ${selectedApplication.companyName}` : ''}. 

Ask me anything about:
- Common interview questions
- How to answer specific questions
- What interviewers might be looking for
- Tips for your specific role
- Practice your answers

How can I help you prepare today?`,
    };
    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputMessage.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      // Build conversation history (last 10 messages for context)
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({ role: msg.role, content: msg.content }));

      const response = await fetch(`${API_URL}/api/interview-buddy/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          applicationId: selectedApplication?.id,
          resumeId: selectedResume?.id || selectedResume?._id,
          conversationHistory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to get response');
        setMessages(prev => prev.slice(0, -1)); // Remove user message on error
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in your browser');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const filteredApplications = applications.filter(app =>
    app.jobTitle?.toLowerCase().includes(searchApplication.toLowerCase()) ||
    app.companyName?.toLowerCase().includes(searchApplication.toLowerCase())
  );

  return (
    <DashboardLayout>
      <Head>
        <title>Interview Buddy - Jobocate</title>
      </Head>
      <div className="min-h-screen bg-white">
        {showSelection ? (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-zinc-950 mb-4">Interview Buddy</h1>
              <p className="text-lg text-zinc-600">
                Select a resume (and optionally a job application) to start preparing for your interview
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Applications Section */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <h2 className="text-xl font-semibold text-zinc-950 mb-2">Job Applications</h2>
                <p className="text-sm text-zinc-500 mb-4">Optional - Select a job to get role-specific interview tips</p>
                <div className="relative mb-4">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchApplication}
                    onChange={(e) => setSearchApplication(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredApplications.length === 0 ? (
                    <p className="text-zinc-500 text-center py-8">No applications found</p>
                  ) : (
                    filteredApplications.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApplication(selectedApplication?.id === app.id ? null : app)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedApplication?.id === app.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <h3 className="font-semibold text-zinc-950">{app.jobTitle}</h3>
                        <p className="text-sm text-zinc-600">{app.companyName}</p>
                        <p className="text-xs text-zinc-500 mt-1">Status: {app.status}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Resumes Section */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <h2 className="text-xl font-semibold text-zinc-950 mb-2">Resumes</h2>
                <p className="text-sm text-zinc-500 mb-4">Required - Select one resume for interview preparation</p>
                <Field>
                  <Label>Select Resume</Label>
                  <Select
                    value={selectedResume?.id || selectedResume?._id || ''}
                    onChange={(e) => {
                      const resumeId = e.target.value;
                      if (resumeId) {
                        const resume = resumes.find(r => (r.id || r._id) === resumeId);
                        setSelectedResume(resume || null);
                      } else {
                        setSelectedResume(null);
                      }
                    }}
                  >
                    <option value="">Choose a resume...</option>
                    {resumes.map((resume) => (
                      <option key={resume.id || resume._id} value={resume.id || resume._id}>
                        {resume.name || 'Untitled Resume'} {resume.template ? `(${resume.template})` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                {selectedResume && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Selected:</strong> {selectedResume.name || 'Untitled Resume'}
                      {selectedResume.template && (
                        <span className="ml-2 text-blue-600 capitalize">({selectedResume.template})</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleStartChat}
                color="blue"
                disabled={!selectedResume}
              >
                Start Interview Prep
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-80px)] w-full bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Interview Buddy</h2>
                  <div className="flex items-center gap-2 text-sm text-blue-100">
                    {selectedApplication && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-200 rounded-full"></span>
                        {selectedApplication.jobTitle} at {selectedApplication.companyName}
                      </span>
                    )}
                    {selectedResume && (
                      <span className="flex items-center gap-1">
                        {selectedApplication && <span className="mx-1">•</span>}
                        <span className="w-1.5 h-1.5 bg-blue-200 rounded-full"></span>
                        {selectedResume.name || 'My Resume'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowSelection(true);
                  setMessages([]);
                  setSelectedApplication(null);
                  setSelectedResume(null);
                }}
                outline
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <XMarkIcon className="h-4 w-4" />
                Change
              </Button>
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-b from-zinc-50 to-white"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-blue-500'
                        : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                    }`}>
                      {message.role === 'user' ? (
                        <UserCircleIcon className="h-6 w-6 text-white" />
                      ) : (
                        <SparklesIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`flex flex-col gap-1 max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-sm ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white rounded-tr-sm'
                            : 'bg-white text-zinc-900 border border-zinc-200 rounded-tl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                      </div>
                      <span className="text-xs text-zinc-500 px-2">
                        {message.role === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500">
                      <SparklesIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex space-x-1.5">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 px-2">AI Assistant is typing...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="bg-white border-t border-zinc-200 px-6 py-4 shadow-lg">
              <div className="flex gap-3 items-end max-w-6xl mx-auto">
                <div className="flex-1 relative">
                  <div className="relative bg-zinc-50 border border-zinc-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => {
                        setInputMessage(e.target.value);
                        // Auto-resize textarea
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask me anything about interview preparation..."
                      className="w-full px-4 py-3 pr-20 bg-transparent border-0 rounded-xl focus:ring-0 focus:outline-none resize-none text-sm placeholder:text-zinc-400"
                      style={{ minHeight: '48px', maxHeight: '120px', overflowY: 'auto' }}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                      <button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`p-1.5 rounded-lg transition-all ${
                          isRecording
                            ? 'bg-red-500 text-white animate-pulse shadow-lg'
                            : 'bg-transparent text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
                        }`}
                        title={isRecording ? 'Stop recording' : 'Start voice input'}
                      >
                        <MicrophoneIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className={`p-1.5 rounded-lg transition-all ${
                          !inputMessage.trim() || isLoading
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
                        }`}
                        title="Send message"
                      >
                        <PaperAirplaneIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5 px-1">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

