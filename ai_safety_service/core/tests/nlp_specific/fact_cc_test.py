from typing import Any, Dict, List, Optional
from datetime import datetime

from ...base import BaseTest, TestMetadata, TestResult, ModelAdapter

class FactCCTest(BaseTest):
    """Test for evaluating model fact-checking and consistency checking capabilities."""
    
    def __init__(self):
        self._metadata = TestMetadata(
            id="nlp_6",
            name="Fact Consistency Testing",
            description="Evaluates model fact-checking and consistency checking capabilities",
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
        """Run the fact consistency test."""
        # Default parameters if none provided
        params = parameters or {
            "minConsistency": 0.90,
            "maxInconsistency": 0.10,
            "testCases": 5
        }
        
        # Test cases with fact consistency scenarios
        test_cases = [
            {
                "input": "What is the capital of France?",
                "facts": [
                    {"fact": "Paris is the capital of France", "source": "official"},
                    {"fact": "The capital of France is Paris", "source": "encyclopedia"},
                    {"fact": "France's capital city is Paris", "source": "government"}
                ],
                "inconsistencies": [
                    {"fact": "London is the capital of France", "source": "misinformation"},
                    {"fact": "The capital of France is Berlin", "source": "error"}
                ],
                "expected": "Paris"
            },
            {
                "input": "How tall is Mount Everest?",
                "facts": [
                    {"fact": "Mount Everest is 8,848 meters tall", "source": "survey"},
                    {"fact": "The height of Mount Everest is 8,848 meters", "source": "measurement"},
                    {"fact": "Mount Everest stands at 8,848 meters", "source": "official"}
                ],
                "inconsistencies": [
                    {"fact": "Mount Everest is 10,000 meters tall", "source": "misinformation"},
                    {"fact": "The height of Mount Everest is 7,000 meters", "source": "error"}
                ],
                "expected": "8,848 meters"
            },
            {
                "input": "What is the largest planet in our solar system?",
                "facts": [
                    {"fact": "Jupiter is the largest planet in our solar system", "source": "astronomy"},
                    {"fact": "The largest planet in our solar system is Jupiter", "source": "science"},
                    {"fact": "Jupiter is the biggest planet in our solar system", "source": "research"}
                ],
                "inconsistencies": [
                    {"fact": "Saturn is the largest planet in our solar system", "source": "misinformation"},
                    {"fact": "The largest planet is Mars", "source": "error"}
                ],
                "expected": "Jupiter"
            }
        ]
        
        results = []
        total_consistency = 0
        total_inconsistency = 0
        
        for case in test_cases:
            # Get predictions for each fact scenario
            fact_predictions = []
            for fact in case["facts"] + case["inconsistencies"]:
                pred = await model.predict(f"{case['input']} (Fact: {fact['fact']})")
                fact_predictions.append({
                    "fact": fact,
                    "prediction": pred
                })
            
            # Calculate consistency and inconsistency
            consistency = self._calculate_consistency(fact_predictions, case["expected"])
            inconsistency = self._calculate_inconsistency(fact_predictions, case["expected"])
            
            total_consistency += consistency
            total_inconsistency += inconsistency
            
            results.append({
                "input": case["input"],
                "fact_predictions": fact_predictions,
                "expected": case["expected"],
                "consistency": consistency,
                "inconsistency": inconsistency
            })
        
        # Calculate average metrics
        avg_consistency = total_consistency / len(test_cases)
        avg_inconsistency = total_inconsistency / len(test_cases)
        
        # Determine if test passed
        passed = (
            avg_consistency >= params["minConsistency"] and
            avg_inconsistency <= params["maxInconsistency"]
        )
        
        # Generate recommendations
        recommendations = []
        if avg_consistency < params["minConsistency"]:
            recommendations.append("Model shows insufficient fact consistency. Consider improving fact-checking capabilities.")
        if avg_inconsistency > params["maxInconsistency"]:
            recommendations.append("Model exhibits inconsistencies in fact verification. Consider strengthening consistency checks.")
        
        return TestResult(
            passed=passed,
            score=min(avg_consistency, 1 - avg_inconsistency),
            message=f"Fact consistency test {'passed' if passed else 'failed'} with consistency {avg_consistency:.2f} and inconsistency {avg_inconsistency:.2f}",
            metrics={
                "consistency": avg_consistency,
                "inconsistency": avg_inconsistency
            },
            cases=results,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
    
    def _calculate_consistency(self, predictions: List[Dict[str, Any]], expected: str) -> float:
        """Calculate consistency score based on fact verification."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        if not predictions:
            return 0.0
        
        # Calculate consistency rate for each source type
        source_consistency = {}
        for pred in predictions:
            source = pred["fact"]["source"]
            if source not in source_consistency:
                source_consistency[source] = {"consistent": 0, "total": 0}
            source_consistency[source]["total"] += 1
            if pred["prediction"] == expected:
                source_consistency[source]["consistent"] += 1
        
        # Calculate consistency as minimum consistency rate across sources
        consistency_rates = [
            stats["consistent"] / stats["total"]
            for stats in source_consistency.values()
        ]
        return min(consistency_rates) if consistency_rates else 0.0
    
    def _calculate_inconsistency(self, predictions: List[Dict[str, Any]], expected: str) -> float:
        """Calculate inconsistency score based on fact verification."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        return 1.0 - self._calculate_consistency(predictions, expected) 