const { z } = require('zod');

/**
 * Zod schema for architecture rules validation
 * Used to validate .architecture.yml files
 */

// Single rule schema
const ruleSchema = z.object({
  name: z.string()
    .min(1, 'Rule name is required')
    .max(100, 'Rule name must be less than 100 characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  layer: z.union([
    z.string().min(1, 'Layer pattern is required'),
    z.array(z.string().min(1, 'Layer pattern cannot be empty'))
      .min(1, 'At least one layer pattern is required')
  ]),
  
  // Import constraint rules
  must_not_import_from: z.array(z.string())
    .optional()
    .describe('List of patterns that files in this layer must not import'),
  
  may_import_from: z.array(z.string())
    .optional()
    .describe('Whitelist of allowed import patterns'),
  
  must_import_from: z.array(z.string())
    .optional()
    .describe('List of patterns that files in this layer must import'),
  
}).refine(
  (data) => {
    // At least one constraint must be specified
    return data.must_not_import_from || 
           data.may_import_from || 
           data.must_import_from;
  },
  {
    message: 'Rule must specify at least one constraint (must_not_import_from, may_import_from, or must_import_from)',
    path: ['constraints']
  }
).refine(
  (data) => {
    // Validate that layer patterns don't contain '..' or absolute paths
    const patterns = Array.isArray(data.layer) ? data.layer : [data.layer];
    return patterns.every(p => !p.includes('..') && !p.startsWith('/'));
  },
  {
    message: 'Layer patterns cannot contain ".." or absolute paths',
    path: ['layer']
  }
);

// Full configuration schema
const configSchema = z.object({
  version: z.string()
    .regex(/^[0-9]+\.[0-9]+$/, 'Version must be in format "X.Y"')
    .default('1.0'),
  
  extends: z.string()
    .optional()
    .describe('Path to base configuration file to extend'),
  
  rules: z.array(ruleSchema)
    .min(1, 'At least one rule is required'),
}).strict(); // Reject unknown properties for safety

/**
 * Validate configuration against schema
 * @param {Object} config - Parsed configuration
 * @returns {Object} Validation result
 */
function validateConfig(config) {
  const result = configSchema.safeParse(config);
  
  if (!result.success) {
    const errors = result.error.issues.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      value: String(err.received).slice(0, 100) // Truncate large values
    }));
    
    return {
      valid: false,
      errors
    };
  }
  
  return {
    valid: true,
    data: result.data
  };
}

/**
 * Validate a single rule
 * @param {Object} rule - Rule configuration
 * @returns {Object} Validation result
 */
function validateRule(rule) {
  const result = ruleSchema.safeParse(rule);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))
    };
  }
  
  return {
    valid: true,
    data: result.data
  };
}

/**
 * Get default configuration
 * @returns {Object}
 */
function getDefaultConfig() {
  return {
    version: '1.0',
    rules: [
      {
        name: 'Domain isolation',
        description: 'Domain logic should not depend on UI',
        layer: 'src/domain',
        must_not_import_from: ['src/ui', 'src/components']
      },
      {
        name: 'API contract',
        description: 'API routes only use domain and shared',
        layer: 'src/api',
        may_import_from: ['src/domain', 'src/shared', 'src/types'],
        must_not_import_from: ['src/ui']
      }
    ]
  };
}

module.exports = {
  configSchema,
  ruleSchema,
  validateConfig,
  validateRule,
  getDefaultConfig
};
