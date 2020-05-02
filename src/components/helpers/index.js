export const getDeepNestedFieldValue = (path, obj) => path.split('.').reduce((p, c) => (p && p[c]) || null, obj);
