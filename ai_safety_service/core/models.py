from typing import Any, Dict, List, Optional, Union
import httpx
from transformers import AutoModelForCausalLM, AutoTokenizer
from PIL import Image
import torch
import numpy as np
from .base import ModelAdapter

class TextModelAdapter(ModelAdapter):
    """Adapter for text-based models."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.provider = config.get("provider", "huggingface")
        self.model_id = config.get("model_id")
        self.api_key = config.get("api_key")
        self._model = None
        self._tokenizer = None
        
        if self.provider == "huggingface":
            self._initialize_huggingface()
        elif self.provider == "openai":
            self._initialize_openai()
    
    def _initialize_huggingface(self):
        """Initialize HuggingFace model and tokenizer."""
        print(f"\n----- DEBUG: INITIALIZING HUGGING FACE MODEL -----")
        print(f"Model ID: {self.model_id}")
        print(f"Model ID type: {type(self.model_id)}")
        
        # Validate model ID
        if not self.model_id or self.model_id == "None" or self.model_id == "undefined":
            error_msg = f"Invalid model ID: '{self.model_id}'. Must provide a valid Hugging Face model identifier."
            print(f"ERROR: {error_msg}")
            raise ValueError(error_msg)
            
        try:
            print(f"Attempting to load tokenizer for: {self.model_id}")
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_id)
            
            print(f"Attempting to load model for: {self.model_id}")
            self._model = AutoModelForCausalLM.from_pretrained(self.model_id)
            
            print("Model and tokenizer loaded successfully!")
        except Exception as e:
            print(f"ERROR loading model: {str(e)}")
            raise ValueError(f"Failed to load Hugging Face model '{self.model_id}': {str(e)}")
        finally:
            print("----------------------------------------\n")
    
    def _initialize_openai(self):
        """Initialize OpenAI client."""
        import openai
        openai.api_key = self.api_key
    
    async def predict(self, inputs: Union[str, List[str]]) -> Union[str, List[str]]:
        """Make predictions using the model."""
        if self.provider == "huggingface":
            return await self._predict_huggingface(inputs)
        elif self.provider == "openai":
            return await self._predict_openai(inputs)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    async def _predict_huggingface(self, inputs: Union[str, List[str]]) -> Union[str, List[str]]:
        """Make predictions using HuggingFace model."""
        if isinstance(inputs, str):
            inputs = [inputs]
        
        results = []
        for input_text in inputs:
            inputs = self._tokenizer(input_text, return_tensors="pt")
            outputs = self._model.generate(**inputs, max_length=100)
            result = self._tokenizer.decode(outputs[0], skip_special_tokens=True)
            results.append(result)
        
        return results[0] if len(results) == 1 else results
    
    async def _predict_openai(self, inputs: Union[str, List[str]]) -> Union[str, List[str]]:
        """Make predictions using OpenAI API."""
        import openai
        
        if isinstance(inputs, str):
            inputs = [inputs]
        
        results = []
        for input_text in inputs:
            response = await openai.ChatCompletion.acreate(
                model=self.model_id,
                messages=[{"role": "user", "content": input_text}]
            )
            result = response.choices[0].message.content
            results.append(result)
        
        return results[0] if len(results) == 1 else results
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model."""
        return {
            "provider": self.provider,
            "model_id": self.model_id,
            "type": "text"
        }

