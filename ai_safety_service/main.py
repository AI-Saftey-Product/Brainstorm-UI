from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import uuid
from datetime import datetime
import json
import os
from pathlib import Path
import nltk

from core.base import TestMetadata, TestResult
from core.models import TextModelAdapter, ImageModelAdapter, MultimodalModelAdapter
from core.tests import test_registry

def setup_nltk():
    """Download required NLTK resources at startup."""
    print("Setting up NLTK resources...")
    
    # Set NLTK data path to include user's home directory
    nltk.data.path.append(os.path.join(os.path.expanduser("~"), "nltk_data"))
    
    # Download commonly used resources
    resources = [
        'punkt',
        'averaged_perceptron_tagger',
        'maxent_ne_chunker',
        'words',
        'stopwords',
        'wordnet'
    ]
    
    for resource in resources:
        try:
            print(f"Checking/downloading NLTK resource: {resource}")
            nltk.download(resource, quiet=True)
        except Exception as e:
            print(f"Warning: Error downloading NLTK resource {resource}: {str(e)}")
    
    print("NLTK setup complete")

# Download NLTK data at startup
setup_nltk()

app = FastAPI(title="AI Safety Testing Microservice")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for test results (replace with proper database in production)
test_results: Dict[str, Dict[str, Any]] = {}

class TestRequest(BaseModel):
    """Request model for running tests."""
    test_ids: List[str]
    model_settings: Dict[str, Any]
    test_parameters: Optional[Dict[str, Dict[str, Any]]] = None

class TestResponse(BaseModel):
    """Response model for test run initiation."""
    task_id: str
    status: str

class TaskStatus(BaseModel):
    """Model for task status updates."""
    status: str
    progress: float
    timestamp: int
    error: Optional[str] = None

class TestResults(BaseModel):
    """Model for test results."""
    results: Dict[str, Dict[str, Any]]
    compliance_scores: Dict[str, Dict[str, int]]

async def run_tests(task_id: str, request: TestRequest):
    """Background task to run tests."""
    try:
        # Convert camelCase keys to snake_case for better compatibility
        settings = request.model_settings.copy()
        
        # Map frontend camelCase to backend snake_case
        if 'modelId' in settings and 'model_id' not in settings:
            settings['model_id'] = settings['modelId']
        
        # Also use selectedModel as a fallback for model_id
        if 'selectedModel' in settings and (not settings.get('model_id')):
            settings['model_id'] = settings['selectedModel']
        
        # Map other common fields
        if 'modelType' in settings and 'model_type' not in settings:
            settings['model_type'] = settings['modelType']
        
        if 'modelName' in settings and 'model_name' not in settings:
            settings['model_name'] = settings['modelName']
            
        if 'modelCategory' in settings and 'model_category' not in settings:
            settings['model_category'] = settings['modelCategory']
        
        # Debug logging for model settings
        print("\n----- DEBUG: MODEL SETTINGS -----")
        print(f"Raw model settings: {request.model_settings}")
        print(f"Processed settings: {settings}")
        print(f"Model ID: {settings.get('model_id')}")
        print(f"Provider: {settings.get('provider', 'huggingface')}")
        print(f"Modality: {settings.get('modality', 'text')}")
        print("---------------------------------\n")
        
        # Initialize model adapter based on configuration
        modality = settings.get("modality", "text")
        if modality == "text":
            model = TextModelAdapter(settings)
        elif modality == "image":
            model = ImageModelAdapter(settings)
        elif modality == "multimodal":
            model = MultimodalModelAdapter(settings)
        else:
            raise ValueError(f"Unsupported modality: {modality}")
        
        # Debug log after model initialization
        print("\n----- DEBUG: MODEL INITIALIZED -----")
        print(f"Model type: {type(model).__name__}")
        print(f"Model ID used: {model.model_id}")
        print("------------------------------------\n")
        
        # Initialize results storage
        test_results[task_id] = {
            "status": "running",
            "progress": 0,
            "timestamp": int(datetime.now().timestamp()),
            "results": {},
            "compliance_scores": {}
        }
        
        total_tests = len(request.test_ids)
        completed_tests = 0
        
        # Run each test
        for test_id in request.test_ids:
            test = test_registry.get_test(test_id)
            if not test:
                raise ValueError(f"Test not found: {test_id}")
            
            # Get test parameters
            parameters = request.test_parameters.get(test_id) if request.test_parameters else None
            
            # Debug log before running test
            print(f"\n----- DEBUG: RUNNING TEST {test_id} -----")
            print(f"Test parameters: {parameters}")
            print(f"Model ID being used: {model.model_id}")
            print("--------------------------------------\n")
            
            # Run test
            result = await test.run(model, parameters)
            
            # Debug log after test completes
            print(f"\n----- DEBUG: TEST {test_id} COMPLETED -----")
            print(f"Test passed: {result.passed}")
            print(f"Test score: {result.score}")
            print("-----------------------------------------\n")
            
            # Store result
            test_results[task_id]["results"][test_id] = {
                "test": test.metadata.dict(),
                "result": result.dict()
            }
            
            # Update progress
            completed_tests += 1
            test_results[task_id]["progress"] = completed_tests / total_tests
            test_results[task_id]["timestamp"] = int(datetime.now().timestamp())
        
        # Calculate compliance scores
        test_results[task_id]["compliance_scores"] = calculate_compliance_scores(
            test_results[task_id]["results"]
        )
        
        # Mark as complete
        test_results[task_id]["status"] = "completed"
        
    except Exception as e:
        test_results[task_id]["status"] = "failed"
        test_results[task_id]["error"] = str(e)
        raise

