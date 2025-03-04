from typing import Any, Dict, List, Optional
from datetime import datetime

from ...base import BaseTest, TestMetadata, TestResult, ModelAdapter

class QAEvaluationTest(BaseTest):
    """Test for evaluating model question-answering capabilities."""
    
    def __init__(self):
        self._metadata = TestMetadata(
            id="nlp_8",
            name="QA Evaluation Testing",
            description="Evaluates model performance across different types of questions",
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
        """Run the QA evaluation test."""
        # Default parameters if none provided
        params = parameters or {
            "minAccuracy": 0.85,
            "maxError": 0.15,
            "testCases": 5
        }
        
        # Test cases with different question types
        test_cases = [
            {
                "input": "What is the capital of France?",
                "questions": [
                    {"type": "factual", "text": "What is the capital of France?"},
                    {"type": "analytical", "text": "Why is Paris the capital of France?"},
                    {"type": "comparative", "text": "How does Paris compare to other European capitals?"}
                ],
                "expected": "Paris",
                "context": "Paris has been the capital of France since 508 CE."
            },
            {
                "input": "How tall is Mount Everest?",
                "questions": [
                    {"type": "factual", "text": "How tall is Mount Everest?"},
                    {"type": "analytical", "text": "What factors affect Mount Everest's height?"},
                    {"type": "comparative", "text": "How does Mount Everest's height compare to other mountains?"}
                ],
                "expected": "8,848 meters",
                "context": "Mount Everest's height is 8,848 meters above sea level."
            },
            {
                "input": "What is the largest planet in our solar system?",
                "questions": [
                    {"type": "factual", "text": "What is the largest planet in our solar system?"},
                    {"type": "analytical", "text": "Why is Jupiter the largest planet?"},
                    {"type": "comparative", "text": "How does Jupiter compare to other planets in size?"}
                ],
                "expected": "Jupiter",
                "context": "Jupiter is the largest planet in our solar system by both mass and volume."
            }
        ]
        
        results = []
        total_accuracy = 0
        total_error = 0
        
        for case in test_cases:
            # Get predictions for each question type
            question_predictions = []
            for question in case["questions"]:
                pred = await model.predict(question["text"])
                question_predictions.append({
                    "question": question,
                    "prediction": pred
                })
            
            # Calculate accuracy and error
            accuracy = self._calculate_accuracy(question_predictions, case["expected"])
            error = self._calculate_error(question_predictions, case["expected"])
            
            total_accuracy += accuracy
            total_error += error
            
            results.append({
                "input": case["input"],
                "question_predictions": question_predictions,
                "expected": case["expected"],
                "context": case["context"],
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
            recommendations.append("Model shows insufficient QA accuracy. Consider improving answer generation.")
        if avg_error > params["maxError"]:
            recommendations.append("Model exhibits high error rates in QA. Consider strengthening answer validation.")
        
        return TestResult(
            passed=passed,
            score=min(avg_accuracy, 1 - avg_error),
            message=f"QA evaluation test {'passed' if passed else 'failed'} with accuracy {avg_accuracy:.2f} and error {avg_error:.2f}",
            metrics={
                "accuracy": avg_accuracy,
                "error": avg_error
            },
            cases=results,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
    
    def _calculate_accuracy(self, predictions: List[Dict[str, Any]], expected: str) -> float:
        """Calculate accuracy score based on expected answers."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        if not predictions:
            return 0.0
        
        # Calculate accuracy rate for each question type
        question_accuracy = {}
        for pred in predictions:
            question_type = pred["question"]["type"]
            if question_type not in question_accuracy:
                question_accuracy[question_type] = {"accurate": 0, "total": 0}
            question_accuracy[question_type]["total"] += 1
            if pred["prediction"] == expected:
                question_accuracy[question_type]["accurate"] += 1
        
        # Calculate accuracy as minimum accuracy rate across question types
        accuracy_rates = [
            stats["accurate"] / stats["total"]
            for stats in question_accuracy.values()
        ]
        return min(accuracy_rates) if accuracy_rates else 0.0
    
    def _calculate_error(self, predictions: List[Dict[str, Any]], expected: str) -> float:
        """Calculate error score based on expected answers."""
        # Simple implementation - can be enhanced with more sophisticated comparison
        return 1.0 - self._calculate_accuracy(predictions, expected) 