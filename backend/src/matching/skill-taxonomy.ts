/**
 * Canonical skill taxonomy + normalization/extraction. Keeps skill matching
 * off raw strings: "SpringBoot"/"Spring Boot" normalize to one canonical skill,
 * and related terms don't silently satisfy an exact requirement.
 *
 * Extend CANONICAL_SKILLS as coverage grows; the extractor is dictionary-based
 * (deterministic, explainable) rather than an opaque model.
 */

// canonical -> aliases/acronyms (all matched case-insensitively, word-boundary)
export const CANONICAL_SKILLS: Record<string, string[]> = {
  JavaScript: ['javascript', 'js', 'ecmascript'],
  TypeScript: ['typescript', 'ts'],
  Python: ['python'],
  Java: ['java'],
  'Spring Boot': ['spring boot', 'springboot', 'spring-boot'],
  Kotlin: ['kotlin'],
  Scala: ['scala'],
  Go: ['golang', 'go lang'],
  Rust: ['rust'],
  'C++': ['c\\+\\+', 'cpp'],
  'C#': ['c#', 'c sharp', 'csharp'],
  '.NET': ['\\.net', 'dotnet'],
  Ruby: ['ruby'],
  Rails: ['ruby on rails', 'rails'],
  PHP: ['php'],
  Swift: ['swift'],
  'Objective-C': ['objective-c', 'objective c'],
  React: ['react', 'react.js', 'reactjs'],
  'Next.js': ['next.js', 'nextjs'],
  Vue: ['vue', 'vue.js', 'vuejs'],
  Angular: ['angular', 'angular.js', 'angularjs'],
  'Node.js': ['node.js', 'nodejs', 'node js', 'node'],
  Express: ['express', 'express.js'],
  Django: ['django'],
  Flask: ['flask'],
  FastAPI: ['fastapi'],
  GraphQL: ['graphql'],
  REST: ['rest api', 'restful', 'rest'],
  gRPC: ['grpc'],
  HTML: ['html', 'html5'],
  CSS: ['css', 'css3', 'scss', 'sass'],
  Tailwind: ['tailwind', 'tailwindcss'],
  AWS: ['aws', 'amazon web services'],
  GCP: ['gcp', 'google cloud'],
  Azure: ['azure', 'microsoft azure'],
  Docker: ['docker'],
  Kubernetes: ['kubernetes', 'k8s'],
  Terraform: ['terraform'],
  Ansible: ['ansible'],
  'CI/CD': ['ci/cd', 'cicd', 'continuous integration'],
  Jenkins: ['jenkins'],
  Git: ['git'], // NOT github/gitlab — those false-match the company name in descriptions
  Linux: ['linux', 'unix'],
  PostgreSQL: ['postgresql', 'postgres', 'psql'],
  MySQL: ['mysql'],
  MongoDB: ['mongodb', 'mongo'],
  Redis: ['redis'],
  Elasticsearch: ['elasticsearch', 'elastic search', 'opensearch'],
  Kafka: ['kafka', 'apache kafka'],
  RabbitMQ: ['rabbitmq'],
  SQL: ['sql'],
  Snowflake: ['snowflake'],
  dbt: ['dbt'],
  Airflow: ['airflow', 'apache airflow'],
  Spark: ['spark', 'apache spark', 'pyspark'],
  Hadoop: ['hadoop'],
  'Machine Learning': ['machine learning', 'ml'],
  'Deep Learning': ['deep learning'],
  NLP: ['nlp', 'natural language processing'],
  TensorFlow: ['tensorflow'],
  PyTorch: ['pytorch'],
  'scikit-learn': ['scikit-learn', 'sklearn'],
  Pandas: ['pandas'],
  NumPy: ['numpy'],
  LLMs: ['llm', 'llms', 'large language models', 'genai', 'generative ai'],
  'Data Engineering': ['data engineering'],
  'Data Science': ['data science'],
  'Data Analysis': ['data analysis', 'data analytics'],
  Tableau: ['tableau'],
  'Power BI': ['power bi', 'powerbi'],
  Looker: ['looker'],
  Excel: ['excel'],
  Android: ['android'],
  iOS: ['ios'],
  'React Native': ['react native'],
  Flutter: ['flutter'],
  Figma: ['figma'],
  'Product Management': ['product management', 'product manager'],
  'Project Management': ['project management'],
  Agile: ['agile', 'scrum'],
  'System Design': ['system design', 'distributed systems'],
  Microservices: ['microservices', 'micro-services'],
  Salesforce: ['salesforce'],
  SEO: ['seo'],
};

// Precompute an alias -> canonical lookup and a matcher regex per alias.
const ALIAS_TO_CANON: { canon: string; re: RegExp }[] = [];
for (const [canon, aliases] of Object.entries(CANONICAL_SKILLS)) {
  for (const a of aliases) {
    // word-ish boundaries that tolerate ., +, # in skill names
    ALIAS_TO_CANON.push({ canon, re: new RegExp(`(^|[^a-z0-9+#.])(${a})([^a-z0-9+#]|$)`, 'i') });
  }
}

/** Normalize a raw skill string to its canonical form (or a trimmed original). */
export function normalizeSkill(raw: string): string {
  const t = (raw || '').trim();
  if (!t) return '';
  const low = t.toLowerCase();
  for (const { canon, aliases } of Object.entries(CANONICAL_SKILLS).map(([canon, aliases]) => ({ canon, aliases }))) {
    if (aliases.some((a) => low === a.replace(/\\/g, ''))) return canon;
  }
  return t;
}

export function normalizeSkills(skills?: string[]): string[] {
  const out = new Set<string>();
  for (const s of skills || []) {
    const n = normalizeSkill(s);
    if (n) out.add(n);
  }
  return [...out];
}

/** Extract canonical skills mentioned in free text (title + description). */
export function extractSkills(text?: string, cap = 15): string[] {
  const hay = (text || '').slice(0, 6000);
  if (!hay) return [];
  const found = new Set<string>();
  for (const { canon, re } of ALIAS_TO_CANON) {
    if (found.has(canon)) continue;
    if (re.test(hay)) found.add(canon);
    if (found.size >= cap) break;
  }
  return [...found];
}
