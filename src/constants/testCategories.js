export const TEST_CATEGORIES = {
    "Technical Safety": "#3f51b5",
    "Fairness & Bias": "#ff9800",
    "Regulatory Compliance": "#4caf50",
    "Transparency": "#2196f3",
    "Privacy Protection": "#f44336",
    "Operational Security": "#9c27b0",
    "NLP-Specific": "#00bcd4"
  };
  
  export const TEST_SEVERITIES = ["critical", "high", "medium", "low"];
  
  export const MOCK_TESTS = {
    "Technical Safety": [
      { id: "tech_safety_1", name: "Input Validation Testing", description: "Evaluates model behavior with various input types including edge cases", severity: "medium", category: "Technical Safety" },
      { id: "tech_safety_2", name: "Prediction Consistency", description: "Tests model consistency across similar inputs", severity: "medium", category: "Technical Safety" },
      { id: "tech_safety_3", name: "Error Recovery", description: "Assesses how well the model handles and recovers from errors", severity: "medium", category: "Technical Safety" },
      { id: "tech_safety_4", name: "Load Testing", description: "Evaluates model performance under different load conditions", severity: "low", category: "Technical Safety" },
      { id: "tech_safety_5", name: "Advanced Adversarial Testing", description: "Evaluates model robustness under adversarial attacks", severity: "high", category: "Technical Safety" }
    ],
    "Fairness & Bias": [
      { id: "fairness_1", name: "Performance Across Demographic Groups", description: "Evaluate model performance across different demographic groups.", severity: "high", category: "Fairness & Bias" },
      { id: "fairness_2", name: "Disparate Impact Evaluation", description: "Assess disparate impact by comparing positive outcome rates across groups.", severity: "high", category: "Fairness & Bias" },
      { id: "fairness_3", name: "Bias Mitigation Effectiveness", description: "Evaluate the effectiveness of bias mitigation strategies.", severity: "medium", category: "Fairness & Bias" },
      { id: "fairness_4", name: "Intersectional Analysis Engine", description: "Analyze model performance across multiple demographic dimensions.", severity: "medium", category: "Fairness & Bias" }
    ],
    "Regulatory Compliance": [
      { id: "regulatory_compliance_1", name: "Regulatory Compliance Test 1", description: "Verifies regulatory compliance requirement #1", severity: "critical", category: "Regulatory Compliance" },
      { id: "regulatory_compliance_2", name: "Regulatory Compliance Test 2", description: "Verifies regulatory compliance requirement #2", severity: "high", category: "Regulatory Compliance" },
      { id: "regulatory_compliance_3", name: "Regulatory Compliance Test 3", description: "Verifies regulatory compliance requirement #3", severity: "medium", category: "Regulatory Compliance" }
    ],
    "Transparency": [
      { id: "transparency_1", name: "Transparency Test 1", description: "Verifies transparency requirement #1", severity: "medium", category: "Transparency" },
      { id: "transparency_2", name: "Transparency Test 2", description: "Verifies transparency requirement #2", severity: "low", category: "Transparency" },
      { id: "transparency_3", name: "Transparency Test 3", description: "Verifies transparency requirement #3", severity: "low", category: "Transparency" }
    ],
    "Privacy Protection": [
      { id: "privacy_protection_1", name: "Privacy Protection Test 1", description: "Verifies privacy protection requirement #1", severity: "critical", category: "Privacy Protection" },
      { id: "privacy_protection_2", name: "Privacy Protection Test 2", description: "Verifies privacy protection requirement #2", severity: "high", category: "Privacy Protection" },
      { id: "privacy_protection_3", name: "Privacy Protection Test 3", description: "Verifies privacy protection requirement #3", severity: "medium", category: "Privacy Protection" }
    ],
    "Operational Security": [
      { id: "operational_security_1", name: "Operational Security Test 1", description: "Verifies operational security requirement #1", severity: "high", category: "Operational Security" },
      { id: "operational_security_2", name: "Operational Security Test 2", description: "Verifies operational security requirement #2", severity: "medium", category: "Operational Security" },
      { id: "operational_security_3", name: "Operational Security Test 3", description: "Verifies operational security requirement #3", severity: "low", category: "Operational Security" }
    ],
    "NLP-Specific": [
      { id: "nlp_robustness_1", name: "Linguistic Variation Testing", description: "Evaluates model robustness to linguistic variations", severity: "medium", category: "NLP-Specific" },
      { id: "nlp_robustness_2", name: "NLP Adversarial Attack Testing", description: "Tests model robustness to adversarial text attacks", severity: "high", category: "NLP-Specific" },
      { id: "nlp_bias_1", name: "Linguistic Bias Evaluation", description: "Detects linguistic biases across dimensions", severity: "high", category: "NLP-Specific" },
      { id: "nlp_safety_1", name: "Harmful Content Detection", description: "Tests model handling of harmful content", severity: "critical", category: "NLP-Specific" }
    ]
  };