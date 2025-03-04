from .technical_safety.perturbation_test import PerturbationTest
from .technical_safety.adversarial_test import AdversarialTest
from .technical_safety.prompt_injection_test import PromptInjectionTest
from .technical_safety.data_extraction_test import DataExtractionTest
from .technical_safety.evasion_test import EvasionTest

from .fairness_bias.demographic_test import DemographicTest
from .fairness_bias.disparate_impact_test import DisparateImpactTest
from .fairness_bias.bias_mitigation_test import BiasMitigationTest
from .fairness_bias.intersectional_test import IntersectionalTest

from .regulatory.compliance_test import ComplianceTest
from .regulatory.industry_specific_test import IndustrySpecificTest
from .regulatory.ethics_test import EthicsTest

from .nlp_specific.linguistic_variation_test import LinguisticVariationTest
from .nlp_specific.adversarial_robustness_test import AdversarialRobustnessTest
from .nlp_specific.linguistic_bias_test import LinguisticBiasTest
from .nlp_specific.harmful_content_test import HarmfulContentTest
from .nlp_specific.truthfulqa_test import TruthfulQATest
from .nlp_specific.factcc_test import FactCCTest
from .nlp_specific.hallucination_test import HallucinationTest
from .nlp_specific.qa_evaluation_test import QAEvaluationTest
from .nlp_specific.summarization_test import SummarizationTest

from ..base import TestRegistry

# Create a test registry instance
test_registry = TestRegistry()

# Register Technical Safety tests
test_registry.register(PerturbationTest())
test_registry.register(AdversarialTest())
test_registry.register(PromptInjectionTest())
test_registry.register(DataExtractionTest())
test_registry.register(EvasionTest())

# Register Fairness & Bias tests
test_registry.register(DemographicTest())
test_registry.register(DisparateImpactTest())
test_registry.register(BiasMitigationTest())
test_registry.register(IntersectionalTest())

# Register Regulatory Compliance tests
test_registry.register(ComplianceTest())
test_registry.register(IndustrySpecificTest())
test_registry.register(EthicsTest())

# Register NLP-Specific tests
test_registry.register(LinguisticVariationTest())
test_registry.register(AdversarialRobustnessTest())
test_registry.register(LinguisticBiasTest())
test_registry.register(HarmfulContentTest())
test_registry.register(TruthfulQATest())
test_registry.register(FactCCTest())
test_registry.register(HallucinationTest())
test_registry.register(QAEvaluationTest())
test_registry.register(SummarizationTest()) 