from typing import Any, Dict, List, Optional
from datetime import datetime

from ...base import BaseTest, TestMetadata, TestResult, ModelAdapter

class SummarizationTest(BaseTest):
    """Test for evaluating model text summarization capabilities."""
    
    def __init__(self):
        self._metadata = TestMetadata(
            id="nlp_9",
            name="Summarization Testing",
            description="Evaluates model performance in text summarization",
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
        """Run the summarization test."""
        # Default parameters if none provided
        params = parameters or {
            "minAccuracy": 0.85,
            "maxError": 0.15,
            "testCases": 5
        }
        
        # Test cases with summarization scenarios
        test_cases = [
            {
                "input": "The capital of France is Paris. Paris has been the capital since 508 CE. It is located in northern France and is known for its art, culture, fashion, and gastronomy. The city is home to many famous landmarks including the Eiffel Tower, Notre-Dame Cathedral, and the Louvre Museum.",
                "scenarios": [
                    {"type": "extractive", "text": "Summarize the key points about Paris."},
                    {"type": "abstractive", "text": "Provide a concise overview of Paris."},
                    {"type": "informative", "text": "Give a brief summary of Paris's significance."}
                ],
                "expected": "Paris is the capital of France, known for its art, culture, and landmarks like the Eiffel Tower."
            },
            {
                "input": "Mount Everest is the Earth's highest mountain above sea level, located in the Mahalangur Himal sub-range of the Himalayas. Its height is 8,848 meters. The mountain was first surveyed in 1856 and was named after Sir George Everest. It is considered one of the most challenging mountains to climb due to its extreme altitude and weather conditions.",
                "scenarios": [
                    {"type": "extractive", "text": "Summarize the key facts about Mount Everest."},
                    {"type": "abstractive", "text": "Provide a concise overview of Mount Everest."},
                    {"type": "informative", "text": "Give a brief summary of Mount Everest's significance."}
                ],
                "expected": "Mount Everest is the world's highest mountain at 8,848 meters, located in the Himalayas."
            },
            {
                "input": "Jupiter is the largest planet in our solar system, with a diameter of 142,984 kilometers. It is a gas giant primarily composed of hydrogen and helium. Jupiter has 79 known moons, including the four largest Galilean moons. The planet is known for its Great Red Spot, a persistent high-pressure region in its atmosphere.",
                "scenarios": [
                    {"type": "extractive", "text": "Summarize the key facts about Jupiter."},
                    {"type": "abstractive", "text": "Provide a concise overview of Jupiter."},
                    {"type": "informative", "text": "Give a brief summary of Jupiter's significance."}
                ],
                "expected": "Jupiter is the largest planet in our solar system, a gas giant with 79 moons."
            }
        ]
        
        results = []
        total_accuracy = 0
        total_error = 0
        
        for case in test_cases:
            # Get predictions for each summarization scenario
            scenario_predictions = []
            for scenario in case["scenarios"]:
                pred = await model.predict(f"{scenario['text']}\n\nInput text: {case['input']}")
                scenario_predictions.append({
                    "scenario": scenario,
                    "prediction": pred
                })
            
            # Calculate accuracy and error
            accuracy = self._calculate_accuracy(scenario_predictions, case["expected"])
            error = self._calculate_error(scenario_predictions, case["expected"])
            
            total_accuracy += accuracy
            total_error += error
            
            results.append({
                "input": case["input"],
                "scenario_predictions": scenario_predictions,
                "expected": case["expected"],
                "accuracy": accuracy,
                "error": error
            })
        
        # Calculate average metrics
        avg_accuracy = total_accuracy / len(test_cases)
        avg_error = total_error / len(test_cases)
        
        # Determine if test passed
        passed = (
            avg_accuracy >= params["minAccuracy"] and
            avg_error <= params["maxError"]
        )
        
        # Generate recommendations
        recommendations = []
        if avg_accuracy < params["minAccuracy"]:
            recommendations.append("Model shows insufficient summarization accuracy. Consider improving summary generation.")
        if avg_error > params["maxError"]:
            recommendations.append("Model exhibits high error rates in summarization. Consider strengthening summary validation.")
        
        return TestResult(
            passed=passed,
            score=min(avg_accuracy, 1 - avg_error),
            message=f"Summarization test {'passed' if passed else 'failed'} with accuracy {avg_accuracy:.2f} and error {avg_error:.2f}",
            metrics={
                "accuracy": avg_accuracy,
                "error": avg_error
            },
            cases=results,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
    
    def _calculate_accuracy(self, predictions: List[Dict[str, Any]], expected: str) -> float:
        """Calculate accuracy score based on expected summaries."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        if not predictions:
            return 0.0
        
        # Calculate accuracy rate for each scenario type
        scenario_accuracy = {}
        for pred in predictions:
            scenario_type = pred["scenario"]["type"]
            if scenario_type not in scenario_accuracy:
                scenario_accuracy[scenario_type] = {"accurate": 0, "total": 0}
            scenario_accuracy[scenario_type]["total"] += 1
            if pred["prediction"] == expected:
                scenario_accuracy[scenario_type]["accurate"] += 1
        
        # Calculate accuracy as minimum accuracy rate across scenario types
        accuracy_rates = [
            stats["accurate"] / stats["total"]
            for stats in scenario_accuracy.values()
        ]
        return min(accuracy_rates) if accuracy_rates else 0.0
    
    def _calculate_error(self, predictions: List[Dict[str, Any]], expected: str) -> float:
        """Calculate error score based on expected summaries."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        return 1.0 - self._calculate_accuracy(predictions, expected) 