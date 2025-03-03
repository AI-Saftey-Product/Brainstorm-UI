/**
 * Base Metrics for NLP Testing
 */

import { METRIC_TYPES } from '../types';

/**
 * Calculate classification metrics
 * @param {Array} predictions - Model predictions
 * @param {Array} labels - Ground truth labels
 * @returns {Object} Classification metrics
 */
export const calculateClassificationMetrics = (predictions, labels) => {
  if (!predictions || !labels || predictions.length !== labels.length) {
    throw new Error('Invalid input for classification metrics');
  }

  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] === 1 && labels[i] === 1) truePositives++;
    if (predictions[i] === 1 && labels[i] === 0) falsePositives++;
    if (predictions[i] === 0 && labels[i] === 0) trueNegatives++;
    if (predictions[i] === 0 && labels[i] === 1) falseNegatives++;
  }

  const accuracy = (truePositives + trueNegatives) / predictions.length;
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1 = 2 * (precision * recall) / (precision + recall) || 0;

  return {
    type: METRIC_TYPES.CLASSIFICATION,
    metrics: {
      accuracy,
      precision,
      recall,
      f1,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives
    }
  };
};

/**
 * Calculate cosine similarity between two vectors
 * @param {Array} vec1 - First vector
 * @param {Array} vec2 - Second vector
 * @returns {number} Cosine similarity score
 */
export const calculateCosineSimilarity = (vec1, vec2) => {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    throw new Error('Invalid input for cosine similarity');
  }

  const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));

  return dotProduct / (mag1 * mag2);
};

/**
 * Calculate Pearson correlation coefficient
 * @param {Array} x - First array of values
 * @param {Array} y - Second array of values
 * @returns {number} Correlation coefficient
 */
export const calculatePearsonCorrelation = (x, y) => {
  if (!x || !y || x.length !== y.length) {
    throw new Error('Invalid input for Pearson correlation');
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
  const sumY2 = y.reduce((acc, val) => acc + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return numerator / denominator;
};

/**
 * Calculate BLEU score (simplified version)
 * @param {string} reference - Reference text
 * @param {string} candidate - Candidate text
 * @returns {number} BLEU score
 */
export const calculateBLEUScore = (reference, candidate) => {
  if (!reference || !candidate) {
    throw new Error('Invalid input for BLEU score calculation');
  }

  const refWords = reference.toLowerCase().split(' ');
  const candWords = candidate.toLowerCase().split(' ');

  let matches = 0;
  for (const word of candWords) {
    if (refWords.includes(word)) {
      matches++;
    }
  }

  const precision = matches / candWords.length;
  const brevityPenalty = Math.exp(1 - refWords.length / candWords.length);

  return Math.min(1, precision * brevityPenalty);
};

/**
 * Calculate group disparity metrics
 * @param {Object} groupResults - Results grouped by demographic category
 * @returns {Object} Disparity metrics
 */
export const calculateGroupDisparity = (groupResults) => {
  if (!groupResults || Object.keys(groupResults).length === 0) {
    throw new Error('Invalid input for group disparity calculation');
  }

  const groups = Object.keys(groupResults);
  const metrics = {};
  let maxDisparity = 0;

  // Calculate metrics for each group
  for (const group of groups) {
    metrics[group] = calculateClassificationMetrics(
      groupResults[group].predictions,
      groupResults[group].labels
    ).metrics;
  }

  // Calculate disparities between groups
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const disparity = Math.abs(metrics[groups[i]].f1 - metrics[groups[j]].f1);
      maxDisparity = Math.max(maxDisparity, disparity);
    }
  }

  return {
    type: METRIC_TYPES.BIAS,
    metrics: {
      groupMetrics: metrics,
      maxDisparity,
      disparityThreshold: 0.1, // Configurable threshold
      hasSignificantDisparity: maxDisparity > 0.1
    }
  };
}; 