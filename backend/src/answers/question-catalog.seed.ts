import { QuestionClass } from '../schemas/question-catalog.schema';

/**
 * Seed catalog: the questions nearly every ATS form asks.
 *
 * `patterns` are matched as plain substrings against the NORMALIZED question
 * (see question-normalizer), so they must already be lowercase, punctuation-free
 * and stopword-stripped. "are you legally authorized to work" normalizes to
 * "authorized work", which is why the patterns look terse.
 *
 * `profileField` names the `AnswerProfile` field that satisfies the question.
 * `countryScoped` marks questions whose answer depends on a country named in
 * the question text itself.
 *
 * The class is what decides who may answer: ATTESTATION and DEMOGRAPHIC can
 * only ever come from the candidate.
 */
export interface SeedQuestion {
  questionKey: string;
  canonicalText: string;
  patterns: string[];
  questionClass: QuestionClass;
  profileField?: string;
  countryScoped?: boolean;
}

export const QUESTION_CATALOG_SEED: SeedQuestion[] = [
  // ---- Identity --------------------------------------------------------
  { questionKey: 'first-name', canonicalText: 'First name', patterns: ['first name', 'given name'], questionClass: QuestionClass.IDENTITY, profileField: 'firstName' },
  { questionKey: 'last-name', canonicalText: 'Last name', patterns: ['last name', 'family name', 'surname'], questionClass: QuestionClass.IDENTITY, profileField: 'lastName' },
  { questionKey: 'full-name', canonicalText: 'Full name', patterns: ['full name'], questionClass: QuestionClass.IDENTITY, profileField: 'fullName' },
  { questionKey: 'preferred-name', canonicalText: 'Preferred name', patterns: ['preferred name', 'name go by'], questionClass: QuestionClass.IDENTITY, profileField: 'preferredName' },
  { questionKey: 'email', canonicalText: 'Email address', patterns: ['email'], questionClass: QuestionClass.IDENTITY, profileField: 'email' },
  { questionKey: 'phone', canonicalText: 'Phone number', patterns: ['phone', 'mobile number', 'telephone'], questionClass: QuestionClass.IDENTITY, profileField: 'phone' },
  { questionKey: 'location', canonicalText: 'Current location', patterns: ['location', 'city', 'where based', 'current address'], questionClass: QuestionClass.IDENTITY, profileField: 'addressCity' },
  { questionKey: 'linkedin', canonicalText: 'LinkedIn profile', patterns: ['linkedin'], questionClass: QuestionClass.IDENTITY, profileField: 'linkedinUrl' },
  { questionKey: 'github', canonicalText: 'GitHub profile', patterns: ['github', 'git hub'], questionClass: QuestionClass.IDENTITY, profileField: 'githubUrl' },
  { questionKey: 'portfolio', canonicalText: 'Portfolio', patterns: ['portfolio'], questionClass: QuestionClass.IDENTITY, profileField: 'portfolioUrl' },
  { questionKey: 'website', canonicalText: 'Personal website', patterns: ['website', 'personal site'], questionClass: QuestionClass.IDENTITY, profileField: 'websiteUrl' },

  // ---- Attestations: candidate-stated only ------------------------------
  {
    questionKey: 'work-authorization',
    canonicalText: 'Are you authorized to work in this country?',
    patterns: ['authorized work', 'work authorization', 'authorised work', 'right work', 'eligible work', 'legally work', 'work permit'],
    questionClass: QuestionClass.ATTESTATION,
    profileField: 'workAuthorization',
    countryScoped: true,
  },
  {
    questionKey: 'sponsorship-required',
    canonicalText: 'Will you now or in the future require visa sponsorship?',
    patterns: ['require sponsorship', 'need sponsorship', 'visa sponsorship', 'sponsorship now future', 'immigration sponsorship'],
    questionClass: QuestionClass.ATTESTATION,
    profileField: 'workAuthorization',
    countryScoped: true,
  },
  { questionKey: 'age-18', canonicalText: 'Are you at least 18 years old?', patterns: ['18 years', 'least 18', 'age 18', 'over 18'], questionClass: QuestionClass.ATTESTATION, profileField: 'isAtLeast18' },
  { questionKey: 'criminal-conviction', canonicalText: 'Have you been convicted of a crime?', patterns: ['convicted', 'criminal record', 'criminal conviction', 'felony'], questionClass: QuestionClass.ATTESTATION, profileField: 'criminalConvictionDisclosure' },
  { questionKey: 'security-clearance', canonicalText: 'Do you hold a security clearance?', patterns: ['security clearance', 'clearance level'], questionClass: QuestionClass.ATTESTATION, profileField: 'securityClearance' },
  { questionKey: 'work-restrictions', canonicalText: 'Are there restrictions on your ability to work?', patterns: ['restrictions ability work', 'non compete', 'noncompete', 'restrictive covenant'], questionClass: QuestionClass.ATTESTATION, profileField: 'hasWorkRestrictions' },

  // ---- Demographics: default to declining -------------------------------
  { questionKey: 'eeo-gender', canonicalText: 'Gender', patterns: ['gender'], questionClass: QuestionClass.DEMOGRAPHIC, profileField: 'eeoGender' },
  { questionKey: 'eeo-ethnicity', canonicalText: 'Race / ethnicity', patterns: ['ethnicity', 'race', 'hispanic latino'], questionClass: QuestionClass.DEMOGRAPHIC, profileField: 'eeoEthnicity' },
  { questionKey: 'eeo-veteran', canonicalText: 'Veteran status', patterns: ['veteran'], questionClass: QuestionClass.DEMOGRAPHIC, profileField: 'eeoVeteranStatus' },
  { questionKey: 'eeo-disability', canonicalText: 'Disability status', patterns: ['disability', 'disabled'], questionClass: QuestionClass.DEMOGRAPHIC, profileField: 'eeoDisabilityStatus' },

  // ---- Preferences ------------------------------------------------------
  { questionKey: 'salary-expectation', canonicalText: 'Salary expectation', patterns: ['salary expectation', 'expected salary', 'compensation expectation', 'desired salary', 'salary requirement'], questionClass: QuestionClass.PREFERENCE, profileField: 'salaryExpectationAmount' },
  { questionKey: 'notice-period', canonicalText: 'Notice period', patterns: ['notice period', 'notice required'], questionClass: QuestionClass.PREFERENCE, profileField: 'noticePeriodDays' },
  { questionKey: 'earliest-start', canonicalText: 'Earliest start date', patterns: ['start date', 'when start', 'available start', 'availability'], questionClass: QuestionClass.PREFERENCE, profileField: 'earliestStartDate' },
  { questionKey: 'willing-relocate', canonicalText: 'Are you willing to relocate?', patterns: ['willing relocate', 'open relocation', 'relocate'], questionClass: QuestionClass.PREFERENCE, profileField: 'willingToRelocate' },
  { questionKey: 'willing-travel', canonicalText: 'Are you willing to travel?', patterns: ['willing travel', 'travel percentage', 'travel requirement'], questionClass: QuestionClass.PREFERENCE, profileField: 'willingToTravelPercent' },

  // ---- Prose: the only class a model may draft --------------------------
  { questionKey: 'why-company', canonicalText: 'Why do you want to work here?', patterns: ['why want work', 'why interested', 'why join', 'what excites about'], questionClass: QuestionClass.PROSE },
  { questionKey: 'why-role', canonicalText: 'Why are you a good fit for this role?', patterns: ['why good fit', 'why right fit', 'what makes good candidate', 'why should hire'], questionClass: QuestionClass.PROSE },
  { questionKey: 'about-yourself', canonicalText: 'Tell us about yourself', patterns: ['tell about yourself', 'about yourself', 'introduce yourself'], questionClass: QuestionClass.PROSE },
  { questionKey: 'greatest-achievement', canonicalText: 'What is your greatest achievement?', patterns: ['greatest achievement', 'proudest', 'accomplishment most proud'], questionClass: QuestionClass.PROSE },
  { questionKey: 'relevant-experience', canonicalText: 'Describe your relevant experience', patterns: ['describe relevant experience', 'relevant experience', 'experience related'], questionClass: QuestionClass.PROSE },
  { questionKey: 'additional-information', canonicalText: 'Anything else we should know?', patterns: ['anything else', 'additional information', 'other information', 'additional comments'], questionClass: QuestionClass.PROSE },
  { questionKey: 'cover-letter-text', canonicalText: 'Cover letter', patterns: ['cover letter'], questionClass: QuestionClass.PROSE },

  // ---- Files ------------------------------------------------------------
  { questionKey: 'resume-upload', canonicalText: 'Résumé / CV', patterns: ['resume', 'cv', 'curriculum vitae'], questionClass: QuestionClass.FILE, profileField: 'resume' },
  { questionKey: 'cover-letter-upload', canonicalText: 'Cover letter upload', patterns: ['upload cover letter', 'attach cover letter'], questionClass: QuestionClass.FILE, profileField: 'coverLetter' },

  // ---- Miscellaneous but very common ------------------------------------
  { questionKey: 'how-did-you-hear', canonicalText: 'How did you hear about us?', patterns: ['how hear about', 'how did hear', 'referral source', 'where hear about'], questionClass: QuestionClass.PREFERENCE },
  { questionKey: 'worked-here-before', canonicalText: 'Have you worked here before?', patterns: ['worked here before', 'previously employed', 'former employee'], questionClass: QuestionClass.ATTESTATION },
  { questionKey: 'referred-by', canonicalText: 'Were you referred by an employee?', patterns: ['referred employee', 'referred by', 'employee referral'], questionClass: QuestionClass.PREFERENCE },
  { questionKey: 'pronouns', canonicalText: 'Pronouns', patterns: ['pronouns'], questionClass: QuestionClass.DEMOGRAPHIC },
  { questionKey: 'currently-employed', canonicalText: 'Are you currently employed?', patterns: ['currently employed', 'current employer'], questionClass: QuestionClass.ATTESTATION },
];
