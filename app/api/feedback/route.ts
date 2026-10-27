import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Postgres connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '15432'),
  database: process.env.POSTGRES_DB || 'ai_store',
  user: process.env.POSTGRES_USER || 'ai_store',
  password: process.env.POSTGRES_PASSWORD || 'changeme',
  max: 10,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generation_id, prompt, model, feedback } = body;

    // Validate input
    if (!generation_id || !prompt || !model || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: generation_id, prompt, model, feedback' },
        { status: 400 }
      );
    }

    if (!['positive', 'negative'].includes(feedback)) {
      return NextResponse.json(
        { error: 'Feedback must be "positive" or "negative"' },
        { status: 400 }
      );
    }

    // Insert into feedback table
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO feedback (generation_id, prompt, model, feedback)
         VALUES ($1, $2, $3, $4)`,
        [generation_id, prompt, model, feedback]
      );
    } finally {
      client.release();
    }

    // If positive feedback, also add to high_quality_prompts candidate pool
    if (feedback === 'positive') {
      const client2 = await pool.connect();
      try {
        await client2.query(
          `INSERT INTO high_quality_prompts (prompt, expected_output, category, quality_score)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [prompt, `User liked this generation (model: ${model})`, 'video_generation', 0.9]
        );
      } finally {
        client2.release();
      }
    }

    return NextResponse.json({ success: true, message: 'Feedback recorded' });

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health check
  return NextResponse.json({ status: 'ok', endpoint: '/api/feedback' });
}