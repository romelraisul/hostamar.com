"use client";

import { useState } from 'react';

interface FeedbackButtonsProps {
  generationId: string;
  prompt: string;
  model: string;
  onFeedback?: (feedback: 'positive' | 'negative') => void;
}

export function FeedbackButtons({ generationId, prompt, model, onFeedback }: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFeedback = async (value: 'positive' | 'negative') => {
    if (feedback === value) return; // Prevent double-click
    
    setLoading(true);
    setFeedback(value);
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generation_id: generationId,
          prompt,
          model,
          feedback: value
        })
      });
      
      if (response.ok) {
        onFeedback?.(value);
        // Show toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-up';
        toast.textContent = value === 'positive' ? 'Thanks! 👍 Your feedback improves the model.' : 'Thanks! 👎 We\'ll do better.';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      } else {
        setFeedback(null);
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      setFeedback(null);
      console.error('Feedback error:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleFeedback('positive')}
        disabled={loading || feedback !== null}
        className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          feedback === 'positive'
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 disabled:opacity-50'
        }`}
        aria-label="Good result"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
        </svg>
        <span>Good</span>
      </button>
      
      <button
        onClick={() => handleFeedback('negative')}
        disabled={loading || feedback !== null}
        className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          feedback === 'negative'
            ? 'bg-red-100 text-red-700 border border-red-300'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 disabled:opacity-50'
        }`}
        aria-label="Bad result"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
        </svg>
        <span>Bad</span>
      </button>
      
      {feedback && (
        <span className="text-xs text-gray-500">
          {feedback === 'positive' ? '✓ Recorded' : '✓ Recorded'}
        </span>
      )}
    </div>
  );
}