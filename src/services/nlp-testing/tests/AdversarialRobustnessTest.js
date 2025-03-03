/**
 * Adversarial Robustness Test
 */

import { BaseTest } from './BaseTest';
import { NLP_TEST_CATEGORIES, NLP_MODEL_TYPES, TEST_STATUS } from '../types';
import { calculateClassificationMetrics } from '../metrics/baseMetrics';

export class AdversarialRobustnessTest extends BaseTest {
  constructor(config = {}) {
    super({
      ...config,
      name: 'Adversarial Robustness Test',
      description: 'Tests model robustness against adversarial text manipulations',
      category: NLP_TEST_CATEGORIES.ADVERSARIAL_ROBUSTNESS,
      modelType: config.modelType || NLP_MODEL_TYPES.TEXT_CLASSIFICATION
    });

    this.params = {
      ...this.params,
      robustnessThreshold: config.params?.robustnessThreshold || 0.8,
      maxPerturbations: config.params?.maxPerturbations || 3,
      testCases: config.params?.testCases || this.getDefaultTestCases()
    };
  }

  /**
   * Get default test cases
   */
  getDefaultTestCases() {
    return [
      {
        text: "This is a great product that I highly recommend",
        label: 1,
        perturbations: [
          "Th1s is a gr8 product that I highly rec0mmend",
          "This is a great product that I highlyrecommend",
          "This is a great product that I highly recommend!!!"
        ]
      },
      {
        text: "The service was terrible and I want my money back",
        label: 0,
        perturbations: [
          "The service was terr1ble and I want my m0ney back",
          "The service was terrible andIwant my money back",
          "The service was terrible and I want my money back!!!"
        ]
      }
    ];
  }

  /**
   * Apply character-level perturbations
   * @param {string} text - Original text
   * @returns {string} Perturbed text
   */
  applyCharacterPerturbations(text) {
    const commonReplacements = {
      'a': '@', 'e': '3', 'i': '1', 'o': '0', 's': '5',
      'A': '4', 'E': '3', 'I': '1', 'O': '0', 'S': '5'
    };
    
    let perturbed = text.split('');
    let perturbCount = 0;
    
    for (let i = 0; i < perturbed.length && perturbCount < this.params.maxPerturbations; i++) {
      if (commonReplacements[perturbed[i]]) {
        perturbed[i] = commonReplacements[perturbed[i]];
        perturbCount++;
      }
    }
    
    return perturbed.join('');
  }

  /**
   * Apply word-level perturbations
   * @param {string} text - Original text
   * @returns {string} Perturbed text
   */
  applyWordPerturbations(text) {
    // Remove spaces between some words
    const words = text.split(' ');
    let perturbCount = 0;
    
    for (let i = 0; i < words.length - 1 && perturbCount < this.params.maxPerturbations; i++) {
      if (Math.random() < 0.3) {
        words[i] = words[i] + words[i + 1];
        words.splice(i + 1, 1);
        perturbCount++;
      }
    }
    
    return words.join(' ');
  }

  /**
   * Apply punctuation perturbations
   * @param {string} text - Original text
   * @returns {string} Perturbed text
   */
  applyPunctuationPerturbations(text) {
    const punctuations = ['!', '?', '.', '...'];
    let perturbed = text;
    
    for (let i = 0; i < this.params.maxPerturbations; i++) {
      const punct = punctuations[Math.floor(Math.random() * punctuations.length)];
      perturbed += punct;
    }
    
    return perturbed;
  }

  /**
   * Generate adversarial examples
   * @param {string} text - Original text
   * @returns {Array} Array of perturbed texts
   */
  generateAdversarialExamples(text) {
    return [
      this.applyCharacterPerturbations(text),
      this.applyWordPerturbations(text),
      this.applyPunctuationPerturbations(text)
    ];
  }

  /**
   * Run the adversarial robustness test
   * @param {Object} modelAdapter - Model adapter instance
   * @returns {Object} Test results
   */
  async run(modelAdapter) {
    try {
      await this.setup();
      this.log('Starting adversarial robustness test');

      const results = {
        originalPredictions: [],
        perturbedPredictions: [],
        robustnessScores: []
      };

      for (const testCase of this.params.testCases) {
        // Get prediction for original text
        const originalPrediction = await modelAdapter.getPrediction(testCase.text);
        results.originalPredictions.push({
          text: testCase.text,
          prediction: originalPrediction,
          label: testCase.label
        });

        // Generate and test adversarial examples
        const adversarialExamples = testCase.perturbations || 
          this.generateAdversarialExamples(testCase.text);

        for (const perturbedText of adversarialExamples) {
          const perturbedPrediction = await modelAdapter.getPrediction(perturbedText);
          results.perturbedPredictions.push({
            originalText: testCase.text,
            perturbedText,
            prediction: perturbedPrediction,
            label: testCase.label
          });
        }

        // Calculate robustness score for this test case
        const predictions = [originalPrediction.confidence];
        adversarialExamples.forEach(async (_, index) => {
          predictions.push(results.perturbedPredictions[index].prediction.confidence);
        });

        const robustnessScore = this.calculateRobustnessScore(predictions);
        results.robustnessScores.push(robustnessScore);
      }

      // Calculate overall robustness metrics
      const averageRobustness = results.robustnessScores.reduce((a, b) => a + b, 0) / 
        results.robustnessScores.length;

      this.status = averageRobustness >= this.params.robustnessThreshold ? 
        TEST_STATUS.PASSED : TEST_STATUS.FAILED;

      this.results = {
        ...results,
        averageRobustness,
        robustnessThreshold: this.params.robustnessThreshold,
        isPassing: this.status === TEST_STATUS.PASSED
      };

      this.log(`Test completed with status: ${this.status}`);
      return this.getReport();

    } catch (error) {
      this.error = error;
      this.status = TEST_STATUS.ERROR;
      this.log(`Test failed with error: ${error.message}`);
      throw error;
    } finally {
      await this.teardown();
    }
  }

  /**
   * Calculate robustness score based on prediction consistency
   * @param {Array} predictions - Array of confidence scores
   * @returns {number} Robustness score
   */
  calculateRobustnessScore(predictions) {
    if (!predictions || predictions.length < 2) return 0;

    const originalPrediction = predictions[0];
    const perturbedPredictions = predictions.slice(1);
    
    // Calculate average deviation from original prediction
    const deviations = perturbedPredictions.map(pred => 
      Math.abs(originalPrediction - pred));
    
    const averageDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    
    // Convert to robustness score (1 - averageDeviation)
    return Math.max(0, 1 - averageDeviation);
  }
} 