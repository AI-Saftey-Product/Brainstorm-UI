# AI Safety Testing Microservice

A Python-based microservice for comprehensive AI safety testing across different data modalities. This service provides a standardized framework for evaluating AI models' safety, fairness, and compliance with various requirements.

## Features

- Model-agnostic testing framework
- Support for multiple data modalities (text, image, multimodal)
- Extensible test registry
- Asynchronous test execution
- Comprehensive test results and metrics
- Docker containerization support

## Prerequisites

- Python 3.11 or higher
- Docker (optional, for containerized deployment)
- API keys for the AI models you want to test (e.g., OpenAI, HuggingFace)

## Installation

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-safety-service
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t ai-safety-service .
```

2. Run the container:
```bash
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_openai_key \
  -e HUGGINGFACE_API_KEY=your_huggingface_key \
  ai-safety-service
```

## Usage

### API Endpoints

1. Run Tests
```bash
curl -X POST http://localhost:8000/api/tests/run \
  -H "Content-Type: application/json" \
  -d '{
    "test_ids": ["tech_safety_1"],
    "model_config": {
      "modality": "text",
      "provider": "openai",
      "model_id": "gpt-3.5-turbo",
      "api_key": "your_api_key"
    },
    "test_parameters": {
      "tech_safety_1": {
        "minAccuracy": 0.85,
        "minConsistency": 0.75
      }
    }
  }'
```

2. Get Test Status
```bash
curl http://localhost:8000/api/tests/status/{task_id}
```

3. Get Test Results
```bash
curl http://localhost:8000/api/tests/results/{task_id}
```

4. List Available Tests
```bash
curl http://localhost:8000/api/tests
```

5. Get Test Categories
```bash
curl http://localhost:8000/api/tests/categories
```

6. Get Model Modalities
```bash
curl http://localhost:8000/api/models/modalities
```

### Python Client Example

```python
import httpx
import asyncio

async def run_safety_tests():
    async with httpx.AsyncClient() as client:
        # Start test run
        response = await client.post(
            "http://localhost:8000/api/tests/run",
            json={
                "test_ids": ["tech_safety_1"],
                "model_config": {
                    "modality": "text",
                    "provider": "openai",
                    "model_id": "gpt-3.5-turbo",
                    "api_key": "your_api_key"
                }
            }
        )
        task_id = response.json()["task_id"]
        
        # Poll for status
        while True:
            status_response = await client.get(f"http://localhost:8000/api/tests/status/{task_id}")
            status = status_response.json()
            
            if status["status"] in ["completed", "failed"]:
                break
                
            await asyncio.sleep(1)
        
        # Get results
        results_response = await client.get(f"http://localhost:8000/api/tests/results/{task_id}")
        return results_response.json()

# Run the tests
results = asyncio.run(run_safety_tests())
print(results)
```

## Test Categories

1. Technical Safety
   - Perturbation Testing
   - Adversarial Attack Testing
   - Prompt Injection Testing
   - Data Extraction Testing
   - Evasion Testing

2. Fairness & Bias
   - Demographic Performance Testing
   - Disparate Impact Evaluation
   - Bias Mitigation Effectiveness
   - Intersectional Analysis

3. Regulatory Compliance
   - Data Protection Compliance
   - Industry-Specific Regulation Tests
   - Ethics Guidelines Adherence

4. Transparency
   - Explainability Assessment
   - Model Card Completeness
   - Decision Process Visibility

5. Privacy Protection
   - PII Detection and Handling
   - Data Leakage Prevention
   - Anonymization Effectiveness

6. Operational Security
   - Input Validation
   - Error Handling
   - Resource Consumption

7. NLP-Specific
   - Linguistic Variation Testing
   - TruthfulQA Benchmark
   - FactCC Consistency
   - Hallucination Detection

## Adding New Tests

To add a new test:

1. Create a new test class in the appropriate category directory under `core/tests/`
2. Inherit from `BaseTest` and implement the required methods
3. Register the test in the test registry

Example:
```python
from core.base import BaseTest, TestMetadata, TestResult

class MyNewTest(BaseTest):
    def __init__(self):
        self._metadata = TestMetadata(
            id="my_test_1",
            name="My New Test",
            description="Description of what the test does",
            category="Technical Safety",
            severity="medium",
            model_type="any",
            supported_modalities=["text"]
        )
    
    @property
    def metadata(self) -> TestMetadata:
        return self._metadata
    
    async def setup(self) -> None:
        # Setup code
        pass
    
    async def teardown(self) -> None:
        # Cleanup code
        pass
    
    async def run(self, model, parameters=None) -> TestResult:
        # Test implementation
        pass
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 