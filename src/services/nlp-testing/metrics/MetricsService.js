/**
 * Enhanced Metrics Service
 */

import { METRIC_TYPES } from '../types';
import {
  calculateClassificationMetrics,
  calculateCosineSimilarity,
  calculatePearsonCorrelation,
  calculateBLEUScore
} from './baseMetrics';

export class MetricsService {
  constructor(config = {}) {
    this.config = {
      perspectiveApiKey: config.perspectiveApiKey,
      factccModelPath: config.factccModelPath,
      summacModelPath: config.summacModelPath,
      ...config
    };
  }

  /**
   * Calculate WEAT (Word Embedding Association Test) score
   * @param {Array} targetWords1 - First set of target words
   * @param {Array} targetWords2 - Second set of target words
   * @param {Array} attributeWords1 - First set of attribute words
   * @param {Array} attributeWords2 - Second set of attribute words
   * @param {Object} embeddings - Word embeddings
   * @returns {Object} WEAT test results
   */
  calculateWEATScore(targetWords1, targetWords2, attributeWords1, attributeWords2, embeddings) {
    const results = {
      type: METRIC_TYPES.BIAS,
      weatScore: 0,
      pValue: 0,
      effectSize: 0
    };

    // Calculate mean cosine similarities
    const similarities1 = this.calculateGroupSimilarities(
      targetWords1,
      attributeWords1,
      attributeWords2,
      embeddings
    );

    const similarities2 = this.calculateGroupSimilarities(
      targetWords2,
      attributeWords1,
      attributeWords2,
      embeddings
    );

    // Calculate test statistic
    const testStatistic = similarities1.mean - similarities2.mean;
    
    // Calculate effect size
    const pooledStd = Math.sqrt(
      (similarities1.variance + similarities2.variance) / 2
    );
    results.effectSize = testStatistic / pooledStd;

    // Calculate p-value using permutation test
    results.pValue = this.calculatePermutationTest(
      [...targetWords1, ...targetWords2],
      similarities1.raw.concat(similarities2.raw)
    );

    results.weatScore = testStatistic;
    return results;
  }

  /**
   * Calculate group similarities for WEAT
   * @param {Array} targetWords - Target words
   * @param {Array} attributeWords1 - First set of attribute words
   * @param {Array} attributeWords2 - Second set of attribute words
   * @param {Object} embeddings - Word embeddings
   * @returns {Object} Similarity statistics
   */
  calculateGroupSimilarities(targetWords, attributeWords1, attributeWords2, embeddings) {
    const similarities = targetWords.map(target => {
      const simAttr1 = attributeWords1.map(attr => 
        calculateCosineSimilarity(embeddings[target], embeddings[attr])
      );
      const simAttr2 = attributeWords2.map(attr => 
        calculateCosineSimilarity(embeddings[target], embeddings[attr])
      );
      
      return (
        simAttr1.reduce((a, b) => a + b, 0) / simAttr1.length -
        simAttr2.reduce((a, b) => a + b, 0) / simAttr2.length
      );
    });

    return {
      raw: similarities,
      mean: similarities.reduce((a, b) => a + b, 0) / similarities.length,
      variance: this.calculateVariance(similarities)
    };
  }

  /**
   * Calculate variance of an array
   * @param {Array} array - Input array
   * @returns {number} Variance
   */
  calculateVariance(array) {
    const mean = array.reduce((a, b) => a + b, 0) / array.length;
    return array.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / array.length;
  }

  /**
   * Calculate permutation test p-value
   * @param {Array} words - All words
   * @param {Array} similarities - All similarities
   * @returns {number} P-value
   */
  calculatePermutationTest(words, similarities, iterations = 10000) {
    const observed = Math.abs(similarities.reduce((a, b) => a + b, 0));
    let exceeds = 0;

    for (let i = 0; i < iterations; i++) {
      // Shuffle similarities
      const shuffled = [...similarities].sort(() => Math.random() - 0.5);
      const permScore = Math.abs(shuffled.reduce((a, b) => a + b, 0));
      if (permScore >= observed) {
        exceeds++;
      }
    }

    return exceeds / iterations;
  }

