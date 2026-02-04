export function calculateDiff(
  oldValues: Record<string, any> | undefined,
  newValues: Record<string, any> | undefined,
): Record<string, any> {
  const diff: Record<string, any> = {};

  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]);

  for (const key of allKeys) {
    const oldValue = oldValues?.[key] as
      | string
      | number
      | boolean
      | null
      | undefined;
    const newValue = newValues?.[key] as
      | string
      | number
      | boolean
      | null
      | undefined;

    if (shouldIgnoreField(key)) {
      continue;
    }

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diff[key] = {
        from: oldValue,
        to: newValue,
      };
    }
  }

  return diff;
}

function shouldIgnoreField(fieldName: string): boolean {
  const ignoredFields = [
    'password',
    'mfa_secret',
    'updated_at',
    'last_login_at',
  ];
  return ignoredFields.includes(fieldName);
}

export function sanitizeValues(
  values: Record<string, any> | undefined,
): Record<string, any> | undefined {
  if (!values) return values;

  const sanitized = { ...values };
  const sensitiveFields = ['password', 'mfa_secret'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
