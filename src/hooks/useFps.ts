import { useEffect, useRef, useState } from 'react';

export function useFps() {
  const [fps, setFps] = useState(60);
  const [droppedFrames, setDroppedFrames] = useState(0);
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rAFRef = useRef<number | null>(null);
  
  // Running calculation of dropped frames
  // Whenever frame time is > 20ms (equivalent to < 50fps tick time), count as dropped frame
  const lastFrameTime = useRef(performance.now());

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      frameCount.current++;

      // Check for individual frame drops
      const deltaFrame = now - lastFrameTime.current;
      lastFrameTime.current = now;

      if (deltaFrame > 20) {
        setDroppedFrames(prev => prev + Math.floor(deltaFrame / 16.67) - 1);
      }

      // Check if one second has elapsed
      if (now - lastTime.current >= 1000) {
        const calculatedFps = Math.min(60, Math.round((frameCount.current * 1000) / (now - lastTime.current)));
        setFps(calculatedFps);
        
        frameCount.current = 0;
        lastTime.current = now;
      }

      rAFRef.current = requestAnimationFrame(tick);
    };

    rAFRef.current = requestAnimationFrame(tick);

    return () => {
      if (rAFRef.current !== null) {
        cancelAnimationFrame(rAFRef.current);
      }
    };
  }, []);

  return { fps, droppedFrames };
}
