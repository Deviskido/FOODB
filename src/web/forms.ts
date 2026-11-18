export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  source?: string;
  required?: boolean;
  hint?: string;
  value?: any;
};
const name: Field = {
    key: 'name',
    label: 'Name'
  },
  reason: Field = {
    key: 'reason',
    label: 'Reason'
  },
  lot: Field = {
    key: 'lotId',
    label: 'Lot',
    source: 'lots'
  },
  quantity: Field = {
    key: 'quantityMg',
    label: 'Quantity (mg)',
    type: 'number',
    hint: '1 kg = 1,000,000 mg'
  },
  revision: Field = {
    key: 'expectedRevision',
    label: 'Revision',
    type: 'hidden'
  };
export const forms: Record<string, Field[]> = {
  lots: [{
    ...name,
    label: 'Lot reference'
  }, quantity, {
    key: 'commodity',
    label: 'Commodity',
    value: 'tomato'
  }, {
    key: 'supplierId',
    label: 'Supplier',
    source: 'suppliers',
    required: false
  }, {
    key: 'locationId',
    label: 'Storage location',
    source: 'locations'
  }, {
    key: 'provenance',
    label: 'Provenance',
    value: 'unknown'
  }],
  suppliers: [name],
  locations: [name],
  samples: [name, lot, {
    key: 'method',
    label: 'Sampling method'
  }, {
    key: 'destroyedMg',
    label: 'Destroyed sample mass (mg)',
    type: 'number',
    required: false
  }],
  observations: [lot, {
    key: 'attribute',
    label: 'Attribute',
    options: ['ssc_brix', 'sugar', 'ph', 'titratable_acidity', 'mass', 'dimension', 'color', 'firmness', 'ripeness']
  }, {
    key: 'value',
    label: 'Measured value',
    hint: 'Leave blank to record a missing measurement',
    required: false
  }, {
    key: 'unit',
    label: 'Unit',
    options: ['°Bx', 'g/100g', 'pH', 'mg', 'g', 'kg', 'mm', 'category', 'N']
  }, {
    key: 'basis',
    label: 'Measurement basis',
    value: 'fresh weight'
  }, {
    key: 'method',
    label: 'Method',
    value: 'manual reference'
  }, {
    key: 'scope',
    label: 'Scope',
    options: ['lot', 'sample', 'item']
  }, {
    key: 'sampleId',
    label: 'Sample',
    source: 'samples',
    required: false
  }, {
    key: 'itemId',
    label: 'Item identity',
    required: false
  }, {
    key: 'observedAt',
    label: 'Observed at',
    type: 'datetime-local'
  }, {
    key: 'lower',
    label: 'Uncertainty lower bound',
    type: 'number',
    required: false
  }, {
    key: 'upper',
    label: 'Uncertainty upper bound',
    type: 'number',
    required: false
  }],
  specifications: [name, {
    key: 'intendedUse',
    label: 'Intended use',
    value: 'Tomato sauce'
  }, {
    key: 'attribute',
    label: 'Decisive attribute',
    options: ['ssc_brix', 'ph', 'titratable_acidity', 'sugar', 'firmness']
  }, {
    key: 'unit',
    label: 'Unit',
    options: ['°Bx', 'pH', 'g/100g', 'N']
  }, {
    key: 'basis',
    label: 'Basis',
    value: 'fresh weight'
  }, {
    key: 'min',
    label: 'Minimum',
    type: 'number'
  }, {
    key: 'max',
    label: 'Maximum',
    type: 'number'
  }, {
    key: 'maxAgeHours',
    label: 'Maximum evidence age (hours)',
    type: 'number',
    value: 24
  }],
  decisions: [lot, {
    key: 'specificationVersionId',
    label: 'Approved specification',
    source: 'specifications'
  }, {
    key: 'scope',
    label: 'Decision scope',
    options: ['lot', 'sample']
  }, {
    key: 'sampleId',
    label: 'Sample',
    source: 'samples',
    required: false
  }],
  holds: [lot, {
    key: 'kind',
    label: 'Hold category',
    options: ['safety', 'quality', 'identity', 'equipment', 'reconciliation']
  }, reason],
  routing: [lot, {
    key: 'destinationId',
    label: 'Destination',
    source: 'locations'
  }, quantity],
  recipes: [name, {
    key: 'ingredientsJson',
    label: 'Ingredients',
    type: 'ingredients'
  }, {
    key: 'stepsJson',
    label: 'Preparation steps',
    type: 'steps'
  }, {
    key: 'yieldMg',
    label: 'Expected yield (mg)',
    type: 'number'
  }, {
    key: 'allergensText',
    label: 'Allergens (comma separated)',
    required: false
  }, {
    key: 'validatedDomain',
    label: 'Validated operating domain',
    value: 'unvalidated'
  }, {
    key: 'rulesText',
    label: 'Optional bounded adaptation policy (JSON)',
    type: 'textarea',
    required: false,
    hint: 'Leave empty for fixed instructions. Policies require explicit input and output bounds.'
  }],
  adaptations: [{
    key: 'recipeVersionId',
    label: 'Approved recipe',
    source: 'recipes'
  }, {
    key: 'inputsJson',
    label: 'Input lots and quantities',
    type: 'inputs',
    source: 'lots',
    hint: 'Ingredient index 0 is the first ingredient, 1 is the second.'
  }],
  lineage: [name, {
    key: 'inputsJson',
    label: 'Source material',
    type: 'inputs',
    source: 'lots'
  }, quantity, {
    key: 'lossMg',
    label: 'Declared processing loss (mg)',
    type: 'number',
    value: 0
  }],
  permissions: [{
    key: 'recipeId',
    label: 'Private recipe identity ID'
  }, {
    key: 'publication',
    label: 'Permit publication',
    type: 'checkbox'
  }, {
    key: 'derivatives',
    label: 'Permit derivatives',
    type: 'checkbox'
  }, {
    key: 'export',
    label: 'Permit export',
    type: 'checkbox'
  }, {
    key: 'training',
    label: 'Permit training',
    type: 'checkbox'
  }, reason],
  models: [name, {
    key: 'domain',
    label: 'Declared operating domain'
  }, {
    key: 'maxError',
    label: 'Maximum absolute reference error',
    type: 'number'
  }, {
    key: 'minCoverage',
    label: 'Minimum uncertainty coverage (0–1)',
    type: 'number'
  }, {
    key: 'maxAgeHours',
    label: 'Maximum evaluation age (hours)',
    type: 'number'
  }],
  production: [name, {
    key: 'adaptationId',
    label: 'Approved adaptation',
    source: 'adaptations'
  }],
  products: [name, {
    key: 'packaging',
    label: 'Required packaging'
  }, {
    key: 'minTemperatureC',
    label: 'Minimum arrival temperature (°C)',
    type: 'number'
  }, {
    key: 'maxTemperatureC',
    label: 'Maximum arrival temperature (°C)',
    type: 'number'
  }, {
    key: 'maxTransitMinutes',
    label: 'Maximum transit time (minutes)',
    type: 'number'
  }],
  orders: [{
    ...name,
    label: 'Order reference'
  }, {
    key: 'productVersionId',
    label: 'Approved product',
    source: 'products'
  }, quantity],
  complaints: [name, {
    key: 'orderId',
    label: 'Order',
    source: 'orders'
  }, reason],
  withdrawals: [lot, reason],
  licenses: [name, {
    key: 'catalogVersionId',
    label: 'Catalog version ID'
  }, {
    key: 'startsAt',
    label: 'Starts at',
    type: 'datetime-local'
  }, {
    key: 'expiresAt',
    label: 'Expires at',
    type: 'datetime-local'
  }, {
    key: 'production',
    label: 'Permit production',
    type: 'checkbox'
  }, {
    key: 'export',
    label: 'Permit export',
    type: 'checkbox'
  }, {
    key: 'publication',
    label: 'Permit publication',
    type: 'checkbox'
  }, {
    key: 'derivatives',
    label: 'Permit derivatives',
    type: 'checkbox'
  }, {
    key: 'training',
    label: 'Permit training',
    type: 'checkbox'
  }],
  costs: [{
    ...name,
    label: 'Cost category'
  }, {
    key: 'amountMinor',
    label: 'Amount (minor currency units)',
    type: 'number'
  }, {
    key: 'currency',
    label: 'Currency code',
    value: 'USD'
  }],
  evaluations: [name, {
    key: 'population',
    label: 'Population'
  }, {
    key: 'baseline',
    label: 'Baseline'
  }, {
    key: 'endpoint',
    label: 'Primary endpoint'
  }, {
    key: 'replication',
    label: 'Independent replication plan'
  }, {
    key: 'confidenceRule',
    label: 'Confidence rule'
  }, {
    key: 'threshold',
    label: 'Pass threshold',
    type: 'number'
  }],
  calibrations: [name, {
    key: 'reference',
    label: 'Reference procedure'
  }, {
    key: 'expiresAt',
    label: 'Expires at',
    type: 'datetime-local'
  }],
  devices: [name],
  users: [name, {
    key: 'email',
    label: 'Email',
    type: 'email'
  }, {
    key: 'password',
    label: 'Temporary password (12+ characters)',
    type: 'password'
  }, {
    key: 'rolesText',
    label: 'Roles (comma separated)',
    value: 'viewer'
  }],
  'retention-policy': [reason],
  organizations: [name]
};
export const actionForms: Record<string, Field[]> = {
  approve: [reason],
  review: [reason],
  disable: [reason],
  delete: [reason],
  rotate: [],
  adjust: [{
    key: 'quantityMg',
    label: 'Signed mass adjustment (mg)',
    type: 'number'
  }, {
    key: 'evidenceText',
    label: 'Reconciliation evidence IDs (comma separated)'
  }, reason],
  release: [reason],
  revoke: [reason],
  retire: [reason],
  cancel: [reason],
  start: [],
  freeze: [],
  dispatch: [],
  allocate: [{
    key: 'batchId',
    label: 'Completed production batch',
    source: 'production'
  }, quantity],
  ready: [{
    key: 'packaging',
    label: 'Confirm exact packaging'
  }],
  'delivery-events': [{
    key: 'temperatureC',
    label: 'Arrival temperature (°C)',
    type: 'number'
  }, {
    key: 'packagingIntact',
    label: 'Packaging intact',
    type: 'checkbox'
  }],
  events: [{
    key: 'step',
    label: 'Step number (starting at 0)',
    type: 'number'
  }, {
    key: 'actual',
    label: 'Actual work performed',
    type: 'textarea'
  }, {
    key: 'deviation',
    label: 'Deviation (places batch on hold)',
    required: false
  }],
  complete: [{
    key: 'yieldMg',
    label: 'Actual finished yield (mg)',
    type: 'number'
  }, {
    key: 'assessment',
    label: 'Finished-food assessment',
    required: false
  }],
  outcome: [{
    key: 'outcome',
    label: 'Physical outcome',
    options: ['confirmed', 'failed', 'unknown']
  }],
  reconcile: [{
    key: 'outcome',
    label: 'Verified physical outcome',
    options: ['confirmed', 'failed']
  }, reason],
  results: [{
    key: 'valuesText',
    label: 'Independent results (comma separated)'
  }],
  actions: [{
    key: 'note',
    label: 'Corrective action',
    type: 'textarea'
  }]
};
export function prepare(resource: string, input: any) {
  const b = {
    ...input
  };
  for (const key of ['observedAt', 'startsAt', 'expiresAt']) if (b[key]) b[key] = new Date(b[key]).toISOString();
  if (resource === 'observations') {
    b.value = b.value === '' || b.value === undefined ? null : ['color', 'ripeness'].includes(b.attribute) ? b.value : Number(b.value);
    if (b.lower !== undefined && b.upper !== undefined) b.uncertainty = {
      kind: 'interval',
      lower: b.lower,
      upper: b.upper
    };
    delete b.lower;
    delete b.upper;
  }
  if (resource === 'specifications') b.rules = [{
    attribute: b.attribute,
    unit: b.unit,
    basis: b.basis,
    min: b.min,
    max: b.max,
    maxAgeHours: b.maxAgeHours
  }];
  if (resource === 'recipes' || resource === 'catalog') {
    b.ingredients = JSON.parse(b.ingredientsJson);
    b.steps = JSON.parse(b.stepsJson);
    b.allergens = (b.allergensText ?? '').split(',').map((x: string) => x.trim()).filter(Boolean);
    b.rules = b.rulesText ? JSON.parse(b.rulesText) : [];
    for (const k of ['ingredientName', 'ingredientMg', 'stepsText', 'allergensText', 'rulesText', 'ingredientsJson', 'stepsJson']) delete b[k];
  }
  if (resource === 'adaptations') {
    b.recipeRef = {
      kind: b.recipeKind ?? 'private',
      versionId: b.recipeKind === 'catalog' ? b.catalogVersionId : b.recipeVersionId
    };
    b.inputs = JSON.parse(b.inputsJson);
  }
  if (resource === 'lineage') b.inputs = JSON.parse(b.inputsJson);
  if (resource === 'models') b.monitoringPolicy = {
    maxError: b.maxError,
    minCoverage: b.minCoverage,
    maxAgeHours: b.maxAgeHours
  };
  if (b.pairsJson) b.pairs = JSON.parse(b.pairsJson);
  if (b.evidenceText) b.evidenceIds = b.evidenceText.split(',').map((x: string) => x.trim()).filter(Boolean);
  if (resource === 'users') b.roles = b.rolesText.split(',').map((x: string) => x.trim());
  if (b.valuesText) b.values = b.valuesText.split(',').map((value: string) => {
    if (!value.trim()) throw new Error('Each result must contain a numeric value.');
    return Number(value);
  });
  return b;
}
forms.catalog = forms.recipes;
forms.adaptations.unshift({
  key: 'recipeKind',
  label: 'Recipe source',
  options: ['private', 'catalog']
});
forms.adaptations.find(f => f.key === 'recipeVersionId')!.required = false;
forms.adaptations.splice(2, 0, {
  key: 'catalogVersionId',
  label: 'Licensed catalog version',
  source: 'catalog',
  required: false
});
forms.observations.push({
  key: 'origin',
  label: 'Evidence source',
  options: ['operator', 'instrument', 'model']
}, {
  key: 'calibrationId',
  label: 'Instrument calibration',
  source: 'calibrations',
  required: false
}, {
  key: 'modelId',
  label: 'Model version',
  source: 'models',
  required: false
}, {
  key: 'domain',
  label: 'Model operating domain',
  required: false
}, {
  key: 'evidenceText',
  label: 'Evidence attachment IDs (comma separated)',
  required: false
});
actionForms.evaluate = [{
  key: 'pairsJson',
  label: 'Prediction and reference pairs (JSON)',
  type: 'textarea',
  hint: 'Array of {"predictionId":"…","referenceId":"…"} from measurement records.'
}];
actionForms.suspend = [{
  key: 'reason',
  label: 'Suspension reason'
}];
