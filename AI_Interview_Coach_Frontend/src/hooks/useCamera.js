/**
 * useCamera.js — webcam + MediaPipe analysis hook
 *
 * Uses MediaPipe FaceMesh (for gaze/head-pose) and Pose (for posture & gesture)
 * loaded via CDN script tags injected at runtime — no bundler config needed.
 *
 * Gaze categories:    facing_camera | looking_side | looking_down | unknown
 * Posture categories: upright | leaning_forward | leaning_back | slouching | insufficient_visibility | unknown
 * Gesture categories: none | one_hand_raised | both_hands_raised | unknown
 *
 * IMPORTANT: All classifications are head-pose/body-pose estimates, NOT
 * precise eye-tracking. Unknown is returned whenever confidence is insufficient.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ── CDN URLs ──────────────────────────────────────────────────────────────────
const MP_FACE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js';
const MP_POSE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js';
const MP_CAM_URL  = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js';
const MP_DRAW_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js';

const LOADED_SCRIPTS = new Set();
function loadScript(src) {
  if (LOADED_SCRIPTS.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.crossOrigin = 'anonymous';
    s.onload = () => { LOADED_SCRIPTS.add(src); resolve(); };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// ── Gaze classification (head-pose based) ────────────────────────────────────
function classifyGaze(faceLandmarks) {
  if (!faceLandmarks || faceLandmarks.length === 0) return 'unknown';

  // Use nose tip (1), left eye outer (33), right eye outer (263), chin (152)
  const nose     = faceLandmarks[1];
  const leftEye  = faceLandmarks[33];
  const rightEye = faceLandmarks[263];
  const chin     = faceLandmarks[152];
  const forehead = faceLandmarks[10];

  if (!nose || !leftEye || !rightEye || !chin || !forehead) return 'unknown';

  const faceCenter = (leftEye.x + rightEye.x) / 2;
  const yawOffset  = nose.x - faceCenter;     // +ve = looking right, -ve = looking left
  const pitchRatio = (nose.y - forehead.y) / (chin.y - forehead.y); // ~0.5 = level

  const YAW_THRESHOLD   = 0.07;
  const PITCH_DOWN_THRESH = 0.60; // nose lower relative to face height

  if (Math.abs(yawOffset) > YAW_THRESHOLD) return 'looking_side';
  if (pitchRatio > PITCH_DOWN_THRESH)      return 'looking_down';
  return 'facing_camera';
}

// ── Posture classification (shoulder/hip landmarks) ───────────────────────────
function classifyPosture(poseLandmarks) {
  if (!poseLandmarks) return 'unknown';

  const ls = poseLandmarks[11]; // left shoulder
  const rs = poseLandmarks[12]; // right shoulder
  const lh = poseLandmarks[23]; // left hip
  const rh = poseLandmarks[24]; // right hip
  const nose = poseLandmarks[0];

  // Need at least shoulders visible with decent confidence
  if (!ls || !rs || ls.visibility < 0.4 || rs.visibility < 0.4) {
    return 'insufficient_visibility';
  }

  const shoulderMidX = (ls.x + rs.x) / 2;
  const shoulderMidY = (ls.y + rs.y) / 2;
  const shoulderWidth = Math.abs(ls.x - rs.x);

  // Hips visible?
  const hipsVisible = lh && rh && lh.visibility > 0.3 && rh.visibility > 0.3;
  const hipMidY = hipsVisible ? (lh.y + rh.y) / 2 : null;

  // Lean detection using shoulder tilt (y asymmetry normalised by shoulder width)
  const shoulderTilt = Math.abs(ls.y - rs.y) / (shoulderWidth + 0.001);

  if (shoulderTilt > 0.18) return 'slouching'; // significant tilt

  if (hipMidY !== null) {
    const torsoLength  = hipMidY - shoulderMidY;
    const noseToShoulder = nose ? (shoulderMidY - nose.y) : null;

    if (torsoLength > 0 && noseToShoulder !== null) {
      const forwardRatio = noseToShoulder / torsoLength;
      if (forwardRatio > 0.9) return 'leaning_forward';
      if (forwardRatio < 0.4) return 'leaning_back';
    }
  }

  return 'upright';
}

// ── Gesture classification (wrist positions relative to shoulders) ─────────────
function classifyGesture(poseLandmarks) {
  if (!poseLandmarks) return 'unknown';

  const ls = poseLandmarks[11]; // left shoulder
  const rs = poseLandmarks[12]; // right shoulder
  const lw = poseLandmarks[15]; // left wrist
  const rw = poseLandmarks[16]; // right wrist

  if (!ls || !rs) return 'unknown';

  const shoulderY    = (ls.y + rs.y) / 2;
  const RAISE_THRESH = 0.08; // wrist must be above shoulder by this margin

  const leftRaised  = lw && lw.visibility > 0.4 && (shoulderY - lw.y) > RAISE_THRESH;
  const rightRaised = rw && rw.visibility > 0.4 && (shoulderY - rw.y) > RAISE_THRESH;

  if (leftRaised && rightRaised) return 'both_hands_raised';
  if (leftRaised || rightRaised) return 'one_hand_raised';
  return 'none';
}

// ── Temporal smoother — returns the most common value over a sliding window ──
function createSmoother(windowSize = 5) {
  const buffer = [];
  return (value) => {
    buffer.push(value);
    if (buffer.length > windowSize) buffer.shift();
    const freq = {};
    buffer.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useCamera() {
  const [cameraState, setCameraState] = useState('idle'); // idle | loading | active | denied | error
  const [error,       setError]       = useState('');
  const [analysis,    setAnalysis]    = useState({
    gaze:         'unknown',
    posture:      'unknown',
    gesture:      'unknown',
    faceDetected: false,
    poseDetected: false,
  });

  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const faceMeshRef  = useRef(null);
  const poseRef      = useRef(null);
  const rafRef       = useRef(null);
  const mountedRef   = useRef(true);
  const observationsRef = useRef([]); // buffered observations for the session

  // Smoothers — avoid rapid jitter
  const gazeSmooth    = useRef(createSmoother(6));
  const postureSmooth = useRef(createSmoother(6));
  const gestureSmooth = useRef(createSmoother(4));

  // Latest raw landmark results (updated by MediaPipe callbacks)
  const faceResultRef = useRef(null);
  const poseResultRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    // Cancel animation frame
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    // Close MediaPipe
    faceMeshRef.current?.close?.();
    poseRef.current?.close?.();
    faceMeshRef.current = null;
    poseRef.current     = null;

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) { videoRef.current.srcObject = null; }
    if (mountedRef.current) setCameraState('idle');
  }, []);

  // ── Per-frame processing loop ──────────────────────────────────────────────
  const processFrame = useCallback(() => {
    if (!mountedRef.current || !videoRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) { rafRef.current = requestAnimationFrame(processFrame); return; }

    // Send frame to MediaPipe models
    try {
      faceMeshRef.current?.send?.({ image: video });
      poseRef.current?.send?.({ image: video });
    } catch (_) { /* ignore frame errors */ }

    // Classify from latest landmarks
    const faceLandmarks = faceResultRef.current?.multiFaceLandmarks?.[0] ?? null;
    const poseLandmarks = poseResultRef.current?.poseLandmarks ?? null;

    const rawGaze    = classifyGaze(faceLandmarks);
    const rawPosture = classifyPosture(poseLandmarks);
    const rawGesture = classifyGesture(poseLandmarks);

    const gaze    = gazeSmooth.current(rawGaze);
    const posture = postureSmooth.current(rawPosture);
    const gesture = gestureSmooth.current(rawGesture);

    const faceDetected = faceLandmarks !== null;
    const poseDetected = poseLandmarks !== null;

    if (mountedRef.current) {
      setAnalysis({ gaze, posture, gesture, faceDetected, poseDetected });
    }

    // Buffer observation every ~2 seconds (30fps → every 60 frames would be expensive; use time-based)
    observationsRef.current.push({
      ts: Math.floor(Date.now() / 1000),
      gaze, posture, gesture, faceDetected, poseDetected,
    });

    rafRef.current = requestAnimationFrame(processFrame);
  }, []);

  const startCamera = useCallback(async () => {
    if (cameraState === 'active' || cameraState === 'loading') return;
    setCameraState('loading');
    setError('');
    observationsRef.current = [];

    try {
      // Load MediaPipe scripts
      await Promise.all([
        loadScript(MP_FACE_URL),
        loadScript(MP_POSE_URL),
        loadScript(MP_DRAW_URL),
      ]);

      // Get camera permission
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
      } catch (permErr) {
        const denied = permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError';
        setCameraState(denied ? 'denied' : 'error');
        setError(denied
          ? 'Camera access denied. Please allow camera permission in your browser settings.'
          : `Camera error: ${permErr.message}`);
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialise FaceMesh
      const FaceMesh = window.FaceMesh;
      const Pose     = window.Pose;

      if (FaceMesh) {
        const faceMesh = new FaceMesh({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}` });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        faceMesh.onResults((results) => { faceResultRef.current = results; });
        await faceMesh.initialize();
        faceMeshRef.current = faceMesh;
      }

      if (Pose) {
        const pose = new Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}` });
        pose.setOptions({ modelComplexity: 0, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        pose.onResults((results) => { poseResultRef.current = results; });
        await pose.initialize();
        poseRef.current = pose;
      }

      if (mountedRef.current) {
        setCameraState('active');
        rafRef.current = requestAnimationFrame(processFrame);
      } else {
        // Component unmounted during async init — clean up
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err) {
      console.error('[useCamera] startCamera error:', err);
      if (mountedRef.current) {
        setCameraState('error');
        setError(`Failed to start camera: ${err.message}`);
      }
    }
  }, [cameraState, processFrame]);

  /** Drain buffered observations — caller should call this periodically */
  const drainObservations = useCallback(() => {
    const batch = [...observationsRef.current];
    observationsRef.current = [];
    return batch;
  }, []);

  return {
    cameraState,   // 'idle' | 'loading' | 'active' | 'denied' | 'error'
    error,
    analysis,      // { gaze, posture, gesture, faceDetected, poseDetected }
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    drainObservations,
  };
}
