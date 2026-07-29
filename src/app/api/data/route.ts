import { NextRequest } from 'next/server';
import { generateSinglePoint } from '../../../lib/dataGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create SSE (Server-Sent Events) readable stream
  const stream = new ReadableStream({
    start(controller) {
      let count = 0;
      const maxTicks = 100; // Limit streaming session duration
      
      const interval = setInterval(() => {
        if (count >= maxTicks) {
          clearInterval(interval);
          controller.close();
          return;
        }

        const point = generateSinglePoint();
        const payload = `data: ${JSON.stringify(point)}\n\n`;
        
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Client disconnected
          clearInterval(interval);
          controller.close();
        }
        
        count++;
      }, 100);

      // Safeguard link closing on request aborted
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none'
    }
  });
}
