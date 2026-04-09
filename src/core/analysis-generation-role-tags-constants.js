const ROLE_PATTERNS = {
  user: [
    'route', 'routes', 'controller', 'controllers', 'handler', 'handlers',
    'api', 'middleware', 'page', 'pages', 'ui', 'frontend', 'web', 'client', 'request'
  ],
  auth: [
    'auth', 'authentication', 'authorization', 'session', 'signin', 'login',
    'signup', 'token', 'jwt', 'oauth', 'sso', 'passport', 'identity', 'acl',
    'guard', 'permission', 'password', 'mfa', 'security'
  ],
  database: [
    'db', 'database', 'data', 'datastore', 'repository', 'repo', 'model',
    'schema', 'migration', 'query', 'querybuilder', 'prisma', 'typeorm',
    'sequelize', 'mongoose', 'knex', 'drizzle', 'redis', 'postgres', 'mysql',
    'sqlite', 'mongo', 'dynamodb', 'd1'
  ],
  events: [
    'event', 'events', 'queue', 'worker', 'cron', 'scheduler', 'webhook',
    'pubsub', 'bus', 'publish', 'subscriber', 'consumer', 'producer',
    'listener', 'trigger'
  ],
  integrations: [
    'integration', 'webhook', 'gateway', 'stripe', 'pay', 'sendgrid', 'twilio',
    'sentry', 'github', 'slack', 'analytics', 'mail', 'smtp', 'storage'
  ],
  security: [
    'security', 'threat', 'attack', 'rate', 'encrypt', 'decrypt', 'signature',
    'hash', 'verify', 'csrf', 'xss', 'audit', 'compliance', 'policy', 'vault',
    'kms', 'secret', 'key'
  ],
  agent: [
    'agent', 'supervisor', 'orchestrator', 'planner', 'executor', 'swarm',
    'crew', 'runner', 'coordinator', 'assistant', 'brain'
  ],
  tool: [
    'tool', 'tools', 'plugin', 'plugins', 'action', 'actions',
    'function_calling', 'functioncalling', 'capability', 'skill'
  ],
  memory: [
    'memory', 'vector', 'vectorstore', 'embedding', 'embeddings',
    'retrieval', 'rag', 'chroma', 'pinecone', 'weaviate', 'faiss',
    'context', 'recall', 'longterm', 'shortterm'
  ],
  llm: [
    'llm', 'openai', 'anthropic', 'gemini', 'claude', 'ollama', 'gpt',
    'completion', 'inference', 'model', 'prompt', 'chat', 'generation'
  ],
};

const SENSITIVE_RISK_TAGS = new Set(['auth', 'database', 'security']);

module.exports = {
  ROLE_PATTERNS,
  SENSITIVE_RISK_TAGS,
};