def calculate_compliance_scores(results: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, int]]:
    """Calculate compliance scores by category."""
    scores = {}
    
    for test_id, test_data in results.items():
        category = test_data["test"]["category"]
        if category not in scores:
            scores[category] = {"passed": 0, "total": 0}
        
        scores[category]["total"] += 1
        if test_data["result"]["passed"]:
            scores[category]["passed"] += 1
    
    return scores

@app.post("/api/tests/run", response_model=TestResponse)
async def run_test_batch(request: TestRequest, background_tasks: BackgroundTasks):
    """Run a batch of tests asynchronously."""
    task_id = str(uuid.uuid4())
    
    # Debug logging for the incoming request
    print("\n----- DEBUG: INCOMING TEST REQUEST -----")
    print(f"Test IDs: {request.test_ids}")
    print(f"Model Settings: {request.model_settings}")
    print(f"Model ID from request (camelCase): {request.model_settings.get('modelId')}")
    print(f"Model ID from request (selectedModel): {request.model_settings.get('selectedModel')}")
    print(f"Model ID from request (snake_case): {request.model_settings.get('model_id')}")
    print("-----------------------------------------\n")
    
    # Initialize task status
    test_results[task_id] = {
        "status": "started",
        "progress": 0,
        "timestamp": int(datetime.now().timestamp())
    }
    
    # Add task to background tasks
    background_tasks.add_task(run_tests, task_id, request)
    
    return TestResponse(task_id=task_id, status="started")

@app.get("/api/tests/status/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    """Get status of a test run."""
    if task_id not in test_results:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = test_results[task_id]
    return TaskStatus(
        status=result["status"],
        progress=result["progress"],
        timestamp=result["timestamp"],
        error=result.get("error")
    )

@app.get("/api/tests/results/{task_id}", response_model=TestResults)
async def get_test_results(task_id: str):
    """Get detailed results of a test run."""
    if task_id not in test_results:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = test_results[task_id]
    if result["status"] not in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Test run not completed")
    
    return TestResults(
        results=result["results"],
        compliance_scores=result["compliance_scores"]
    )

@app.get("/api/tests", response_model=List[TestMetadata])
async def get_available_tests(
    modality: Optional[str] = None,
    model_type: Optional[str] = None
):
    """Get available tests filtered by model modality and type."""
    all_tests = test_registry.get_all_tests()
    
    if not modality and not model_type:
        return [test.metadata for test in all_tests]
    
    filtered_tests = []
    for test in all_tests:
        # Check if test supports the specified modality
        if modality and modality not in test.metadata.supported_modalities:
            continue
            
        # Check if test supports the specified model type
        if model_type and model_type != test.metadata.model_type and test.metadata.model_type != "any":
            continue
            
        filtered_tests.append(test.metadata)
    
    return filtered_tests

@app.get("/api/tests/categories", response_model=List[str])
async def get_test_categories():
    """Get all test categories."""
    categories = set()
    for test in test_registry.get_all_tests():
        categories.add(test.metadata.category)
    return sorted(list(categories))

@app.get("/api/models/modalities", response_model=List[str])
async def get_model_modalities():
    """Get all available model modalities."""
    return ["text", "image", "multimodal"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 