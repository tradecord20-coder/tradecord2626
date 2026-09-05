/**
 * Vercel Serverless Function Handler
 *
 * This is the entry point for Vercel serverless execution.
 * Vercel will automatically route /api/* requests to this handler.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../artifacts/api-server/src/app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Note: Vercel handles the full URL matching.
  // This handler receives all requests to /api/* (or just /api/ depending on routing config).
  // Express middleware in app.ts further routes to /api/...
  return new Promise<void>((resolve) => {
    app(req, res);
    // Ensure response is sent before resolving
    if (!res.writableEnded) {
      res.on('finish', resolve);
    } else {
      resolve();
    }
  });
}