  /**
   * Calculate toxicity scores using Perspective API
   * @param {string} text - Input text
   * @returns {Object} Toxicity scores
   */
  async calculateToxicityScores(text) {
    if (!this.config.perspectiveApiKey) {
      throw new Error('Perspective API key not configured');
    }

    const response = await fetch('https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.perspectiveApiKey}`
      },
      body: JSON.stringify({
        comment: { text },
        languages: ['en'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          IDENTITY_ATTACK: {},
          INSULT: {},
          THREAT: {},
          PROFANITY: {}
        }
      })
    });

    const data = await response.json();
    return {
      type: METRIC_TYPES.TOXICITY,
      scores: Object.entries(data.attributeScores).reduce((acc, [key, value]) => {
        acc[key.toLowerCase()] = value.summaryScore.value;
        return acc;
      }, {})
    };
  }

  /**
   * Calculate factual consistency using entailment model
   * @param {string} claim - Claim to verify
   * @param {string} evidence - Evidence text
   * @returns {Object} Factual consistency scores
   */
  async calculateFactualConsistency(claim, evidence) {
    // Load FactCC or SummaC model
    const model = await this.loadEntailmentModel();
    
    const results = {
      type: METRIC_TYPES.FACTUAL,
      entailmentScore: 0,
      contradictionScore: 0,
      neutralScore: 0
    };

    // Get model predictions
    const prediction = await model.predict(claim, evidence);
    
    results.entailmentScore = prediction.entailment;
    results.contradictionScore = prediction.contradiction;
    results.neutralScore = prediction.neutral;

    return results;
  }

  /**
   * Calculate robustness score under adversarial attacks
   * @param {Object} originalResults - Original test results
   * @param {Object} perturbedResults - Results after perturbation
   * @returns {Object} Robustness metrics
   */
  calculateRobustnessMetrics(originalResults, perturbedResults) {
    const results = {
      type: METRIC_TYPES.ROBUSTNESS,
      performanceDrop: 0,
      consistencyScore: 0,
      vulnerableExamples: []
    };

    // Calculate performance drop
    const originalPerformance = originalResults.accuracy;
    const perturbedPerformance = perturbedResults.accuracy;
    results.performanceDrop = Math.max(0, originalPerformance - perturbedPerformance);

    // Calculate prediction consistency
    const totalExamples = originalResults.predictions.length;
    let consistentPredictions = 0;

    for (let i = 0; i < totalExamples; i++) {
      if (originalResults.predictions[i] === perturbedResults.predictions[i]) {
        consistentPredictions++;
      } else {
        results.vulnerableExamples.push({
          index: i,
          originalPrediction: originalResults.predictions[i],
          perturbedPrediction: perturbedResults.predictions[i]
        });
      }
    }

    results.consistencyScore = consistentPredictions / totalExamples;
    return results;
  }

  /**
   * Calculate translation metrics
   * @param {string} reference - Reference translation
   * @param {string} candidate - Candidate translation
   * @returns {Object} Translation metrics
   */
  calculateTranslationMetrics(reference, candidate) {
    return {
      type: METRIC_TYPES.TRANSLATION,
      bleu: calculateBLEUScore(reference, candidate),
      // Add other translation metrics as needed
    };
  }

  /**
   * Calculate privacy risk score
   * @param {string} text - Input text
   * @param {Array} sensitivePatterns - Patterns to check
   * @returns {Object} Privacy risk metrics
   */
  calculatePrivacyRisk(text, sensitivePatterns) {
    const results = {
      type: METRIC_TYPES.PRIVACY,
      riskScore: 0,
      exposedPatterns: []
    };

    let matches = 0;
    for (const pattern of sensitivePatterns) {
      const regex = new RegExp(pattern, 'gi');
      const found = text.match(regex);
      if (found) {
        matches += found.length;
        results.exposedPatterns.push({
          pattern,
          matches: found
        });
      }
    }

    results.riskScore = Math.min(1, matches * 0.2);
    return results;
  }
} 