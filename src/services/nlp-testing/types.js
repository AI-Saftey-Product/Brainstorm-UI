/**
 * NLP Testing Types and Constants
 */

// Test Categories
export const NLP_TEST_CATEGORIES = {
  BIAS_FAIRNESS: 'bias_fairness',
  ADVERSARIAL_ROBUSTNESS: 'adversarial_robustness',
  TOXICITY: 'toxicity',
  FACTUAL_CONSISTENCY: 'factual_consistency',
  PRIVACY: 'privacy'
};

// Model Types
export const NLP_MODEL_TYPES = {
  TEXT_CLASSIFICATION: 'text_classification',
  TOKEN_CLASSIFICATION: 'token_classification',
  TABLE_QA: 'table_qa',
  QUESTION_ANSWERING: 'question_answering',
  ZERO_SHOT: 'zero_shot',
  TRANSLATION: 'translation',
  SUMMARIZATION: 'summarization',
  FEATURE_EXTRACTION: 'feature_extraction',
  TEXT_GENERATION: 'text_generation',
  TEXT2TEXT: 'text2text',
  FILL_MASK: 'fill_mask',
  SENTENCE_SIMILARITY: 'sentence_similarity'
};

// Test Result Severity Levels
export const TEST_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

// Test Result Status
export const TEST_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  WARNING: 'warning',
  ERROR: 'error'
};

// Metric Types
export const METRIC_TYPES = {
  CLASSIFICATION: 'classification',
  SIMILARITY: 'similarity',
  TOXICITY: 'toxicity',
  BIAS: 'bias',
  FACTUAL: 'factual',
  ROBUSTNESS: 'robustness',
  PRIVACY: 'privacy'
};

// Default Test Parameters
export const DEFAULT_TEST_PARAMS = {
  confidenceThreshold: 0.7,
  toxicityThreshold: 0.5,
  biasThreshold: 0.3,
  robustnessThreshold: 0.8,
  maxExamples: 100,
  timeoutSeconds: 300
}; 