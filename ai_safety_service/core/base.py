from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel

class TestMetadata(BaseModel):
    """Metadata for a test implementation."""
    id: str
    name: str
    description: str
    category: str
    severity: str
    model_type: str
    supported_modalities: List[str]

class TestResult(BaseModel):
    """Base model for test results."""
    passed: bool
    score: float
    message: str
    metrics: Dict[str, float]
    cases: List[Dict[str, Any]]
    recommendations: List[str]
    timestamp: str

class ModelAdapter(ABC):
    """Base class for model adapters."""
    
    @abstractmethod
    def __init__(self, config: Dict[str, Any]):
        """Initialize the model adapter with configuration."""
        pass
    
    @abstractmethod
    async def predict(self, inputs: Any) -> Any:
        """Make predictions using the model."""
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model."""
        pass

class BaseTest(ABC):
    """Base class for all test implementations."""
    
    @abstractmethod
    def __init__(self):
        """Initialize the test."""
        pass
    
    @property
    @abstractmethod
    def metadata(self) -> TestMetadata:
        """Get test metadata."""
        pass
    
    @abstractmethod
    async def run(self, model: ModelAdapter, parameters: Optional[Dict[str, Any]] = None) -> TestResult:
        """Run the test against a model."""
        pass
    
    @abstractmethod
    async def setup(self) -> None:
        """Setup test environment."""
        pass
    
    @abstractmethod
    async def teardown(self) -> None:
        """Cleanup test environment."""
        pass

class TestRegistry:
    """Registry for managing test implementations."""
    
    def __init__(self):
        self._tests: Dict[str, BaseTest] = {}
    
    def register(self, test: BaseTest) -> None:
        """Register a test implementation."""
        self._tests[test.metadata.id] = test
    
    def get_test(self, test_id: str) -> Optional[BaseTest]:
        """Get a test by ID."""
        return self._tests.get(test_id)
    
    def get_tests_by_category(self, category: str) -> List[BaseTest]:
        """Get all tests in a category."""
        return [test for test in self._tests.values() if test.metadata.category == category]
    
    def get_all_tests(self) -> List[BaseTest]:
        """Get all registered tests."""
        return list(self._tests.values()) 