'use client';

/**
 * Live interview capture + copilot transport.
 *
 * Encapsulates everything stateful and browser-specific — screen-share audio,
 * the AudioWorklet, the socket, teardown — so the page stays presentational.
 *
 * CAPTURE MODEL
 * The interviewer's voice arrives via `getDisplayMedia` on the meeting tab. The
 * candidate's own voice comes from `getUserMedia` on a SEPARATE track. That
 * separation is deliberate: it gives exact turn attribution without speaker
 * diarisation, which is expensive, slow, and unreliable on two-party audio.
 *
 * AUDIO RETENTION
 * Frames go worklet -> socket -> vendor. Nothing is accumulated here, and there
 * is no MediaRecorder anywhere in this file. Stopping tears down the tracks and
 * closes the AudioContext.
 *
 * BROWSER SUPPORT
 * Tab-audio capture is Chromium-only in practice, and `getDisplayMedia` needs a
 * secure context. Both are checked up front so the candidate is told plainly
 * rather than meeting a silent failure mid-interview.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '@/config/api';
import { getAuthTokenForSocket } from '@/services/liveInterviewApi';

const WORKLET_URL = '/pcm-worklet.js';

/** Human-readable reason capture cannot start, or null when it can. */
export function captureSupportProblem() {
  if (typeof window === 'undefined') return null;
  if (!window.isSecureContext) {
    return 'Live capture needs a secure (https) connection.';
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return 'This browser cannot share tab audio. Chrome, Edge or Brave on desktop can.';
  }
  if (typeof window.AudioWorkletNode === 'undefined') {
    return 'This browser does not support AudioWorklet, which the copilot needs.';
  }
  return null;
}

export function useLiveInterview(sessionId) {
  const [status, setStatus] = useState('idle'); // idle | connecting | live | stopped | error
  const [notice, setNotice] = useState(null); // { level, message }
  const [transcript, setTranscript] = useState([]); // { id, text, source, isFinal }
  const [coaching, setCoaching] = useState([]); // { question, output, pending }

  const socketRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamsRef = useRef([]);

  /** Tear down every capture resource. Safe to call repeatedly. */
  const teardown = useCallback(() => {
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => teardown, [teardown]);

  /** Wire one MediaStream through the worklet and out over the socket. */
  const pipeStream = useCallback(async (ctx, stream, source) => {
    const track = stream.getAudioTracks()[0];
    if (!track) return false;

    const node = new AudioWorkletNode(ctx, 'pcm-downsampler');
    node.port.onmessage = (event) => {
      // event.data is a transferred ArrayBuffer of 16-bit PCM.
      socketRef.current?.emit('audio-chunk', { chunk: event.data, source });
    };

    ctx.createMediaStreamSource(new MediaStream([track])).connect(node);
    // Intentionally NOT connected to ctx.destination — routing interviewer
    // audio back to the speakers would echo into the meeting.
    return true;
  }, []);

  const start = useCallback(
    async ({ includeMicrophone = true } = {}) => {
      const problem = captureSupportProblem();
      if (problem) {
        setStatus('error');
        setNotice({ level: 'error', message: problem });
        return false;
      }

      setStatus('connecting');
      setNotice(null);

      try {
        // ---- socket first: if the server refuses, never open a microphone ----
        const socket = io(`${API_URL}/interview-sessions`, {
          transports: ['websocket'],
          auth: { token: getAuthTokenForSocket() },
          query: { sessionId },
        });
        socketRef.current = socket;

        socket.on('transcript', (e) => {
          setTranscript((prev) => {
            // Partials replace the trailing partial from the same source;
            // finals append. Without this the panel flickers a new line per
            // partial, which is unreadable while someone is speaking.
            const last = prev[prev.length - 1];
            if (last && !last.isFinal && last.source === e.source) {
              return [...prev.slice(0, -1), { ...e, id: last.id }];
            }
            return [...prev, { ...e, id: `${Date.now()}-${prev.length}` }];
          });
        });

        socket.on('question-detected', (e) =>
          setCoaching((prev) => [...prev, { question: e.text, output: null, pending: true }]),
        );

        socket.on('coaching', (e) =>
          setCoaching((prev) => {
            const idx = [...prev].reverse().findIndex((c) => c.question === e.question && c.pending);
            if (idx === -1) return [...prev, { question: e.question, output: e.output, pending: false }];
            const at = prev.length - 1 - idx;
            const next = [...prev];
            next[at] = { ...next[at], output: e.output, pending: false };
            return next;
          }),
        );

        socket.on('notice', (e) => setNotice({ level: e.level || 'info', message: e.message }));

        const connected = await new Promise((resolve) => {
          socket.on('connected', () => resolve(true));
          socket.on('connect_error', () => resolve(false));
          socket.on('disconnect', () => resolve(false));
          setTimeout(() => resolve(false), 8000);
        });

        if (!connected) {
          teardown();
          setStatus('error');
          setNotice((n) => n || { level: 'error', message: 'Could not start the copilot session.' });
          return false;
        }

        // ---- capture ----
        // Chrome only offers tab audio when video is also requested; the video
        // track is stopped immediately since we never look at it.
        const display = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        });
        streamsRef.current.push(display);
        display.getVideoTracks().forEach((t) => t.stop());

        if (!display.getAudioTracks().length) {
          teardown();
          setStatus('error');
          setNotice({
            level: 'error',
            message:
              'No tab audio was shared. Re-share and tick "Also share tab audio", otherwise the copilot hears nothing.',
          });
          return false;
        }

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        await ctx.audioWorklet.addModule(WORKLET_URL);

        await pipeStream(ctx, display, 'INTERVIEWER');

        if (includeMicrophone) {
          try {
            const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamsRef.current.push(mic);
            await pipeStream(ctx, mic, 'CANDIDATE');
          } catch {
            // Not fatal: without the mic we still coach on the interviewer's
            // questions, which is the part that matters.
            setNotice({
              level: 'warn',
              message: 'Your microphone was not shared — your own answers will not be transcribed.',
            });
          }
        }

        // The candidate ending the share from Chrome's own bar must stop us too.
        display.getAudioTracks()[0].addEventListener('ended', () => {
          teardown();
          setStatus('stopped');
        });

        setStatus('live');
        return true;
      } catch (err) {
        teardown();
        setStatus('error');
        setNotice({
          level: 'error',
          message:
            err?.name === 'NotAllowedError'
              ? 'Screen sharing was declined, so there is nothing to listen to.'
              : err?.message || 'Could not start capture.',
        });
        return false;
      }
    },
    [sessionId, pipeStream, teardown],
  );

  const stop = useCallback(() => {
    socketRef.current?.emit('stop-recording');
    teardown();
    setStatus('stopped');
  }, [teardown]);

  /** Ask for coaching on a question typed by hand. */
  const askManually = useCallback((text) => {
    if (!text?.trim()) return;
    socketRef.current?.emit('manual-question', { text: text.trim() });
    setCoaching((prev) => [...prev, { question: text.trim(), output: null, pending: true }]);
  }, []);

  return { status, notice, transcript, coaching, start, stop, askManually };
}
