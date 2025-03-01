// Mock test data for the API server

const TEST_CATEGORIES = {
    "Technical Safety": "#3f51b5",
    "Fairness & Bias": "#ff9800",
    "Regulatory Compliance": "#4caf50",
    "Transparency": "#2196f3",
    "Privacy Protection": "#f44336",
    "Operational Security": "#9c27b0",
    "NLP-Specific": "#00bcd4"
  };
  
  const MOCK_TESTS = {
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
      { id: "regulatory_compliance_1", name: "GDPR Data Protection Assessment", description: "Verifies compliance with GDPR data protection principles", severity: "critical", category: "Regulatory Compliance" },
      { id: "regulatory_compliance_2", name: "CCPA Compliance Verification", description: "Evaluates adherence to California Consumer Privacy Act requirements", severity: "high", category: "Regulatory Compliance" },
      { id: "regulatory_compliance_3", name: "EU AI Act Risk Assessment", description: "Assesses risk categorization and compliance with EU AI Act requirements", severity: "critical", category: "Regulatory Compliance" },
      { id: "regulatory_compliance_4", name: "NIST AI RMF Alignment", description: "Evaluates alignment with NIST AI Risk Management Framework", severity: "medium", category: "Regulatory Compliance" },
      { id: "regulatory_compliance_5", name: "ISO/IEC 42001 Conformity", description: "Checks conformity with ISO/IEC 42001 AI management system standard", severity: "medium", category: "Regulatory Compliance" }
    ],
    "Transparency": [
      { id: "transparency_1", name: "Model Card Completeness", description: "Assesses whether model documentation meets transparency requirements", severity: "medium", category: "Transparency" },
      { id: "transparency_2", name: "Decision Explainability", description: "Evaluates the explainability of model decisions to users", severity: "high", category: "Transparency" },
      { id: "transparency_3", name: "Data Lineage Transparency", description: "Verifies transparency in data sources and processing", severity: "low", category: "Transparency" },
      { id: "transparency_4", name: "Capability Disclosure", description: "Checks disclosure of model capabilities and limitations", severity: "medium", category: "Transparency" }
    ],
    "Privacy Protection": [
      { id: "privacy_protection_1", name: "PII Data Handling", description: "Verifies appropriate handling of personally identifiable information", severity: "critical", category: "Privacy Protection" },
      { id: "privacy_protection_2", name: "Data Minimization", description: "Assesses adherence to data minimization principles", severity: "high", category: "Privacy Protection" },
      { id: "privacy_protection_3", name: "Re-identification Risk", description: "Evaluates risk of re-identifying individuals from anonymized data", severity: "critical", category: "Privacy Protection" },
      { id: "privacy_protection_4", name: "Privacy by Design", description: "Checks implementation of privacy by design principles", severity: "medium", category: "Privacy Protection" }
    ],
    "Operational Security": [
      { id: "operational_security_1", name: "Model Access Controls", description: "Verifies proper implementation of access controls", severity: "high", category: "Operational Security" },
      { id: "operational_security_2", name: "Prompt Injection Resistance", description: "Tests resistance to malicious prompt injection attacks", severity: "high", category: "Operational Security" },
      { id: "operational_security_3", name: "API Security Assessment", description: "Evaluates security of API endpoints", severity: "medium", category: "Operational Security" },
      { id: "operational_security_4", name: "Output Filtering Effectiveness", description: "Tests effectiveness of harmful output filtering mechanisms", severity: "high", category: "Operational Security" }
    ],
    "NLP-Specific": [
      { id: "nlp_robustness_1", name: "Linguistic Variation Testing", description: "Evaluates model robustness to linguistic variations", severity: "medium", category: "NLP-Specific" },
      { id: "nlp_robustness_2", name: "NLP Adversarial Attack Testing", description: "Tests model robustness to adversarial text attacks", severity: "high", category: "NLP-Specific" },
      { id: "nlp_bias_1", name: "Linguistic Bias Evaluation", description: "Detects linguistic biases across dimensions", severity: "high", category: "NLP-Specific" },
      { id: "nlp_safety_1", name: "Harmful Content Detection", description: "Tests model handling of harmful content", severity: "critical", category: "NLP-Specific" },
      { id: "nlp_safety_2", name: "Multi-lingual Safety Evaluation", description: "Tests safety across multiple languages", severity: "high", category: "NLP-Specific" }
    ]
  };
  
  module.exports = {
    TEST_CATEGORIES,
    MOCK_TESTS
  };