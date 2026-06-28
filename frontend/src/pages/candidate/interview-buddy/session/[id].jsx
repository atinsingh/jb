import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { interviewApi } from '@/lib/interview-api';
import { API_URL } from '@/config/api';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import {
  MicrophoneIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  StopIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// Scoring Visualization Component
function ScoringVisualization({ score }) {
  if (!score || !score.dimensionScores) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Overall Score
        </span>
        <div className="flex items-center gap-3">
          <div className="w-40 h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
              style={{ width: `${(score.overallScore / 5) * 100}%` }}
            />
          </div>
          <span className="text-lg font-bold text-primary-600 dark:text-primary-400 min-w-[3rem]">
            {score.overallScore.toFixed(1)}/5
          </span>
        </div>
      </div>

      {score.dimensionScores && score.dimensionScores.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            Dimension Scores
          </p>
          {score.dimensionScores.map((dim, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                  {dim.dimensionKey.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  {dim.score.toFixed(1)}/5
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
                  style={{ width: `${(dim.score / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {score.summary && (
        <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
            Summary
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{score.summary}</p>
        </div>
      )}

      {score.strengths && score.strengths.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold text-green-700 dark:text-green-300 mb-2 uppercase tracking-wider">
            Strengths
          </p>
          <ul className="list-disc list-inside space-y-1">
            {score.strengths.map((strength, idx) => (
              <li key={idx} className="text-sm text-green-600 dark:text-green-400">
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.weaknesses && score.weaknesses.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold text-orange-700 dark:text-orange-300 mb-2 uppercase tracking-wider">
            Areas for Improvement
          </p>
          <ul className="list-disc list-inside space-y-1">
            {score.weaknesses.map((weakness, idx) => (
              <li key={idx} className="text-sm text-orange-600 dark:text-orange-400">
                {weakness}
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.drills && score.drills.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wider">
            Practice Drills
          </p>
          <ul className="list-disc list-inside space-y-1">
            {score.drills.map((drill, idx) => (
              <li key={idx} className="text-sm text-blue-600 dark:text-blue-400">
                {drill}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function InterviewSession() {
  const router = useRouter();
  const { id } = router.query;
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [liveNoteText, setLiveNoteText] = useState('');
  const [coaching, setCoaching] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [scores, setScores] = useState([]);
  const [selectedTurnForScoring, setSelectedTurnForScoring] = useState(null);
  
  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    if (id) {
      loadSession();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [id]);

  // Setup WebSocket connection for Practice/Consent modes
  useEffect(() => {
    if (!id || !session) return;

    const isAudioMode = session.mode === 'PRACTICE' || session.mode === 'CONSENT';
    if (!isAudioMode || session.status !== 'IN_PROGRESS') return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    const socketUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const newSocket = io(`${socketUrl}/interview-sessions`, {
      auth: { token },
      query: { sessionId: id },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      toast.success('Connected to audio stream');
    });

    newSocket.on('connected', (data) => {
      console.log('WebSocket connected:', data);
    });

    newSocket.on('transcript', (data) => {
      setTurns((prev) => [
        ...prev,
        {
          _id: data.turnId,
          type: 'ANSWER',
          text: data.text,
          segments: data.segments,
          sttConfidence: data.confidence,
          createdAt: new Date(data.timestamp).toISOString(),
        },
      ]);
      setCurrentTranscript('');
      toast.success('Transcript received');
    });

    newSocket.on('transcript_segment', (data) => {
      if (data.text) {
        setCurrentTranscript(data.text);
      }
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast.error(error.message || 'WebSocket error');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      toast.info('Disconnected from audio stream');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [id, session]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const data = await interviewApi.getSession(id);
      setSession(data.session);
      setTurns(data.turns || []);
      setScores(data.scores || []);
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreTurn = async (turnId) => {
    try {
      const score = await interviewApi.scoreTurn(id, turnId);
      setScores((prev) => [...prev, score]);
      await loadSession();
      toast.success('Answer scored successfully!');
      setSelectedTurnForScoring(null);
    } catch (error) {
      toast.error(error.message || 'Failed to score answer');
    }
  };

  const handleStartSession = async () => {
    try {
      await interviewApi.startSession(id);
      await loadSession();
      toast.success('Session started!');
    } catch (error) {
      toast.error(error.message || 'Failed to start session');
    }
  };

  const handleAddLiveNote = async () => {
    if (!liveNoteText.trim()) {
      toast.error('Please enter a question');
      return;
    }

    try {
      const result = await interviewApi.addLiveNote(id, liveNoteText.trim());
      setTurns((prev) => [...prev, result.turn]);
      setCoaching(result.coaching);
      setLiveNoteText('');
      toast.success('Question added!');
    } catch (error) {
      toast.error(error.message || 'Failed to add question');
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        if (socket && isConnected) {
          socket.emit('audio_chunk', {
            audioData: arrayBuffer,
            startTime: Date.now() - audioBlob.size,
            endTime: Date.now(),
          });
        }

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info('Recording stopped');
    }
  };

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this session?')) {
      return;
    }

    if (isRecording) {
      handleStopRecording();
    }

    if (socket) {
      socket.disconnect();
    }

    try {
      await interviewApi.endSession(id);
      toast.success('Session ended');
      router.push('/candidate/interview-buddy');
    } catch (error) {
      toast.error(error.message || 'Failed to end session');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-900">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">Loading session...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-900">
          <div className="text-center">
            <p className="text-zinc-600 dark:text-zinc-400">Session not found</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isConsentMode = session.mode === 'CONSENT';
  const isLiveNotesMode = session.mode === 'LIVE_NOTES';
  const isPracticeMode = session.mode === 'PRACTICE';

  return (
    <DashboardLayout>
      <Head>
        <title>Interview Session - Jobocate</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
        {/* Consent Mode Banner - Always Visible */}
        {isConsentMode && (
          <div className="sticky top-0 z-50 bg-gradient-to-r from-accent-500 to-accent-600 text-white py-4 px-4 border-b-2 border-accent-700 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center gap-4">
              <ShieldCheckIcon className="w-7 h-7 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg">Consent Mode Enabled</p>
                <p className="text-sm text-accent-100 mt-0.5">
                  Audio recording is active. This session is being recorded for coaching purposes.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/candidate/interview-buddy')}
              className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Interview Buddy</span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 font-display">
                  {session.roleTitle}
                </h1>
                {session.companyName && (
                  <p className="text-lg text-zinc-600 dark:text-zinc-400">{session.companyName}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  {session.mode.replace('_', ' ')}
                </span>
                <button
                  onClick={handleEndSession}
                  className="px-5 py-2.5 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold transition-all"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>

          {/* Start Session Button (if not started) */}
          {session.status === 'CREATED' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8 mb-6"
            >
              <div className="text-center">
                <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
                  Ready to start your interview session?
                </p>
                <button
                  onClick={handleStartSession}
                  className="px-8 py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 flex items-center gap-3 mx-auto font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  <PlayIcon className="w-6 h-6" />
                  Start Session
                </button>
              </div>
            </motion.div>
          )}

          {/* Main Content */}
          {session.status === 'IN_PROGRESS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Transcript & Controls */}
              <div className="lg:col-span-2 space-y-6">
                {/* Audio Controls (Practice/Consent Mode) */}
                {(isPracticeMode || isConsentMode) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8"
                  >
                    <div className="flex flex-col items-center gap-6">
                      <button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        disabled={!isConnected && !isRecording}
                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                            : isConnected
                            ? 'bg-primary-500 hover:bg-primary-600'
                            : 'bg-zinc-400 cursor-not-allowed'
                        } text-white`}
                      >
                        {isRecording ? (
                          <StopIcon className="w-10 h-10" />
                        ) : (
                          <MicrophoneIcon className="w-10 h-10" />
                        )}
                      </button>
                      <div className="text-center">
                        <p className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
                          {isRecording
                            ? 'Recording...'
                            : isConnected
                            ? 'Click to start recording'
                            : 'Connecting...'}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {isRecording
                            ? 'Speak clearly into your microphone'
                            : isConnected
                            ? 'Ready to capture audio'
                            : 'Establishing connection'}
                        </p>
                        {!isConnected && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                            Waiting for WebSocket connection...
                          </p>
                        )}
                      </div>
                    </div>
                    {currentTranscript && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800"
                      >
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <span className="font-bold">Live transcript:</span> {currentTranscript}
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Live Notes Input (Live Notes Mode) */}
                {isLiveNotesMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6"
                  >
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">
                      Enter Interviewer Question
                    </label>
                    <textarea
                      value={liveNoteText}
                      onChange={(e) => setLiveNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleAddLiveNote();
                        }
                      }}
                      placeholder="Type the interviewer's question here... (Ctrl+Enter to submit)"
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white mb-4 placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 hover:border-zinc-400 dark:hover:border-zinc-600 resize-none"
                    />
                    <button
                      onClick={handleAddLiveNote}
                      disabled={!liveNoteText.trim()}
                      className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-sm hover:shadow-md"
                    >
                      Add Question & Get Coaching
                    </button>
                  </motion.div>
                )}

                {/* Transcript */}
                <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
                    Transcript
                  </h2>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {turns.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-zinc-500 dark:text-zinc-400">
                          No turns yet. {isLiveNotesMode ? 'Add a question to get started.' : 'Start recording to begin.'}
                        </p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {turns.map((turn) => {
                          const turnScore = scores.find((s) => s.turnId === turn._id);
                          const isAnswer = turn.type === 'ANSWER';
                          const canScore = isAnswer && !turnScore && session.status === 'IN_PROGRESS';
                          
                          return (
                            <motion.div
                              key={turn._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-5 rounded-xl border-l-4 ${
                                turn.type === 'QUESTION'
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                                  : turn.type === 'ANSWER'
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                  : 'bg-purple-50 dark:bg-purple-900/20 border-purple-500'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider px-2 py-1 bg-white dark:bg-zinc-800 rounded-lg">
                                  {turn.type}
                                </span>
                                <div className="flex items-center gap-2">
                                  {turnScore && (
                                    <div className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                                      <span className="text-xs font-bold text-primary-700 dark:text-primary-300">
                                        Score: {turnScore.overallScore?.toFixed(1) || 'N/A'}/5
                                      </span>
                                    </div>
                                  )}
                                  {canScore && (
                                    <button
                                      onClick={() => handleScoreTurn(turn._id)}
                                      className="text-xs px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-semibold transition-all"
                                    >
                                      Score
                                    </button>
                                  )}
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {new Date(turn.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                              <p className="text-zinc-900 dark:text-white leading-relaxed">{turn.text}</p>
                              {turnScore && turnScore.scoresJson && (
                                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                                  <ScoringVisualization score={turnScore.scoresJson} />
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Coaching Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 sticky top-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
                    AI Coaching
                  </h2>
                  {coaching ? (
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
                          Recommended Framework
                        </p>
                        <p className="text-zinc-900 dark:text-white font-semibold">
                          {coaching.recommendedFramework}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">
                          Answer Plan (60s)
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                          {coaching.answerPlanVariants?.[0]?.structure?.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                      {coaching.factCheck?.hasBlockingIssues && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                            ⚠️ Some claims need verification
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {isLiveNotesMode
                          ? 'Add a question to see coaching'
                          : 'Start the interview to see coaching'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
