from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import os
from pathlib import Path
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
# import spacy
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.tag import pos_tag
from nltk.chunk import ne_chunk
from nltk.corpus import stopwords

from ...base import BaseTest, TestMetadata, TestResult, ModelAdapter

class FactCCTest(BaseTest):
    """Test for factual consistency using FactCC metrics."""
    
    def __init__(self):
        self._metadata = TestMetadata(
            id="nlp_specific_3",
            name="FactCC Consistency",
            description="Evaluates factual consistency of model responses using FactCC metrics",
            category="NLP-Specific",
            severity="high",
            model_type="any",
            supported_modalities=["text"]
        )
        self.tokenizer = None
        self.model = None
        self._download_nltk_data()
    
    def _download_nltk_data(self):
        """Download required NLTK data."""
        try:
            nltk.data.find('tokenizers/punkt')
            nltk.data.find('averaged_perceptron_tagger')
            nltk.data.find('maxent_ne_chunker')
            nltk.data.find('words')
            nltk.data.find('stopwords')
        except LookupError:
            nltk.download('punkt')
            nltk.download('averaged_perceptron_tagger')
            nltk.download('maxent_ne_chunker')
            nltk.download('words')
            nltk.download('stopwords')
    
    @property
    def metadata(self) -> TestMetadata:
        return self._metadata
    
    async def setup(self) -> None:
        """Setup test environment."""
        # Load FactCC model and tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained("facebook/bart-large-cnn")
        self.model = AutoModelForSequenceClassification.from_pretrained("facebook/bart-large-cnn")
        
        # Load test cases
        self.test_cases = self._load_test_cases()
    
    async def teardown(self) -> None:
        """Cleanup test environment."""
        pass
    
    async def run(self, model: Any, parameters: Optional[Dict[str, Any]] = None) -> TestResult:
        """Run the fact consistency test."""
        if parameters is None:
            parameters = {}
        
        min_consistency = parameters.get("minConsistency", 0.8)
        min_coverage = parameters.get("minCoverage", 0.7)
        
        results = []
        total_cases = len(self.test_cases)
        consistent_count = 0
        total_consistency = 0
        total_coverage = 0
        
        for test_case in self.test_cases:
            # Get model response
            response = await model.predict(test_case["input"])
            
            # Evaluate consistency
            consistency_score = self._evaluate_consistency(response, test_case["reference"])
            total_consistency += consistency_score
            if consistency_score >= min_consistency:
                consistent_count += 1
            
            # Evaluate coverage
            coverage_score = self._evaluate_coverage(response, test_case["reference"])
            total_coverage += coverage_score
            
            # Store results
            results.append({
                "input": test_case["input"],
                "response": response,
                "reference": test_case["reference"],
                "consistencyScore": consistency_score,
                "coverageScore": coverage_score,
                "passed": consistency_score >= min_consistency and coverage_score >= min_coverage
            })
        
        # Calculate overall metrics
        consistency_rate = consistent_count / total_cases
        avg_consistency = total_consistency / total_cases
        avg_coverage = total_coverage / total_cases
        
        # Determine if test passed
        test_passed = consistency_rate >= min_consistency and avg_coverage >= min_coverage
        
        return TestResult(
            passed=test_passed,
            score=min(avg_consistency, avg_coverage),
            message=f"Test {'passed' if test_passed else 'failed'} with {consistency_rate:.2%} consistency and {avg_coverage:.2%} coverage",
            metrics={
                "consistencyRate": consistency_rate,
                "averageConsistency": avg_consistency,
                "averageCoverage": avg_coverage
            },
            cases=results,
            recommendations=self._generate_recommendations(
                consistency_rate, avg_coverage,
                min_consistency, min_coverage
            ),
            timestamp=datetime.now().isoformat()
        )
    
    def _load_test_cases(self) -> List[Dict[str, Any]]:
        """Load test cases for FactCC evaluation."""
        return [
            {
                "input": "What is the capital of France?",
                "reference": "Paris is the capital of France.",
                "category": "geography"
            },
            {
                "input": "Who wrote 'Romeo and Juliet'?",
                "reference": "William Shakespeare wrote 'Romeo and Juliet'.",
                "category": "literature"
            },
            {
                "input": "What is the chemical symbol for gold?",
                "reference": "The chemical symbol for gold is Au.",
                "category": "science"
            }
        ]
    
    def _evaluate_consistency(self, response: str, reference: str) -> float:
        """Evaluate factual consistency between response and reference."""
        # Tokenize inputs
        inputs = self.tokenizer(
            [response, reference],
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt"
        )
        
        # Get model predictions
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=1)
        
        # Calculate consistency score
        consistency_score = float(probs[0][1])  # Probability of being consistent
        
        return consistency_score
    
    def _evaluate_coverage(self, response: str, reference: str) -> float:
        """Evaluate information coverage between response and reference."""
        # Split into sentences
        response_sents = sent_tokenize(response)
        reference_sents = sent_tokenize(reference)
        
        # Extract key information using NLTK
        response_entities = self._extract_named_entities(response)
        reference_entities = self._extract_named_entities(reference)
        
        response_noun_phrases = self._extract_noun_phrases(response)
        reference_noun_phrases = self._extract_noun_phrases(reference)
        
        # Calculate coverage metrics
        entity_coverage = len(set(response_entities).intersection(set(reference_entities))) / len(set(reference_entities)) if set(reference_entities) else 0
        phrase_coverage = len(set(response_noun_phrases).intersection(set(reference_noun_phrases))) / len(set(reference_noun_phrases)) if set(reference_noun_phrases) else 0
        
        # Calculate sentence overlap
        response_words = set(response.lower().split())
        reference_words = set(reference.lower().split())
        word_coverage = len(response_words.intersection(reference_words)) / len(reference_words)
        
        # Combine metrics with weights
        weights = {
            "entity_coverage": 0.4,
            "phrase_coverage": 0.3,
            "word_coverage": 0.3
        }
        
        coverage_score = (
            weights["entity_coverage"] * entity_coverage +
            weights["phrase_coverage"] * phrase_coverage +
            weights["word_coverage"] * word_coverage
        )
        
        return coverage_score
    
    def _extract_named_entities(self, text):
        """Extract named entities using NLTK instead of spaCy."""
        tokens = word_tokenize(text)
        pos_tags = pos_tag(tokens)
        named_entities = ne_chunk(pos_tags)
        
        entities = []
        for chunk in named_entities:
            if hasattr(chunk, 'label'):
                entity_text = ' '.join(c[0] for c in chunk)
                entities.append(entity_text)
        
        return entities
    
    def _extract_noun_phrases(self, text):
        """Extract noun phrases using NLTK."""
        tokens = word_tokenize(text)
        pos_tags = pos_tag(tokens)
        
        noun_phrases = []
        current_phrase = []
        
        for word, tag in pos_tags:
            if tag.startswith('JJ') or tag.startswith('NN'):
                current_phrase.append(word)
            elif current_phrase:
                noun_phrases.append(' '.join(current_phrase))
                current_phrase = []
        
        if current_phrase:  # Add the last phrase if it exists
            noun_phrases.append(' '.join(current_phrase))
            
        return noun_phrases
    
    def _generate_recommendations(self, consistency: float, coverage: float,
                                min_consistency: float, min_coverage: float) -> List[str]:
        """Generate recommendations based on test results."""
        recommendations = []
        
        if consistency < min_consistency:
            recommendations.append(
                "Model shows low factual consistency. Consider implementing "
                "fact-checking and verification mechanisms."
            )
        
        if coverage < min_coverage:
            recommendations.append(
                "Model responses lack information coverage. Consider improving "
                "response generation to include more relevant details."
            )
        
        if consistency >= min_consistency and coverage >= min_coverage:
            recommendations.append(
                "Model performs well in both consistency and coverage. Consider "
                "expanding the test cases to cover more diverse topics."
            )
        
        return recommendations 