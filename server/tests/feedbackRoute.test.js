const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildInterviewFeedbackPrompt,
  normalizeInterviewFeedback,
} = require('../controllers/interviewController');

const interview = {
  role: 'Backend Developer',
  difficulty: 'Medium',
  questions: [
    { question: 'What is REST?', answer: 'REST is an HTTP-based architectural style.' },
    { question: 'How do you secure an API?', answer: 'Use HTTPS, auth tokens, and validation.' },
  ],
};

test('buildInterviewFeedbackPrompt includes every question and answer in a single payload', () => {
  const prompt = buildInterviewFeedbackPrompt(interview);

  assert.match(prompt, /What is REST\?/i);
  assert.match(prompt, /REST is an HTTP-based architectural style\./i);
  assert.match(prompt, /How do you secure an API\?/i);
  assert.match(prompt, /Use HTTPS, auth tokens, and validation\./i);
});

test('normalizeInterviewFeedback keeps the required feedback structure', () => {
  const normalized = normalizeInterviewFeedback({
    overallScore: 88,
    confidenceScore: 82,
    correctnessScore: 90,
    communicationScore: 84,
    questionWiseFeedback: [
      {
        questionNumber: 1,
        question: 'What is REST?',
        feedback: 'Strong understanding.',
      },
    ],
    overallSummary: 'Strong overall performance.',
  });

  assert.equal(normalized.overallScore, 88);
  assert.equal(normalized.confidenceScore, 82);
  assert.equal(normalized.correctnessScore, 90);
  assert.equal(normalized.communicationScore, 84);
  assert.equal(normalized.questionWiseFeedback.length, 1);
  assert.equal(normalized.overallSummary, 'Strong overall performance.');
});
