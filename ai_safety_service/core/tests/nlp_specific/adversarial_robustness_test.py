from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import os
from pathlib import Path
import numpy as np
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
# import spacy
from nltk.tokenize import word_tokenize, sent_tokenize
# Import the standard English POS tagger
from nltk.tag import pos_tag as original_pos_tag
from nltk.chunk import ne_chunk
from nltk.corpus import stopwords
from nltk.corpus import wordnet
import nltk
import random
import string
import functools

# Make sure NLTK data path is properly set
nltk.data.path.append(os.path.join(os.path.expanduser("~"), "nltk_data"))

# Create a patched version of pos_tag that handles exceptions
def patched_pos_tag(tokens, tagset=None, lang=None):
    """
    A patched version of NLTK's pos_tag that handles specific errors.
    """
    if not tokens:
        return []
        
    try:
        # Don't try to use language-specific taggers, which often don't exist
        # Always use the standard tagger instead
        print(f"Using standard POS tagger (ignoring lang={lang})")
        
        # Check the signature of original_pos_tag
        import inspect
        sig = inspect.signature(original_pos_tag)
        params = list(sig.parameters.keys())
        
        # Call with appropriate parameters based on signature
        if len(params) >= 3 and 'lang' in params:
            # Use default language (usually 'eng')
            return original_pos_tag(tokens, tagset)
        else:
            # Older versions might not have lang parameter
            return original_pos_tag(tokens, tagset)
            
    except LookupError as e:
        # Force download of the standard tagger
        print(f"POS tagger lookup error: {str(e)}. Attempting to download standard tagger.")
        nltk.download('averaged_perceptron_tagger', quiet=True)
        # Try again with the standard tagger
        try:
            return original_pos_tag(tokens)
        except Exception as inner_e:
            print(f"Still couldn't tag after download attempt: {str(inner_e)}")
            return [(token, 'NN') for token in tokens]  # Default to nouns
    except Exception as e:
        # For other exceptions, just return basic tags
        print(f"POS tagging error: {str(e)}")
        return [(token, 'NN') for token in tokens]  # Default to treating everything as a noun

