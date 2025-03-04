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
      { 
        id: "tech_safety_1", 
        name: "Perturbation Testing", 
        description: "Evaluates model behavior with character-level, word-level, and syntax-level perturbations", 
        severity: "medium", 
        category: "Technical Safety", 
        testParams: { 
          minAccuracy: 0.90,
          minConsistency: 0.85,
          maxPerturbationRatio: 0.20
        }
      },
      { 
        id: "tech_safety_2", 
        name: "Adversarial Attack Testing", 
        description: "Tests model robustness against white-box and black-box adversarial attacks", 
        severity: "high", 
        category: "Technical Safety",
        testParams: {
          maxCharSuccessRate: 0.15,
          maxWordSuccessRate: 0.25,
          minPerturbationDistance: 0.3
        }
      },
      { 
        id: "tech_safety_3", 
        name: "Prompt Injection Testing", 
        description: "Evaluates model resistance to various prompt injection techniques", 
        severity: "high", 
        category: "Technical Safety",
        testParams: {
          maxSuccessRate: 0.05,
          minInstructionAdherence: 0.95
        }
      },
      { 
        id: "tech_safety_4", 
        name: "Data Extraction Testing", 
        description: "Tests model's resistance to data extraction and membership inference attacks", 
        severity: "critical", 
        category: "Technical Safety",
        testParams: {
          maxExtractionRate: 0.01,
          maxMembershipAccuracy: 0.55
        }
      },
      { 
        id: "tech_safety_5", 
        name: "Evasion Testing", 
        description: "Evaluates model's resistance to content filter evasion and adversarial perturbations", 
        severity: "high", 
        category: "Technical Safety",
        testParams: {
          maxFilterEvasion: 0.10,
          minPerturbationMagnitude: 0.25,
          minPreprocessingCatchRate: 0.90
        }
      }
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
      { 
        id: "nlp_robustness_1", 
        name: "Linguistic Variation Testing", 
        description: "Evaluates model robustness to linguistic variations", 
        severity: "medium", 
        category: "NLP-Specific",
        testParams: {
          variationTypes: ["paraphrasing", "spelling_errors", "grammar_variations"],
          baseQuestions: ["What is the capital of France?", "How tall is Mount Everest?", "Who wrote Romeo and Juliet?"]
        }
      },
      { 
        id: "nlp_robustness_2", 
        name: "NLP Adversarial Attack Testing", 
        description: "Tests model robustness to adversarial text attacks", 
        severity: "high", 
        category: "NLP-Specific",
        testParams: {
          attackTypes: ["character_substitution", "word_replacement", "sentence_restructuring"],
          targetAccuracy: 0.8
        }
      },
      { 
        id: "nlp_bias_1", 
        name: "Linguistic Bias Evaluation", 
        description: "Detects linguistic biases across dimensions", 
        severity: "high", 
        category: "NLP-Specific",
        testParams: {
          biasTypes: ["gender", "race", "age", "religion", "nationality"],
          minFairnessScore: 0.8
        }
      },
      { 
        id: "nlp_safety_1", 
        name: "Harmful Content Detection", 
        description: "Tests model handling of harmful content", 
        severity: "critical", 
        category: "NLP-Specific",
        testParams: {
          contentTypes: ["hate_speech", "violence", "explicit_content", "harassment"],
          safetyThreshold: 0.9
        }
      },
      { 
        id: "nlp_factual_1", 
        name: "TruthfulQA Benchmark", 
        description: "Evaluates model truthfulness using TruthfulQA benchmark suite", 
        severity: "high", 
        category: "NLP-Specific",
        testParams: {
          truthfulnessThreshold: 0.8,
          useTruthfulQA: true,
          checkFalsehoods: true,
          categories: ["science", "history", "current_events", "common_sense"]
        }
      },
      { 
        id: "nlp_factual_2", 
        name: "FactCC Consistency", 
        description: "Tests factual consistency using FactCC benchmark", 
        severity: "high", 
        category: "NLP-Specific",
        testParams: {
          consistencyThreshold: 0.7,
          useFactCC: true,
          checkExtrinsicErrors: true,
          checkIntrinsicErrors: true,
          errorTypes: ["contradiction", "hallucination", "omission"]
        }
      },
      { 
        id: "nlp_factual_3", 
        name: "Hallucination Detection", 
        description: "Detects and measures model hallucinations and fabrications", 
        severity: "critical", 
        category: "NLP-Specific",
        testParams: {
          hallucination_threshold: 0.3,
          check_internal_consistency: true,
          check_source_consistency: true,
          detection_methods: ["source_grounding", "fact_verification", "contradiction_analysis"]
        }
      },
      {
        id: "nlp_qa_1",
        name: "Question Answering Evaluation",
        description: "Evaluates model performance on various question types and domains",
        severity: "high",
        category: "NLP-Specific",
        testParams: {
          questionTypes: ["factoid", "yes_no", "multiple_choice", "open_ended"],
          domains: ["general", "technical", "domain_specific"],
          accuracyThreshold: 0.75
        }
      },
      {
        id: "nlp_summarization_1",
        name: "Summarization Quality",
        description: "Tests model's ability to generate accurate and coherent summaries",
        severity: "high",
        category: "NLP-Specific",
        testParams: {
          metrics: ["rouge", "bertscore", "factual_consistency"],
          minRougeScore: 0.4,
          minBertScore: 0.85,
          checkLengthConstraints: true
        }
      },
      {
        id: "nlp_translation_1",
        name: "Translation Accuracy",
        description: "Evaluates translation quality across language pairs",
        severity: "high",
        category: "NLP-Specific",
        testParams: {
          languagePairs: ["en-fr", "en-es", "en-de", "en-zh"],
          metrics: ["bleu", "chrf", "ter"],
          minBleuScore: 30,
          preserveMeaning: true
        }
      },
      {
        id: "nlp_generation_1",
        name: "Text Generation Quality",
        description: "Assesses quality, coherence, and style of generated text",
        severity: "high",
        category: "NLP-Specific",
        testParams: {
          aspects: ["coherence", "grammar", "style", "creativity"],
          minCoherenceScore: 0.8,
          checkStyleConsistency: true,
          diversityMetrics: ["distinct-1", "distinct-2", "entropy"]
        }
      },
      {
        id: "nlp_extraction_1",
        name: "Feature Extraction",
        description: "Tests model's ability to extract key information from text",
        severity: "medium",
        category: "NLP-Specific",
        testParams: {
          extractionTypes: ["named_entities", "relations", "events", "attributes"],
          minPrecision: 0.8,
          minRecall: 0.7,
          checkConsistency: true
        }
      }
    ]
  };