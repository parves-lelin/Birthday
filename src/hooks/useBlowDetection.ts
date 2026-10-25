import { useState, useEffect, useCallback, useRef } from 'react';

interface BlowDetectionResult {
  permissionError: boolean;
  isListening: boolean;
  micVolume: number;
  enableMic: () => Promise<void>;
}

export const useBlowDetection = (onBlow: () => void, enabled: boolean): BlowDetectionResult => {
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [isListening, setIsListening] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isBlowingRef = useRef(false);
  const onBlowRef = useRef(onBlow);
  const lastVolumeUpdateRef = useRef(0);
  const lastVolumeRef = useRef(0);

  // Keep callback ref fresh without restarting effects
  useEffect(() => {
    onBlowRef.current = onBlow;
  }, [onBlow]);

  const stopDetection = useCallback(() => {
    setIsListening(false);
    setMicVolume(0);
    lastVolumeRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => {
          t.stop();
        });
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
  }, []);

  const startDetection = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionError(true);
      return;
    }

    // Clean up any stale streams first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      // Request raw audio without aggressive voice filtering so air puffs are preserved
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        setPermissionError(true);
        return;
      }

      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.15; // Responsive to rapid breath changes
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const freqArray = new Uint8Array(analyser.frequencyBinCount);
      const timeArray = new Uint8Array(analyser.fftSize);

      let blowStreak = 0;
      let frameCount = 0;
      let rollingBaseline = 15;
      isBlowingRef.current = false;

      setIsListening(true);
      setPermissionError(false);

      const checkBlow = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;

        // Auto-resume if browser suspends AudioContext
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }

        analyser.getByteFrequencyData(freqArray);
        analyser.getByteTimeDomainData(timeArray);

        // 1. Low-frequency wind turbulence (Bins 0 to 3: ~0Hz to ~260Hz)
        // Air puffs produce immense energy in this specific sub-bass wind spectrum
        let lowEnergySum = 0;
        const lowBins = 4;
        for (let i = 0; i < lowBins; i++) {
          lowEnergySum += freqArray[i];
        }
        const lowEnergy = lowEnergySum / lowBins;

        // 2. Mid/High-frequency energy (Bins 6 to 24: ~500Hz to ~2000Hz)
        // Used to differentiate blowing from normal speaking or music
        let midEnergySum = 0;
        const midBins = 18;
        for (let i = 6; i < 6 + midBins; i++) {
          midEnergySum += freqArray[i];
        }
        const midEnergy = midEnergySum / midBins;

        // 3. RMS Amplitude (Volume dynamics)
        let sumSquare = 0;
        for (let i = 0; i < timeArray.length; i++) {
          const norm = (timeArray[i] - 128) / 128;
          sumSquare += norm * norm;
        }
        const rmsVolume = Math.sqrt(sumSquare / timeArray.length) * 100;

        // Overall visual meter level (0 to 100)
        const currentVisualLevel = Math.min(100, Math.round(Math.max(lowEnergy * 1.4, rmsVolume * 3.5)));

        // Throttle React state updates to ~12 FPS to avoid overloading the JS render thread
        const now = performance.now();
        if (now - lastVolumeUpdateRef.current > 80 || Math.abs(currentVisualLevel - lastVolumeRef.current) > 15) {
          lastVolumeUpdateRef.current = now;
          lastVolumeRef.current = currentVisualLevel;
          setMicVolume(currentVisualLevel);
        }

        // Adaptive noise floor calibration
        if (frameCount < 12) {
          rollingBaseline = (rollingBaseline * frameCount + lowEnergy) / (frameCount + 1);
          frameCount++;
        } else {
          // Slowly track ambient background music/room noise
          rollingBaseline = rollingBaseline * 0.98 + lowEnergy * 0.02;

          // A genuine blow creates a sharp low-frequency surge or high low-to-mid ratio
          const dynamicThreshold = Math.max(32, rollingBaseline + 18);
          const isLowFreqSurge = lowEnergy > dynamicThreshold && rmsVolume > 10;
          const isWindPuffRatio = lowEnergy > 26 && lowEnergy > midEnergy * 1.25 && rmsVolume > 8;

          if ((isLowFreqSurge || isWindPuffRatio) && !isBlowingRef.current) {
            blowStreak++;
            // Require 3 consecutive frames (~50ms) to prevent false clicks/taps
            if (blowStreak >= 3) {
              isBlowingRef.current = true;
              if (onBlowRef.current) {
                onBlowRef.current();
              }
              stopDetection();
              return;
            }
          } else {
            blowStreak = Math.max(0, blowStreak - 1);
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkBlow);
      };

      checkBlow();
    } catch (err) {
      console.warn('Microphone access issue:', err);
      setPermissionError(true);
      setIsListening(false);
    }
  }, [stopDetection]);

  // When cake stage is active, automatically start blow detection (mic was requested on site entry)
  useEffect(() => {
    let isCancelled = false;
    if (enabled) {
      isBlowingRef.current = false;
      const init = async () => {
        if (!isCancelled) {
          await startDetection();
        }
      };
      init();
    }

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close().catch(() => {});
        } catch {
          // ignore
        }
        audioContextRef.current = null;
      }
    };
  }, [enabled, startDetection]);

  // Resume suspended AudioContext if already initialized on user gestures
  useEffect(() => {
    if (!enabled) return;

    const handleUserGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    };

    window.addEventListener('click', handleUserGesture, { passive: true });
    window.addEventListener('touchstart', handleUserGesture, { passive: true });
    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
    };
  }, [enabled]);

  const handleExplicitEnableMic = useCallback(async () => {
    isBlowingRef.current = false;
    await startDetection();
  }, [startDetection]);

  return {
    permissionError,
    isListening: isListening && enabled,
    micVolume: enabled ? micVolume : 0,
    enableMic: handleExplicitEnableMic,
  };
};