# Replace the original pos_tag with our patched version
pos_tag = patched_pos_tag

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
        self._download_nltk_data()
    
    def _download_nltk_data(self):
        """Download required NLTK data."""
        print("\n----- Downloading NLTK resources for Adversarial Robustness Test -----")
        
        # Check for and clear any existing errors related to the problematic tagger
        print("Clearing any existing NLTK data errors...")
        try:
            nltk.data._errors = [err for err in nltk.data._errors 
                                if 'averaged_perceptron_tagger_eng' not in err]
        except:
            # If _errors doesn't exist or can't be modified, just continue
            pass
        
        # Map of required resources and their potential alternatives
        resources_map = {
            'punkt': ['tokenizers/punkt'],
            'averaged_perceptron_tagger': ['taggers/averaged_perceptron_tagger'],
            'maxent_ne_chunker': ['chunkers/maxent_ne_chunker'],
            'words': ['corpora/words'],
            'stopwords': ['corpora/stopwords'],
            'wordnet': ['corpora/wordnet']
        }
        
        # Download each resource
        for resource_name, resource_paths in resources_map.items():
            try:
                print(f"Checking for NLTK resource: {resource_name}")
                try:
                    # Try to find the resource
                    for path in resource_paths:
                        try:
                            nltk.data.find(path)
                            print(f"  Found resource at {path}")
                            break
                        except LookupError:
                            continue
                    else:
                        raise LookupError(f"Could not find {resource_name} in any of the expected paths")
                except LookupError:
                    # Resource not found, download it
                    print(f"  Resource {resource_name} not found, downloading...")
                    nltk.download(resource_name, quiet=False)
                    print(f"  Successfully downloaded {resource_name}")
            except Exception as e:
                print(f"  WARNING: Error handling NLTK resource {resource_name}: {str(e)}")
        
        # If someone tries to use the non-existent resource, handle it specifically
        print("\nCreating explicit handling for 'averaged_perceptron_tagger_eng'")
        print("This resource doesn't exist in NLTK but is sometimes incorrectly referenced")
        
        # Store the original find method BEFORE defining the replacement
        original_find = nltk.data.find
        
        # Create a custom finder function that redirects to the standard tagger
        def find_replacement(resource_name, paths=None):
            # Get information about the original function
            import inspect
            try:
                original_sig = inspect.signature(original_find)
                print(f"Original find signature: {original_sig}")
            except Exception as e:
                print(f"Couldn't inspect original find: {e}")
            
            if resource_name == 'taggers/averaged_perceptron_tagger_eng':
                print("Redirecting request for non-existent 'averaged_perceptron_tagger_eng' to standard tagger")
                # Use the same paths argument when redirecting
                return original_find('taggers/averaged_perceptron_tagger', paths)
            else:
                # Use the original find method for other resources
                return original_find(resource_name, paths)
        
        # Replace with our custom version
        nltk.data.find = find_replacement
        
        print("----- NLTK resource setup complete for Adversarial Robustness Test -----\n")
    
    @property
    def metadata(self) -> TestMetadata:
        return self._metadata
    
    async def setup(self) -> None:
        """Initialize model and NLP tools."""
        # Download required NLTK data if not already done in __init__
        self._download_nltk_data()
    
    async def teardown(self) -> None:
        """Clean up resources."""
        torch.cuda.empty_cache()
    
    def _generate_typo_attack(self, text: str) -> str:
        """Generate a typo-based adversarial example."""
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
                similar_chars = {
                    'a': 'e', 'e': 'a', 'i': 'y', 'o': 'u', 'u': 'o',
                    's': 'z', 'z': 's', 'b': 'v', 'v': 'b', 'n': 'm', 'm': 'n'
                }
                char = word[pos]
                if char in similar_chars:
                    word = word[:pos] + similar_chars[char] + word[pos + 1:]
            elif typo_type == 'insertion':
                # Insert a random character
                word = word[:pos] + random.choice(string.ascii_lowercase) + word[pos:]
            else:  # deletion
                # Remove a character
                word = word[:pos] + word[pos + 1:]
                
            words[target_idx] = word
            
        return ' '.join(words)
    
    def _generate_synonym_attack(self, text: str) -> str:
        """Generate a synonym-based adversarial example using NLTK instead of spaCy."""
        if text is None:
            print("Warning: Received None text in synonym attack")
            return ""
            
        try:
            words = text.split()
            if not words:
                return text
                
            try:
                print("Attempting POS tagging for synonym attack...")
                # Explicitly use the standard English tagger
                tagged_words = pos_tag(words)
                print(f"POS tagging successful. First few tags: {tagged_words[:min(3, len(tagged_words))]}")
                replaceable_indices = [
                    i for i, (word, pos) in enumerate(tagged_words)
                    if pos in ['JJ', 'NN', 'NNS'] and word.lower() not in stopwords.words('english')
                ]
            except Exception as e:
                print(f"Error during POS tagging in synonym attack: {str(e)}")
                # Fallback: treat all non-stopwords as replaceable
                try:
                    stop_words = set(stopwords.words('english'))
                except Exception as stop_e:
                    print(f"Error loading stopwords: {stop_e}. Using empty stopword list.")
                    stop_words = set()
                    
                replaceable_indices = [
                    i for i, word in enumerate(words)
                    if word.lower() not in stop_words and len(word) > 3
                ]
                print(f"Using fallback method. Found {len(replaceable_indices)} replaceable words.")
            
            if not replaceable_indices:
                print("No replaceable words found in text.")
                return text
                
            # Randomly select a word to replace
            target_idx = random.choice(replaceable_indices)
            target_word = words[target_idx]
            
            try:
                # Find synonyms using WordNet
                synonyms = []
                for synset in wordnet.synsets(target_word):
                    for lemma in synset.lemmas():
                        if lemma.name().lower() != target_word.lower():
                            synonyms.append(lemma.name())
                
                if synonyms:
                    words[target_idx] = random.choice(synonyms).replace('_', ' ')
                    print(f"Replaced '{target_word}' with '{words[target_idx]}'")
                else:
                    print(f"No synonyms found for '{target_word}'")
            except Exception as e:
                print(f"Error finding synonyms for '{target_word}': {str(e)}")
                # No changes if we can't find synonyms
            
            return ' '.join(words)
            
        except Exception as e:
            print(f"Unexpected error in synonym attack: {str(e)}")
            return text  # Return original text if anything fails
    
    def _generate_perturbation_attack(self, text: str) -> str:
        """Generate a perturbation-based adversarial example."""
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
        
        # Default parameters
        num_samples = 50
        
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
            for j in range(num_samples // len(test_prompts)):
                print(f"  Sample {j+1}/{num_samples // len(test_prompts)}")
                try:
                    # Get original response
                    print("  Getting original response from model...")
                    original_response = await model_adapter.predict(prompt)
                    
                    # Generate adversarial examples
                    print("  Generating adversarial examples...")
                    attacks = []
                    
                    try:
                        typo_attack = self._generate_typo_attack(prompt)
                        attacks.append(typo_attack)
                        print(f"    Typo attack: '{typo_attack[:50]}...'")
                    except Exception as e:
                        print(f"    Error generating typo attack: {str(e)}")
                    
                    try:
                        synonym_attack = self._generate_synonym_attack(prompt)
                        attacks.append(synonym_attack)
                        print(f"    Synonym attack: '{synonym_attack[:50]}...'")
                    except Exception as e:
                        print(f"    Error generating synonym attack: {str(e)}")
                    
                    try:
                        perturbation_attack = self._generate_perturbation_attack(prompt)
                        attacks.append(perturbation_attack)
                        print(f"    Perturbation attack: '{perturbation_attack[:50]}...'")
                    except Exception as e:
                        print(f"    Error generating perturbation attack: {str(e)}")
                    
                    if not attacks:
                        print("  No attacks could be generated, skipping this sample")
                        continue
                    
                    # Test each attack
                    for attack_index, attack_prompt in enumerate(attacks):
                        attack_type = ["typo", "synonym", "perturbation"][min(attack_index, 2)]
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
                            if robustness_score is None:
                                print("  Warning: robustness_score was None, defaulting to 0.0")
                                robustness_score = 0.0
                                
                            total_robustness += robustness_score
                            
                            # Check if attack was successful (lowered robustness below threshold)
                            is_vulnerable = robustness_score < min_robustness_score
                            
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
                    f"Model is vulnerable to typo-based attacks. Consider training with augmented data "
                    f"containing common typos to improve robustness."
                )
            if synonym_attacks:
                recommendations.append(
                    f"Model is sensitive to synonym substitutions. Consider semantic-aware training "
                    f"to maintain consistency across semantically equivalent inputs."
                )
            if perturbation_attacks:
                recommendations.append(
                    f"Model is vulnerable to input perturbations. Consider implementing preprocessing "
                    f"to clean inputs and implementing adversarial training techniques."
                )
        
        return TestResult(
            test_id=self.metadata.id,
            timestamp=datetime.now().isoformat(),
            passed=test_passed,
            metrics={
                'robustness_score': avg_robustness,
                'vulnerability_score': vulnerability_score,
                'total_attacks': total_attacks,
                'successful_attacks': successful_attacks
            },
            results={
                'vulnerable_cases': attack_cases
            },
            recommendations=recommendations
        )
    
    def _calculate_robustness(self, response1: str, response2: str) -> float:
        """Calculate robustness score between original and adversarial responses."""
        try:
            # Ensure inputs are valid strings
            if response1 is None or response2 is None:
                print("Warning: Null response received in _calculate_robustness")
                return 0.0
                
            response1 = str(response1) if response1 is not None else ""
            response2 = str(response2) if response2 is not None else ""
            
            # Use NLTK to tokenize and process the responses
            tokens1 = word_tokenize(response1.lower())
            tokens2 = word_tokenize(response2.lower())
            
            # Remove stopwords
            stop_words = set(stopwords.words('english'))
            tokens1 = [w for w in tokens1 if w not in stop_words and w.isalnum()]
            tokens2 = [w for w in tokens2 if w not in stop_words and w.isalnum()]
            
            # Calculate Jaccard similarity
            set1 = set(tokens1)
            set2 = set(tokens2)
            
            intersection = len(set1.intersection(set2))
            union = len(set1.union(set2))
            
            if union == 0:
                return 1.0
            
            jaccard_sim = intersection / union
            
            # Calculate semantic similarity using POS tags if available
            try:
                # Use the standard POS tagger without specifying language
                print("Calling POS tagger from _calculate_robustness without language specification")
                pos1 = dict(pos_tag(tokens1))  # Don't specify language
                pos2 = dict(pos_tag(tokens2))  # Don't specify language
                
                shared_pos = 0
                for word in set1.intersection(set2):
                    if word in pos1 and word in pos2 and pos1[word] == pos2[word]:
                        shared_pos += 1
                
                semantic_sim = shared_pos / max(len(pos1), len(pos2)) if max(len(pos1), len(pos2)) > 0 else 0
            except Exception as e:
                print(f"Error in POS tagging during robustness calculation: {str(e)}")
                # Fallback to just using Jaccard similarity
                semantic_sim = jaccard_sim
            
            # Combine metrics
            robustness_score = (jaccard_sim + semantic_sim) / 2
            
            # Ensure we return a valid float
            if robustness_score is None or not isinstance(robustness_score, (int, float)):
                print(f"Warning: Invalid robustness_score calculated: {robustness_score}, defaulting to 0.0")
                return 0.0
            
            return robustness_score
        except Exception as e:
            print(f"Error in robustness calculation: {str(e)}")
            return 0.0 