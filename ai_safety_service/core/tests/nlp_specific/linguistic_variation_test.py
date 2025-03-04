from typing import Any, Dict, List, Optional
from datetime import datetime
import random
import nltk
from nltk.corpus import wordnet
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.tag import pos_tag
from nltk.chunk import ne_chunk
from nltk.corpus import stopwords
# import spacy
from textblob import TextBlob
import re

from ...base import BaseTest, TestMetadata, TestResult, ModelAdapter

class LinguisticVariationTest(BaseTest):
    """Test for evaluating model performance across different linguistic variations."""
    
    def __init__(self):
        self._metadata = TestMetadata(
            id="nlp_1",
            name="Linguistic Variation Testing",
            description="Evaluates model performance across different linguistic variations and styles",
            category="NLP-Specific",
            severity="medium",
            model_type="text",
            supported_modalities=["text"]
        )
        self._download_nltk_data()
    
    @property
    def metadata(self) -> TestMetadata:
        return self._metadata
    
    async def setup(self) -> None:
        """Setup test environment."""
        pass
    
    async def teardown(self) -> None:
        """Cleanup test environment."""
        pass
    
    async def run(self, model: Any, parameters: Optional[Dict[str, Any]] = None) -> TestResult:
        """Run the linguistic variation test."""
        # Default parameters if none provided
        params = parameters or {
            "minConsistency": 0.85,
            "maxVariation": 0.15,
            "testCases": 5
        }
        
        # Test cases with linguistic variations
        test_cases = [
            {
                "input": "What is the capital of France?",
                "variations": [
                    {"style": "formal", "text": "Could you please inform me of the capital city of France?"},
                    {"style": "casual", "text": "Hey, what's the capital of France?"},
                    {"style": "technical", "text": "Please specify the administrative center of the French Republic."}
                ],
                "expected": "Paris"
            },
            {
                "input": "How tall is Mount Everest?",
                "variations": [
                    {"style": "formal", "text": "What is the elevation of Mount Everest above sea level?"},
                    {"style": "casual", "text": "How high is Mount Everest?"},
                    {"style": "technical", "text": "Please provide the precise altitude of Mount Everest in meters."}
                ],
                "expected": "8,848 meters"
            },
            {
                "input": "What is the largest planet in our solar system?",
                "variations": [
                    {"style": "formal", "text": "Which celestial body in our solar system possesses the greatest mass?"},
                    {"style": "casual", "text": "Which planet is the biggest in our solar system?"},
                    {"style": "technical", "text": "Identify the planet with the largest diameter in the solar system."}
                ],
                "expected": "Jupiter"
            }
        ]
        
        results = []
        total_consistency = 0
        total_variation = 0
        
        for case in test_cases:
            # Get predictions for each linguistic variation
            variation_predictions = []
            for var in case["variations"]:
                pred = await model.predict(var["text"])
                variation_predictions.append({
                    "variation": var,
                    "prediction": pred
                })
            
            # Calculate consistency and variation
            consistency = self._calculate_consistency(variation_predictions)
            variation = self._calculate_variation(variation_predictions)
            
            total_consistency += consistency
            total_variation += variation
            
            results.append({
                "input": case["input"],
                "variation_predictions": variation_predictions,
                "expected": case["expected"],
                "consistency": consistency,
                "variation": variation
            })
        
        # Calculate average metrics
        avg_consistency = total_consistency / len(test_cases)
        avg_variation = total_variation / len(test_cases)
        
        # Determine if test passed
        passed = (
            avg_consistency >= params["minConsistency"] and
            avg_variation <= params["maxVariation"]
        )
        
        # Generate recommendations
        recommendations = []
        if avg_consistency < params["minConsistency"]:
            recommendations.append("Model shows inconsistent performance across linguistic variations. Consider improving robustness to different styles.")
        if avg_variation > params["maxVariation"]:
            recommendations.append("Model exhibits high variation in responses. Consider implementing style normalization.")
        
        return TestResult(
            passed=passed,
            score=min(avg_consistency, 1 - avg_variation),
            message=f"Linguistic variation test {'passed' if passed else 'failed'} with consistency {avg_consistency:.2f} and variation {avg_variation:.2f}",
            metrics={
                "consistency": avg_consistency,
                "variation": avg_variation
            },
            cases=results,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
    
    def _calculate_consistency(self, predictions: List[Dict[str, Any]]) -> float:
        """Calculate consistency score across linguistic variations."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        if not predictions:
            return 0.0
        
        # Calculate consistency rate for each style
        style_consistency = {}
        for pred in predictions:
            style = pred["variation"]["style"]
            if style not in style_consistency:
                style_consistency[style] = {"consistent": 0, "total": 0}
            style_consistency[style]["total"] += 1
            if pred["prediction"] == predictions[0]["prediction"]:  # Compare with first prediction
                style_consistency[style]["consistent"] += 1
        
        # Calculate consistency as minimum consistency rate across styles
        consistency_rates = [
            stats["consistent"] / stats["total"]
            for stats in style_consistency.values()
        ]
        return min(consistency_rates) if consistency_rates else 0.0
    
    def _calculate_variation(self, predictions: List[Dict[str, Any]]) -> float:
        """Calculate variation score across linguistic variations."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        return 1.0 - self._calculate_consistency(predictions)
    
    def _download_nltk_data(self):
        """Download required NLTK data."""
        try:
            nltk.data.find('tokenizers/punkt')
            nltk.data.find('averaged_perceptron_tagger')
            nltk.data.find('maxent_ne_chunker')
            nltk.data.find('words')
            nltk.data.find('wordnet')
            nltk.data.find('stopwords')
        except LookupError:
            nltk.download('punkt')
            nltk.download('averaged_perceptron_tagger')
            nltk.download('maxent_ne_chunker')
            nltk.download('words')
            nltk.download('wordnet')
            nltk.download('stopwords')
    
    def _generate_variations(self, text: str) -> List[str]:
        """Generate various linguistic variations of the input text."""
        variations = []
        
        # Add different types of variations
        variations.extend([
            self._synonym_variation(text),
            self._paraphrase_variation(text),
            self._style_variation(text),
            self._tense_variation(text),
            self._voice_variation(text)
        ])
        
        return variations
    
    def _synonym_variation(self, text: str) -> str:
        """Replace words with synonyms."""
        words = word_tokenize(text)
        pos_tags = pos_tag(words)
        
        result = []
        for word, tag in pos_tags:
            if tag.startswith(('NN', 'VB', 'JJ', 'RB')):
                synsets = wordnet.synsets(word)
                if synsets:
                    synonyms = []
                    for synset in synsets:
                        synonyms.extend([lemma.name() for lemma in synset.lemmas()])
                    if synonyms:
                        word = random.choice(synonyms)
            result.append(word)
        
        return ' '.join(result)
    
    def _paraphrase_variation(self, text: str) -> str:
        """Generate paraphrases using NLTK."""
        tokens = word_tokenize(text)
        pos_tags = pos_tag(tokens)
        
        # Extract key phrases
        key_phrases = []
        current_phrase = []
        
        for word, tag in pos_tags:
            if tag.startswith('JJ') or tag.startswith('NN'):
                current_phrase.append(word)
            elif current_phrase:
                key_phrases.append(' '.join(current_phrase))
                current_phrase = []
        
        if current_phrase:  # Add the last phrase if it exists
            key_phrases.append(' '.join(current_phrase))
        
        # Generate variations
        variations = []
        for phrase in key_phrases:
            phrase_tokens = word_tokenize(phrase)
            phrase_pos = pos_tag(phrase_tokens)
            
            for word, pos in phrase_pos:
                if pos.startswith('NN') or pos.startswith('VB') or pos.startswith('JJ'):
                    synsets = wordnet.synsets(word)
                    if synsets:
                        synonyms = []
                        for synset in synsets:
                            synonyms.extend([lemma.name() for lemma in synset.lemmas()])
                        if synonyms:
                            variations.append(random.choice(synonyms))
        
        if variations:
            return ' '.join(variations)
        return text
    
    def _style_variation(self, text: str) -> str:
        """Generate style variations using TextBlob."""
        blob = TextBlob(text)
        
        # Convert to different styles
        styles = [
            lambda t: t.upper(),  # Formal
            lambda t: t.lower(),  # Informal
            lambda t: t.capitalize(),  # Title case
            lambda t: t.title()  # Title case with all words
        ]
        
        return random.choice(styles)(text)
    
    def _tense_variation(self, text: str) -> str:
        """Generate tense variations using NLTK."""
        tokens = word_tokenize(text)
        pos_tags = pos_tag(tokens)
        
        # Find verbs and change their tense
        result = []
        for word, tag in pos_tags:
            if tag.startswith('VB'):
                # Simple tense variation
                if tag == 'VBD':  # Past tense
                    # Convert to present - simple approach
                    if word.endswith('ed'):
                        word = word[:-2] + 's'  # Simple conversion attempt
                    else:
                        word = word + 's'  # Add 's' for present
                elif tag == 'VBZ' or tag == 'VBP':  # Present tense
                    # Convert to past - simple approach
                    if word.endswith('s'):
                        word = word[:-1] + 'ed'  # Simple conversion attempt
                    else:
                        word = word + 'ed'  # Add 'ed' for past
                result.append(word)
            else:
                result.append(word)
        
        return ' '.join(result)
    
    def _voice_variation(self, text: str) -> str:
        """Generate voice variations (active/passive) using NLTK."""
        tokens = word_tokenize(text)
        pos_tags = pos_tag(tokens)
        
        # Simple active/passive voice conversion
        if pos_tags and pos_tags[0][1].startswith('VB'):
            # Find a potential subject (first noun)
            subject = None
            for word, tag in pos_tags:
                if tag.startswith('NN'):
                    subject = word
                    break
                
            if subject:
                verb = pos_tags[0][0]
                # Get the last word as object (simplified)
                obj = tokens[-1] if len(tokens) > 2 else ""
                return f"{subject} was {verb} by {obj}"
        
        return text
    
    def _calculate_semantic_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity between two texts using NLTK/TextBlob."""
        # Use TextBlob for sentiment analysis
        blob1 = TextBlob(text1)
        blob2 = TextBlob(text2)
        
        # Extract words from each text
        words1 = set(word_tokenize(text1.lower()))
        words2 = set(word_tokenize(text2.lower()))
        
        # Calculate Jaccard similarity
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        similarity = intersection / union if union > 0 else 0.0
        
        # Normalize similarity score
        return max(0.0, min(1.0, similarity)) 