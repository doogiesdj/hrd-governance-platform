// OntoGraf shared constants — loaded before ontograf.js

const _ONTOGRAF_HIERARCHY = {
  // Competency taxonomy
  Literacy: 'Competency', SoftSkill: 'Competency', HardSkill: 'Competency',
  Basic_Academic: 'Literacy', Digital_Literacy: 'Literacy', Civic_Literacy: 'Literacy',
  Social_Value: 'Civic_Literacy',
  Ethics: 'Social_Value', Global_Citizenship: 'Social_Value', Environmental_Awareness: 'Social_Value',
  Language_and_Math: 'Basic_Academic', CS_Foundation: 'Basic_Academic',
  Foreign_Language: 'Language_and_Math', Business_Writing: 'Language_and_Math',
  Numeracy: 'Language_and_Math', Statistics: 'Language_and_Math',
  Algorithm: 'CS_Foundation', Computer_Science: 'CS_Foundation',
  Data_Structure: 'CS_Foundation', OS: 'CS_Foundation',
  Data_and_AI: 'Digital_Literacy', Data_Fluency: 'Digital_Literacy', Tech_Security: 'Digital_Literacy',
  AI_Utilization: 'Data_and_AI', Data_Analysis_Basic: 'Data_and_AI',
  Privacy_Protection: 'Tech_Security', Network_Ethics: 'Tech_Security', Info_Security: 'Tech_Security',
  Self_Management: 'SoftSkill', Interpersonal: 'SoftSkill', Problem_Solving: 'SoftSkill',
  Adaptability: 'Self_Management', Reliability: 'Self_Management',
  Time_Management: 'Adaptability', Resilience: 'Adaptability', Continuous_Learning: 'Adaptability',
  Responsibility: 'Reliability', Integrity: 'Reliability', Professionalism: 'Reliability',
  Collaboration: 'Interpersonal', Leadership: 'Interpersonal',
  Networking: 'Collaboration', Conflict_Management: 'Collaboration', Negotiation: 'Collaboration',
  Motivation: 'Leadership', Coaching: 'Leadership', Team_Building: 'Leadership', Vision_Setting: 'Leadership',
  Creativity: 'Problem_Solving', Thinking_Skill: 'Problem_Solving',
  Design_Thinking: 'Creativity', Innovation: 'Creativity', Creative_Planning: 'Creativity',
  Strategic_Thinking: 'Thinking_Skill', Logical_Reasoning: 'Thinking_Skill', Critical_Analysis: 'Thinking_Skill',
  Business_Admin: 'HardSkill', Industrial_Tech: 'HardSkill', ICT_Dev: 'HardSkill',
  Management: 'Business_Admin', Marketing_Strategy: 'Business_Admin', Marketing_Sales: 'Business_Admin',
  Strategy: 'Management', Legal_Affairs: 'Management', HR_Management: 'Management', Accounting: 'Management',
  Digital_Branding: 'Marketing_Sales', Market_Research: 'Marketing_Sales', Sales_Management: 'Marketing_Sales',
  Service_Public: 'Industrial_Tech', Manufacturing: 'Industrial_Tech',
  Public_Admin: 'Service_Public', Social_Welfare: 'Service_Public', Education_Planning: 'Service_Public',
  Semiconductor_Design: 'Manufacturing', Welding: 'Manufacturing', Quality_Control: 'Manufacturing',
  Software: 'ICT_Dev', AI_and_Infrastructure: 'ICT_Dev',
  Mobile_App: 'Software', Web_Dev: 'Software', Java: 'Software',
  MLOps: 'AI_and_Infrastructure', Cloud_Arch: 'AI_and_Infrastructure',
  LLM_Fine_Tuning: 'AI_and_Infrastructure', DevOps: 'AI_and_Infrastructure',
  // Organization types
  LocalGovernment: 'Organization', ResearchCenter: 'Organization', PublicInstitution: 'Organization',
  GovernmentAgency: 'Organization', CertificationBody: 'Organization', Enterprise: 'Organization',
  CentralMinistry: 'Organization',
  // Policy types
  TuitionSupport: 'Policy', EmploymentSubsidy: 'Policy', R_D_Project: 'Policy', PublicPolicy: 'Policy',
  VoucherProgram: 'Policy', TrainingIncentive: 'Policy',
  // Budget types
  OrgBudget: 'Budget', PolicyBudget: 'Budget', StrategyBudget: 'Budget',
  // EducationProgram types
  K_DigitalTraining: 'EducationProgram', DegreeCourse: 'EducationProgram', JobRetraining: 'EducationProgram',
  OnlineModule: 'EducationProgram', WorkshopSeminar: 'EducationProgram',
  // HumanResource types
  Unemployed: 'HumanResource', Student: 'HumanResource', Incumbent: 'HumanResource', Person: 'HumanResource',
  RetiredProfessional: 'Person', HighPerformer: 'Person',
  // Region
  GangLeng: 'Region', Daejeon: 'Region', Inchun: 'Region', Busan: 'Region',
  Guangju: 'Region', Daegu: 'Region', Seoul: 'Region', Geoje: 'Region', Sejong: 'Region', Suwon: 'Region',
  // Outcome types
  Employment: 'Outcome', Entrepreneurship: 'Outcome', EconomicImpact: 'Outcome',
  SocialImpact: 'Outcome', SkillGrowth: 'Outcome', RevenueGrowth: 'Outcome',
  // Events
  PolicyParticipation: 'Event', OutcomeMeasurement: 'Event', AssessmentEvent: 'Event',
  ProgramCompletion: 'Event', ProgramEnrollment: 'Event',
  // Others
  JuniorTalent: 'TalentSegment',
  Active: 'EmploymentStatus', Retired: 'EmploymentStatus',
  // CompetencyCategory taxonomy
  COMPCAT_Leadership: 'CompetencyCategory', COMPCAT_Management: 'CompetencyCategory',
  COMPCAT_Thinking_Skill: 'CompetencyCategory', COMPCAT_ICT: 'CompetencyCategory',
  COMPCAT_Manufacturing: 'CompetencyCategory', COMPCAT_Service: 'CompetencyCategory',
  COMPCAT_AI_and_Infrastructure: 'CompetencyCategory', COMPCAT_Adaptability: 'CompetencyCategory',
  COMPCAT_AdminLaw: 'CompetencyCategory', COMPCAT_Basic_Academic: 'CompetencyCategory',
  COMPCAT_BioHealth: 'CompetencyCategory', COMPCAT_CS_Foundation: 'CompetencyCategory',
  COMPCAT_Collaboration: 'CompetencyCategory', COMPCAT_Creativity: 'CompetencyCategory',
  COMPCAT_Data_Fluency: 'CompetencyCategory', COMPCAT_Defense_Industry: 'CompetencyCategory',
  COMPCAT_Design: 'CompetencyCategory', COMPCAT_Digital_Literacy: 'CompetencyCategory',
  COMPCAT_Green_Tech: 'CompetencyCategory', COMPCAT_Marketing_Sales: 'CompetencyCategory',
  COMPCAT_Marketing_Strategy: 'CompetencyCategory', COMPCAT_Mobility: 'CompetencyCategory',
  COMPCAT_Reliability: 'CompetencyCategory', COMPCAT_Semiconductor_Design: 'CompetencyCategory',
  COMPCAT_Service_Public: 'CompetencyCategory', COMPCAT_Shipbuilding: 'CompetencyCategory',
  COMPCAT_Social_Value: 'CompetencyCategory', COMPCAT_Software: 'CompetencyCategory',
  COMPCAT_Space_Aerospace: 'CompetencyCategory', COMPCAT_Tech_Security: 'CompetencyCategory',
};

const _ONTOGRAF_ROOT_CLASSES = [
  'Benefit', 'Budget', 'CareerHistory', 'Certification', 'Competency',
  'CompetencyAssessment', 'CompetencyCategory', 'CompetencyGap',
  'EducationProgram', 'EmploymentStatus', 'Event', 'HumanResource',
  'MatchScore', 'NationalStrategy', 'Occupation', 'Organization', 'Outcome',
  'Policy', 'Recommendation', 'Region', 'StrategicGoal',
  'TalentSegment', 'TargetGroup'
];
