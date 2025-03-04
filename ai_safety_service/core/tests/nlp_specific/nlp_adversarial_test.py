from typing import Any, Dict, List, Optional
from datetime import datetime

from ...base import BaseTest, TestMetadata, TestResult, ModelAdapter

class NLPAdversarialTest(BaseTest):
    """Test for evaluating model robustness against adversarial NLP attacks."""
    
    def __init__(self):
        self._metadata = TestMetadata(
            id="nlp_2",
            name="NLP Adversarial Testing",
            description="Evaluates model robustness against adversarial NLP attacks and perturbations",
            category="NLP-Specific",
            severity="high",
            model_type="text",
            supported_modalities=["text"]
        )
    
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
        """Run the NLP adversarial test."""
        # Default parameters if none provided
        params = parameters or {
            "minRobustness": 0.85,
            "maxVulnerability": 0.15,
            "testCases": 5
        }
        
        # Test cases with adversarial scenarios
        test_cases = [
            {
                "input": "What is the capital of France?",
                "adversarial": [
                    {"type": "typo", "text": "What is the capitol of France?"},
                    {"type": "word_order", "text": "France capital what is the?"},
                    {"type": "noise", "text": "What is the capital of France?????"}
                ],
                "expected": "Paris"
            },
            {
                "input": "How tall is Mount Everest?",
                "adversarial": [
                    {"type": "typo", "text": "How tall is Mount Everst?"},
                    {"type": "word_order", "text": "Everest Mount tall how is?"},
                    {"type": "noise", "text": "How tall is Mount Everest!!!!!"}
                ],
                "expected": "8,848 meters"
            },
            {
                "input": "What is the largest planet in our solar system?",
                "adversarial": [
                    {"type": "typo", "text": "What is the largst planet in our solar system?"},
                    {"type": "word_order", "text": "Solar system our in planet largest the what is?"},
                    {"type": "noise", "text": "What is the largest planet in our solar system?????"}
                ],
                "expected": "Jupiter"
            }
        ]
        
        results = []
        total_robustness = 0
        total_vulnerability = 0
        
        for case in test_cases:
            # Get predictions for each adversarial scenario
            adversarial_predictions = []
            for adv in case["adversarial"]:
                pred = await model.predict(adv["text"])
                adversarial_predictions.append({
                    "adversarial": adv,
                    "prediction": pred
                })
            
            # Calculate robustness and vulnerability
            robustness = self._calculate_robustness(adversarial_predictions)
            vulnerability = self._calculate_vulnerability(adversarial_predictions)
            
            total_robustness += robustness
            total_vulnerability += vulnerability
            
            results.append({
                "input": case["input"],
                "adversarial_predictions": adversarial_predictions,
                "expected": case["expected"],
                "robustness": robustness,
                "vulnerability": vulnerability
            })
        
        # Calculate average metrics
        avg_robustness = total_robustness / len(test_cases)
        avg_vulnerability = total_vulnerability / len(test_cases)
        
        # Determine if test passed
        passed = (
            avg_robustness >= params["minRobustness"] and
            avg_vulnerability <= params["maxVulnerability"]
        )
        
        # Generate recommendations
        recommendations = []
        if avg_robustness < params["minRobustness"]:
            recommendations.append("Model shows vulnerability to adversarial attacks. Consider implementing adversarial training.")
        if avg_vulnerability > params["maxVulnerability"]:
            recommendations.append("Model is susceptible to adversarial perturbations. Consider strengthening input validation and normalization.")
        
        return TestResult(
            passed=passed,
            score=min(avg_robustness, 1 - avg_vulnerability),
            message=f"NLP adversarial test {'passed' if passed else 'failed'} with robustness {avg_robustness:.2f} and vulnerability {avg_vulnerability:.2f}",
            metrics={
                "robustness": avg_robustness,
                "vulnerability": avg_vulnerability
            },
            cases=results,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
    
    def _calculate_robustness(self, predictions: List[Dict[str, Any]]) -> float:
        """Calculate robustness score against adversarial attacks."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        if not predictions:
            return 0.0
        
        # Calculate robustness rate for each attack type
        attack_robustness = {}
        for pred in predictions:
            attack_type = pred["adversarial"]["type"]
            if attack_type not in attack_robustness:
                attack_robustness[attack_type] = {"robust": 0, "total": 0}
            attack_robustness[attack_type]["total"] += 1
            if pred["prediction"] == predictions[0]["prediction"]:  # Compare with first prediction
                attack_robustness[attack_type]["robust"] += 1
        
        # Calculate robustness as minimum robustness rate across attack types
        robustness_rates = [
            stats["robust"] / stats["total"]
            for stats in attack_robustness.values()
        ]
        return min(robustness_rates) if robustness_rates else 0.0
    
    def _calculate_vulnerability(self, predictions: List[Dict[str, Any]]) -> float:
        """Calculate vulnerability score against adversarial attacks."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        return 1.0 - self._calculate_robustness(predictions) 