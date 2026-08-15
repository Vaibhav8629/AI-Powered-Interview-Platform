import test from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_BASE_API = process.env.VITE_BASE_API || 'http://localhost';

const { submitInterviewAndFeedback } = await import('../api.js');

test('submitInterviewAndFeedback completes the interview before requesting feedback once', async () => {
  const calls = [];
  const mockApi = {
    post: async (url) => {
      calls.push(url);

      if (url === '/api/interview/interview-123/complete') {
        return { data: { success: true, interviewId: 'interview-123' } };
      }

      if (url === '/api/interview/interview-123/feedback') {
        return {
          data: {
            success: true,
            feedback: {
              overallScore: 90,
              confidenceScore: 80,
              correctnessScore: 85,
              communicationScore: 88,
              questionWiseFeedback: [
                {
                  questionNumber: 1,
                  question: 'Why use React?',
                  feedback: 'Strong explanation.',
                  score: 92,
                },
              ],
              overallSummary: 'Very strong performance overall.',
            },
          },
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
  };

  const result = await submitInterviewAndFeedback(mockApi, 'interview-123');

  assert.deepEqual(calls, [
    '/api/interview/interview-123/complete',
    '/api/interview/interview-123/feedback',
  ]);
  assert.equal(result.feedback.overallScore, 90);
  assert.equal(result.feedback.questionWiseFeedback.length, 1);
});
