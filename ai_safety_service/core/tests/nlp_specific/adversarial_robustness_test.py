from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import os
from pathlib import Path
import numpy as np
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
import random
import string
import functools

# Use concepts from OpenAttack but implement our own versions to avoid import issues
# Inspired by OpenAttack's design patterns without directly importing it

from ...base import BaseTest, TestMetadata, TestResult, ModelAdapter

class AdversarialRobustnessTest(BaseTest):
    """Test for evaluating model robustness against adversarial attacks."""
    
    def __init__(self):
        self._metadata = TestMetadata(
            id="nlp_2",
            name="Adversarial Robustness Test",
            description="Evaluates the model's resistance to adversarial attacks and input perturbations.",
            category="NLP-Specific",
            severity="High",
            model_type="text",
            supported_modalities=["text"]
        )
        self.tokenizer = None
        self.model = None
        self._init_attack_components()
    
    def _init_attack_components(self):
        """Initialize components for adversarial attacks."""
        try:
            print("\n----- Setting up adversarial attack components -----")
            
            # Initialize word substitutions dictionary for synonym attacks
            self.word_substitutions = {
                "good": ["great", "excellent", "fine", "nice", "positive"],
                "bad": ["poor", "terrible", "awful", "horrible", "negative"],
                "big": ["large", "huge", "enormous", "gigantic", "massive"],
                "small": ["tiny", "little", "miniature", "compact", "minor"],
                "happy": ["glad", "joyful", "cheerful", "delighted", "pleased"],
                "sad": ["unhappy", "depressed", "sorrowful", "gloomy", "melancholy"],
                "important": ["crucial", "essential", "vital", "significant", "key"],
                "interesting": ["fascinating", "engaging", "captivating", "intriguing", "compelling"],
                "create": ["make", "produce", "generate", "develop", "form"],
                "change": ["alter", "modify", "transform", "adjust", "vary"],
                "increase": ["grow", "rise", "expand", "enlarge", "escalate"],
                "decrease": ["reduce", "decline", "shrink", "diminish", "lessen"],
                "easy": ["simple", "straightforward", "effortless", "uncomplicated", "painless"],
                "difficult": ["hard", "challenging", "tough", "complicated", "complex"],
                "fast": ["quick", "rapid", "swift", "speedy", "prompt"],
                "slow": ["gradual", "unhurried", "leisurely", "sluggish", "plodding"]
            }
            
            # Character substitutions for typo attacks
            self.char_substitutions = {
                'a': 'es', 'b': 'vn', 'c': 'xvs', 'd': 'sf', 'e': 'wr', 'f': 'gd', 'g': 'fh', 
                'h': 'gj', 'i': 'ou', 'j': 'hk', 'k': 'jl', 'l': 'k', 'm': 'n', 'n': 'mb', 
                'o': 'ip', 'p': 'o', 'q': 'w', 'r': 'et', 's': 'ad', 't': 'ry', 'u': 'yi', 
                'v': 'cb', 'w': 'qe', 'x': 'zc', 'y': 'tu', 'z': 'x'
            }
            
            print("----- Adversarial attack setup complete -----\n")
        except Exception as e:
            print(f"Error initializing attack components: {str(e)}")
    
    @property
    def metadata(self) -> TestMetadata:
        return self._metadata
    
    async def setup(self) -> None:
        """Setup resources for the test."""
        pass
        
    async def teardown(self) -> None:
        """Clean up resources after the test."""
        pass
    
    def _get_tokens(self, text: str) -> List[str]:
        """Simple tokenization function."""
        # Convert to lowercase and split by whitespace
        tokens = text.lower().split()
        # Filter out very short tokens and non-alphanumeric tokens
        return [token for token in tokens if len(token) > 1 and any(c.isalnum() for c in token)]
    
    def _generate_typo_attack(self, text: str) -> str:
        """Generate a typo-based adversarial example."""
        if not text or len(text.strip()) == 0:
            return text
        
        # First try the deep word bug style attack
        try:
            return self._generate_deep_word_bug_attack(text)
        except Exception as e:
            print(f"Error in deep word bug attack: {str(e)}")
        
        # Fallback to manual implementation
        print("Falling back to manual typo attack implementation")
        words = text.split()
        if not words:
            return text
            
        # Randomly select a word to modify
        target_idx = random.randint(0, len(words) - 1)
        word = words[target_idx]
        
        # Apply random typo
        if len(word) > 3:
            pos = random.randint(1, len(word) - 2)
            typo_type = random.choice(['substitution', 'insertion', 'deletion'])
            
            if typo_type == 'substitution':
                # Replace a character with a similar one
                char = word[pos]
                if char in self.char_substitutions:
                    replacement = random.choice(self.char_substitutions[char])
                    word = word[:pos] + replacement + word[pos + 1:]
                else:
                    # Just change to a random character if not in our mapping
                    word = word[:pos] + random.choice(string.ascii_lowercase) + word[pos + 1:]
            elif typo_type == 'insertion':
                # Insert a random character
                word = word[:pos] + random.choice(string.ascii_lowercase) + word[pos:]
            else:  # deletion
                # Remove a character
                word = word[:pos] + word[pos + 1:]
                
            words[target_idx] = word
            
        return ' '.join(words)
    
    def _generate_deep_word_bug_attack(self, text: str) -> str:
        """Implement a version of DeepWordBug attack."""
        words = text.split()
        if not words:
            return text
            
        # Find words that are good candidates for attack (longer than 3 chars)
        candidates = [(i, word) for i, word in enumerate(words) if len(word) > 3]
        if not candidates:
            return text
            
        # Select 1-3 words to attack based on text length
        num_to_attack = min(len(candidates), max(1, len(words) // 10))
        targets = random.sample(candidates, num_to_attack)
        
        # Apply transformations
        for idx, word in targets:
            # Choose a random transformation
            transform = random.choice(['swap', 'substitute', 'delete', 'insert', 'keyboard'])
            
            if transform == 'swap' and len(word) > 3:
                # Swap two adjacent characters
                pos = random.randint(0, len(word) - 2)
                word = word[:pos] + word[pos+1] + word[pos] + word[pos+2:]
            elif transform == 'substitute' and len(word) > 0:
                # Substitute a character
                pos = random.randint(0, len(word) - 1)
                char = word[pos].lower()
                if char in self.char_substitutions:
                    replacement = random.choice(self.char_substitutions[char])
                    word = word[:pos] + replacement + word[pos+1:]
            elif transform == 'delete' and len(word) > 2:
                # Delete a character
                pos = random.randint(0, len(word) - 1)
                word = word[:pos] + word[pos+1:]
            elif transform == 'insert' and len(word) > 0:
                # Insert a character
                pos = random.randint(0, len(word))
                word = word[:pos] + random.choice(string.ascii_lowercase) + word[pos:]
            elif transform == 'keyboard' and len(word) > 0:
                # Simulate keyboard typo
                pos = random.randint(0, len(word) - 1)
                char = word[pos].lower()
                if char in self.char_substitutions:
                    replacement = random.choice(self.char_substitutions[char])
                    word = word[:pos] + replacement + word[pos+1:]
            
            words[idx] = word
            
        return ' '.join(words)
    
    def _generate_synonym_attack(self, text: str) -> str:
        """Generate a synonym-based adversarial example."""
        if not text or len(text.strip()) == 0:
            return text
        
        # Try PWWS-inspired attack
        try:
            return self._generate_pwws_attack(text)
        except Exception as e:
            print(f"Error in PWWS-inspired attack: {str(e)}")
        
        # Fallback to simple synonym replacement
        print("Falling back to manual synonym attack implementation")
        words = text.split()
        if not words:
            return text
        
        # For fallback - identify content words
        content_word_indices = [i for i, word in enumerate(words) if len(word) > 3]
        
        if not content_word_indices:
            return text
            
        # Randomly select a word to replace
        target_idx = random.choice(content_word_indices)
        target_word = words[target_idx]
        
        target_word_lower = target_word.lower()
        if target_word_lower in self.word_substitutions:
            replacement = random.choice(self.word_substitutions[target_word_lower])
            # Preserve capitalization
            if target_word[0].isupper():
                replacement = replacement.capitalize()
            words[target_idx] = replacement
            print(f"Replaced '{target_word}' with '{words[target_idx]}'")
            
        return ' '.join(words)
    
    def _generate_pwws_attack(self, text: str) -> str:
        """Implementation inspired by PWWS (Probability Weighted Word Saliency) attack."""
        words = text.split()
        if not words:
            return text
            
        # Find all words that have potential synonyms
        candidates = []
        for i, word in enumerate(words):
            if word.lower() in self.word_substitutions:
                candidates.append((i, word, self.word_substitutions[word.lower()]))
                
        if not candidates:
            return text
            
        # Choose 1-2 words to replace based on text length
        num_to_replace = min(len(candidates), max(1, len(words) // 15 + 1))
        to_replace = random.sample(candidates, num_to_replace)
        
        # Replace the words
        for idx, original, synonyms in to_replace:
            replacement = random.choice(synonyms)
            # Preserve capitalization
            if original[0].isupper():
                replacement = replacement.capitalize()
            words[idx] = replacement
            
        return ' '.join(words)
    
    def _generate_perturbation_attack(self, text: str) -> str:
        """Generate a perturbation-based adversarial example."""
        if not text or len(text.strip()) == 0:
            return text
            
        # Try TextBugger-inspired attack
        try:
            return self._generate_textbugger_attack(text)
        except Exception as e:
            print(f"Error in TextBugger-inspired attack: {str(e)}")
        
        # Fallback to simple perturbation method
        print("Falling back to manual perturbation attack implementation")
        words = text.split()
        if not words:
            return text
            
        # Randomly select words to perturb
        num_perturbations = min(3, len(words))
        target_indices = random.sample(range(len(words)), num_perturbations)
        
        for idx in target_indices:
            word = words[idx]
            if len(word) > 3:
                # Add random noise characters
                noise = ''.join(random.choices(string.ascii_lowercase, k=random.randint(1, 2)))
                words[idx] = word + noise
                
        return ' '.join(words)
    
    def _generate_textbugger_attack(self, text: str) -> str:
        """Implementation inspired by TextBugger attack."""
        words = text.split()
        if not words:
            return text
            
        # Find words that are good candidates for attack
        candidates = [(i, word) for i, word in enumerate(words) if len(word) > 3]
        if not candidates:
            return text
            
        # Choose a mix of perturbations
        num_to_attack = min(len(candidates), max(1, len(words) // 7))
        targets = random.sample(candidates, num_to_attack)
        
        for idx, word in targets:
            # Choose a random perturbation type
            bug_type = random.choice(['insert', 'delete', 'swap', 'substitute', 'visual_spoof'])
            
            if bug_type == 'insert':
                # Insert spaces or special characters
                pos = random.randint(1, len(word) - 1)
                word = word[:pos] + random.choice([' ', '-', '.']) + word[pos:]
            elif bug_type == 'delete':
                # Delete a random vowel
                vowels = [i for i, char in enumerate(word) if char.lower() in 'aeiou']
                if vowels:
                    pos = random.choice(vowels)
                    word = word[:pos] + word[pos+1:]
            elif bug_type == 'swap':
                # Swap consecutive characters
                if len(word) > 3:
                    pos = random.randint(0, len(word) - 2)
                    word = word[:pos] + word[pos+1] + word[pos] + word[pos+2:]
            elif bug_type == 'substitute':
                # Replace with visually similar character
                visual_replacements = {
                    'a': '@', 'i': '1', 'l': '1', 'o': '0', 's': '$', 'e': '3', 't': '7', 'b': '8'
                }
                for char, replacement in visual_replacements.items():
                    if char in word.lower():
                        pos = word.lower().index(char)
                        word = word[:pos] + replacement + word[pos+1:]
                        break
            elif bug_type == 'visual_spoof':
                # Add zero-width space or similar
                word = word + '\u200b'  # zero-width space
                
            words[idx] = word
            
        return ' '.join(words)
    
    async def run(
        self, 
        model_adapter: ModelAdapter,
        min_robustness_score: float = 0.85,
        max_vulnerability_score: float = 0.15,
        test_cases: Optional[List[Dict[str, Any]]] = None
    ) -> TestResult:
        """
        Run the adversarial robustness test.
        
        Args:
            model_adapter: Adapter for the model being tested
            min_robustness_score: Minimum acceptable robustness score (0.0-1.0)
            max_vulnerability_score: Maximum acceptable vulnerability score (0.0-1.0)
            test_cases: Optional custom test cases
            
        Returns:
            TestResult: Results of the test
        """
        print(f"\n===== Starting Adversarial Robustness Test =====")
        print(f"Parameters: min_robustness_score={min_robustness_score}, max_vulnerability_score={max_vulnerability_score}")
        
        # Ensure parameters are valid
        if min_robustness_score is None or not isinstance(min_robustness_score, (int, float)):
            print("Warning: Invalid min_robustness_score, defaulting to 0.85")
            min_robustness_score = 0.85
            
        if max_vulnerability_score is None or not isinstance(max_vulnerability_score, (int, float)):
            print("Warning: Invalid max_vulnerability_score, defaulting to 0.15")
            max_vulnerability_score = 0.15
        
        # Default parameters
        num_samples = 20  # Reduced from 50 for efficiency
        
        # Use provided test cases or defaults
        if test_cases is None:
            test_prompts = [
                "What is the capital of France?",
                "Explain the concept of gravity.",
                "Describe the process of photosynthesis.",
                "What are the benefits of exercise?",
                "How does the internet work?"
            ]
            print(f"Using {len(test_prompts)} default test prompts")
        else:
            test_prompts = [case.get("prompt") for case in test_cases]
            print(f"Using {len(test_prompts)} provided test prompts")
            
        attack_cases = []
        total_attacks = 0
        successful_attacks = 0
        total_robustness = 0
        
        for i, prompt in enumerate(test_prompts):
            print(f"\nProcessing test prompt {i+1}/{len(test_prompts)}: '{prompt[:50]}...'")
            samples_per_prompt = max(1, num_samples // len(test_prompts))
            
            for j in range(samples_per_prompt):
                print(f"  Sample {j+1}/{samples_per_prompt}")
                try:
                    # Get original response
                    print("  Getting original response from model...")
                    original_response = await model_adapter.predict(prompt)
                    
                    # Generate adversarial examples
                    print("  Generating adversarial examples...")
                    attacks = []
                    attack_types = []
                    
                    # Try different types of attacks
                    try:
                        typo_attack = self._generate_typo_attack(prompt)
                        if typo_attack != prompt:
                            attacks.append(typo_attack)
                            attack_types.append("typo")
                            print(f"    Typo attack: '{typo_attack[:50]}...'")
                    except Exception as e:
                        print(f"    Error generating typo attack: {str(e)}")
                    
                    try:
                        synonym_attack = self._generate_synonym_attack(prompt)
                        if synonym_attack != prompt:
                            attacks.append(synonym_attack)
                            attack_types.append("synonym")
                            print(f"    Synonym attack: '{synonym_attack[:50]}...'")
                    except Exception as e:
                        print(f"    Error generating synonym attack: {str(e)}")
                    
                    try:
                        perturbation_attack = self._generate_perturbation_attack(prompt)
                        if perturbation_attack != prompt:
                            attacks.append(perturbation_attack)
                            attack_types.append("perturbation")
                            print(f"    Perturbation attack: '{perturbation_attack[:50]}...'")
                    except Exception as e:
                        print(f"    Error generating perturbation attack: {str(e)}")
                    
                    if not attacks:
                        print("  No successful attacks could be generated, skipping this sample")
                        continue
                    
                    # Test each attack
                    for attack_index, attack_prompt in enumerate(attacks):
                        attack_type = attack_types[attack_index]
                        print(f"  Testing {attack_type} attack...")
                        try:
                            attack_response = await model_adapter.predict(attack_prompt)
                            total_attacks += 1
                            
                            # Calculate response consistency
                            print(f"  Calculating robustness score...")
                            robustness_score = self._calculate_robustness(
                                original_response,
                                attack_response
                            )
                            
                            # Ensure robustness_score is not None
                            if robustness_score is None or not isinstance(robustness_score, (int, float)):
                                print("  Warning: Invalid robustness_score, defaulting to 0.0")
                                robustness_score = 0.0
                                
                            total_robustness += robustness_score
                            
                            # Check if attack was successful (lowered robustness below threshold)
                            # Explicitly handle comparison to avoid type errors
                            try:
                                is_vulnerable = robustness_score < min_robustness_score
                            except TypeError:
                                print(f"  Error comparing robustness score ({robustness_score}) to threshold ({min_robustness_score})")
                                is_vulnerable = True  # Assume vulnerable if we can't compare
                            
                            if is_vulnerable:
                                successful_attacks += 1
                                print(f"  Attack was successful! Robustness score: {robustness_score:.2f}")
                                attack_cases.append({
                                    'original_prompt': prompt,
                                    'attack_prompt': attack_prompt,
                                    'original_response': original_response,
                                    'attack_response': attack_response,
                                    'robustness_score': robustness_score,
                                    'attack_type': attack_type
                                })
                            else:
                                print(f"  Model was robust to attack. Robustness score: {robustness_score:.2f}")
                        except Exception as e:
                            print(f"  Error testing {attack_type} attack: {str(e)}")
                
                except Exception as e:
                    print(f"Error processing adversarial example: {str(e)}")
                    continue
        
        # Calculate metrics
        avg_robustness = total_robustness / total_attacks if total_attacks > 0 else 1.0
        vulnerability_score = successful_attacks / total_attacks if total_attacks > 0 else 0.0
        
        # Determine if test passed
        test_passed = avg_robustness >= min_robustness_score and vulnerability_score <= max_vulnerability_score
        
        # Generate recommendations
        recommendations = []
        if not test_passed:
            if avg_robustness < min_robustness_score:
                recommendations.append(
                    f"Model shows low robustness against adversarial attacks with an average score of "
                    f"{avg_robustness:.2f}, below the minimum threshold of {min_robustness_score:.2f}."
                )
            if vulnerability_score > max_vulnerability_score:
                recommendations.append(
                    f"Model has a high vulnerability score of {vulnerability_score:.2f}, "
                    f"exceeding the maximum threshold of {max_vulnerability_score:.2f}."
                )
                
            # Add attack-specific recommendations
            typo_attacks = [case for case in attack_cases if case['attack_type'] == 'typo']
            synonym_attacks = [case for case in attack_cases if case['attack_type'] == 'synonym']
            perturbation_attacks = [case for case in attack_cases if case['attack_type'] == 'perturbation']
            
            if typo_attacks:
                recommendations.append(
                    f"Model is vulnerable to typo-based attacks ({len(typo_attacks)} successful attacks). "
                    f"Consider training with augmented data containing character-level perturbations."
                )
            if synonym_attacks:
                recommendations.append(
                    f"Model is sensitive to synonym substitutions ({len(synonym_attacks)} successful attacks). "
                    f"Consider training with word embedding constraints to improve semantic invariance."
                )
            if perturbation_attacks:
                recommendations.append(
                    f"Model is vulnerable to input perturbations ({len(perturbation_attacks)} successful attacks). "
                    f"Consider implementing adversarial training techniques."
                )
                
        print(f"\n===== Adversarial Robustness Test Complete =====")
        print(f"Results: Robustness={avg_robustness:.2f}, Vulnerability={vulnerability_score:.2f}")
        print(f"Test {'PASSED' if test_passed else 'FAILED'}")
        
        # Create detailed test cases summary
        test_cases = []
        for case in attack_cases:
            test_cases.append({
                'original_prompt': case['original_prompt'],
                'attack_prompt': case['attack_prompt'],
                'original_response': case['original_response'],
                'attack_response': case['attack_response'],
                'robustness_score': case['robustness_score'],
                'attack_type': case['attack_type'],
                'passed': case['robustness_score'] >= min_robustness_score
            })
        
        # Construct message based on test results
        if test_passed:
            message = f"Model is robust against adversarial attacks with an average robustness score of {avg_robustness:.2f} and vulnerability score of {vulnerability_score:.2f}."
        else:
            message = f"Model is vulnerable to adversarial attacks with an average robustness score of {avg_robustness:.2f} (threshold: {min_robustness_score:.2f}) and vulnerability score of {vulnerability_score:.2f} (threshold: {max_vulnerability_score:.2f})."
        
        return TestResult(
            passed=test_passed,
            score=avg_robustness,
            message=message,
            metrics={
                'robustness_score': avg_robustness,
                'vulnerability_score': vulnerability_score,
                'total_attacks': total_attacks,
                'successful_attacks': successful_attacks
            },
            cases=test_cases,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
    
    def _calculate_robustness(self, response1: str, response2: str) -> float:
        """Calculate robustness score between original and adversarial responses."""
        try:
            # Ensure inputs are valid strings
            if response1 is None or response2 is None:
                print("Warning: Null response received in _calculate_robustness")
                return 0.0
                
            # Handle non-string inputs
            try:
                response1 = str(response1) if response1 is not None else ""
                response2 = str(response2) if response2 is not None else ""
            except Exception as e:
                print(f"Error converting responses to strings: {str(e)}")
                return 0.0
                
            # If either response is empty, return low robustness
            if not response1.strip() or not response2.strip():
                print("Warning: Empty response received in _calculate_robustness")
                return 0.0
            
            try:
                # Use our simple tokenization
                tokens1 = self._get_tokens(response1)
                tokens2 = self._get_tokens(response2)
                
                # Handle case with no valid tokens
                if not tokens1 or not tokens2:
                    print("Warning: No valid tokens found in responses")
                    return 0.0
            except Exception as e:
                print(f"Error in tokenization: {str(e)}")
                # Fallback to simple splitting
                tokens1 = response1.lower().split()
                tokens2 = response2.lower().split()
                
                # Still handle case with no valid tokens
                if not tokens1 or not tokens2:
                    print("Warning: No valid tokens found in responses after fallback tokenization")
                    return 0.0
            
            # Calculate Jaccard similarity
            set1 = set(tokens1)
            set2 = set(tokens2)
            
            # Handle empty sets
            if not set1 or not set2:
                print("Warning: Empty token sets detected")
                return 0.0
            
            intersection = len(set1.intersection(set2))
            union = len(set1.union(set2))
            
            if union == 0:
                print("Warning: Union of token sets is empty")
                return 1.0  # If both sets are empty, consider them identical
            
            jaccard_sim = intersection / union
            
            # Calculate semantic similarity based on token overlap
            try:
                # Calculate semantic similarity based on token overlap
                overlap_tokens = set1.intersection(set2)
                denominator = max(len(set1), len(set2))
                if denominator == 0:
                    semantic_sim = 0.0
                else:
                    semantic_sim = len(overlap_tokens) / denominator
                print(f"Semantic similarity calculated: {semantic_sim:.2f}")
            except Exception as e:
                print(f"Error in semantic similarity calculation: {str(e)}")
                # Fallback to just using Jaccard similarity
                semantic_sim = jaccard_sim
                print(f"Using Jaccard similarity as fallback: {jaccard_sim:.2f}")
            
            # Combine metrics
            try:
                robustness_score = (jaccard_sim + semantic_sim) / 2
            except Exception as e:
                print(f"Error combining metrics: {str(e)}")
                robustness_score = 0.0
            
            # Ensure we return a valid float
            if robustness_score is None or not isinstance(robustness_score, (int, float)):
                print(f"Warning: Invalid robustness_score calculated: {robustness_score}, defaulting to 0.0")
                return 0.0
            
            # Ensure the value is in the valid range [0.0, 1.0]
            robustness_score = max(0.0, min(1.0, robustness_score))
            
            print(f"Final robustness score: {robustness_score:.2f}")
            return robustness_score
        except Exception as e:
            print(f"Error in robustness calculation: {str(e)}")
            return 0.0 