class ImageModelAdapter(ModelAdapter):
    """Adapter for image-based models."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.provider = config.get("provider", "huggingface")
        self.model_id = config.get("model_id")
        self.api_key = config.get("api_key")
        self._model = None
        self._processor = None
        
        if self.provider == "huggingface":
            self._initialize_huggingface()
        elif self.provider == "openai":
            self._initialize_openai()
    
    def _initialize_huggingface(self):
        """Initialize HuggingFace model and processor."""
        from transformers import AutoImageProcessor, AutoModelForImageClassification
        self._processor = AutoImageProcessor.from_pretrained(self.model_id)
        self._model = AutoModelForImageClassification.from_pretrained(self.model_id)
    
    def _initialize_openai(self):
        """Initialize OpenAI client."""
        import openai
        openai.api_key = self.api_key
    
    async def predict(self, inputs: Union[str, Image.Image, List[Union[str, Image.Image]]]) -> Any:
        """Make predictions using the model."""
        if self.provider == "huggingface":
            return await self._predict_huggingface(inputs)
        elif self.provider == "openai":
            return await self._predict_openai(inputs)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    async def _predict_huggingface(self, inputs: Union[str, Image.Image, List[Union[str, Image.Image]]]) -> Any:
        """Make predictions using HuggingFace model."""
        if isinstance(inputs, (str, Image.Image)):
            inputs = [inputs]
        
        results = []
        for input_data in inputs:
            if isinstance(input_data, str):
                image = Image.open(input_data)
            else:
                image = input_data
            
            inputs = self._processor(images=image, return_tensors="pt")
            outputs = self._model(**inputs)
            results.append(outputs)
        
        return results[0] if len(results) == 1 else results
    
    async def _predict_openai(self, inputs: Union[str, Image.Image, List[Union[str, Image.Image]]]) -> Any:
        """Make predictions using OpenAI API."""
        import openai
        
        if isinstance(inputs, (str, Image.Image)):
            inputs = [inputs]
        
        results = []
        for input_data in inputs:
            if isinstance(input_data, str):
                with open(input_data, "rb") as image_file:
                    image_data = image_file.read()
            else:
                # Convert PIL Image to bytes
                import io
                img_byte_arr = io.BytesIO()
                input_data.save(img_byte_arr, format='PNG')
                image_data = img_byte_arr.getvalue()
            
            response = await openai.Image.create_variation(
                image=image_data,
                n=1,
                size="1024x1024"
            )
            results.append(response)
        
        return results[0] if len(results) == 1 else results
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model."""
        return {
            "provider": self.provider,
            "model_id": self.model_id,
            "type": "image"
        }

class MultimodalModelAdapter(ModelAdapter):
    """Adapter for multimodal models that can handle multiple input types."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.provider = config.get("provider", "huggingface")
        self.model_id = config.get("model_id")
        self.api_key = config.get("api_key")
        self._model = None
        self._processor = None
        
        if self.provider == "huggingface":
            self._initialize_huggingface()
        elif self.provider == "openai":
            self._initialize_openai()
    
    def _initialize_huggingface(self):
        """Initialize HuggingFace model and processor."""
        from transformers import AutoProcessor, AutoModelForVision2Seq
        self._processor = AutoProcessor.from_pretrained(self.model_id)
        self._model = AutoModelForVision2Seq.from_pretrained(self.model_id)
    
    def _initialize_openai(self):
        """Initialize OpenAI client."""
        import openai
        openai.api_key = self.api_key
    
    async def predict(self, inputs: Dict[str, Any]) -> Any:
        """Make predictions using the model."""
        if self.provider == "huggingface":
            return await self._predict_huggingface(inputs)
        elif self.provider == "openai":
            return await self._predict_openai(inputs)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    async def _predict_huggingface(self, inputs: Dict[str, Any]) -> Any:
        """Make predictions using HuggingFace model."""
        processed_inputs = self._processor(**inputs, return_tensors="pt")
        outputs = self._model(**processed_inputs)
        return outputs
    
    async def _predict_openai(self, inputs: Dict[str, Any]) -> Any:
        """Make predictions using OpenAI API."""
        import openai
        
        # Handle different input types
        messages = []
        for key, value in inputs.items():
            if isinstance(value, str):
                messages.append({"role": "user", "content": value})
            elif isinstance(value, (str, Image.Image)):
                if isinstance(value, str):
                    with open(value, "rb") as image_file:
                        image_data = image_file.read()
                else:
                    import io
                    img_byte_arr = io.BytesIO()
                    value.save(img_byte_arr, format='PNG')
                    image_data = img_byte_arr.getvalue()
                
                messages.append({
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Processing {key} input"},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_data}"}}
                    ]
                })
        
        response = await openai.ChatCompletion.acreate(
            model=self.model_id,
            messages=messages
        )
        return response.choices[0].message.content
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model."""
        return {
            "provider": self.provider,
            "model_id": self.model_id,
            "type": "multimodal"
        } 