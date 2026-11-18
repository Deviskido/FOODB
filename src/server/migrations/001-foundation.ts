export const entities = ['suppliers', 'lots', 'samples', 'observations', 'specifications', 'specification_versions', 'quality_decisions', 'holds', 'locations', 'routing_commands', 'recipes', 'recipe_versions', 'adaptations', 'production_batches', 'licenses', 'products', 'product_versions', 'orders', 'packages', 'complaints', 'withdrawals', 'evaluations', 'costs', 'calibrations', 'models', 'approvals'] as const;
// Generated identity columns keep version payloads flexible while enforcing tenant relationships in SQLite.
const relationships: Record<string, Array<[string, string, boolean?]>> = {
  lots: [['supplierId', 'suppliers'], ['locationId', 'locations'], ['batchId', 'production_batches']],
  samples: [['lotId', 'lots', true]],
  observations: [['lotId', 'lots', true], ['sampleId', 'samples'], ['calibrationId', 'calibrations'], ['modelId', 'models']],
  specification_versions: [['specificationId', 'specifications', true]],
  quality_decisions: [['lotId', 'lots', true], ['specificationVersionId', 'specification_versions', true]],
  holds: [['lotId', 'lots', true]],
  routing_commands: [['lotId', 'lots', true], ['sourceId', 'locations', true], ['destinationId', 'locations', true]],
  recipe_versions: [['recipeId', 'recipes', true]],
  production_batches: [['adaptationId', 'adaptations', true], ['finishedLotId', 'lots']],
  product_versions: [['productId', 'products', true]],
  orders: [['productVersionId', 'product_versions', true]],
  packages: [['orderId', 'orders', true]],
  complaints: [['orderId', 'orders', true]],
  withdrawals: [['lotId', 'lots', true]],
  evaluations: [['modelId', 'models']]
};
function relationshipColumns(table: string) {
  return (relationships[table] ?? []).map(([key, target, required]) => `, ref_${key} TEXT GENERATED ALWAYS AS (json_extract(body,'$.${key}')) VIRTUAL ${required ? 'NOT NULL' : ''}`).join('') + (relationships[table] ?? []).map(([key, target]) => `, FOREIGN KEY(org_id,ref_${key}) REFERENCES ${target}(org_id,id)`).join('');
}
export const sql = `
CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,disabled INTEGER NOT NULL DEFAULT 0,platform_admin INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS memberships(org_id TEXT NOT NULL REFERENCES organizations(id),user_id TEXT NOT NULL REFERENCES users(id),roles TEXT NOT NULL,PRIMARY KEY(org_id,user_id));
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),org_id TEXT NOT NULL REFERENCES organizations(id),created_at INTEGER NOT NULL,last_seen INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts(account TEXT NOT NULL,at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),actor TEXT NOT NULL,roles TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS security_events(id TEXT PRIMARY KEY,org_id TEXT,actor TEXT,code TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),name TEXT NOT NULL,token TEXT UNIQUE,mode TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,last_seen TEXT);
CREATE TABLE IF NOT EXISTS integration_events(org_id TEXT NOT NULL REFERENCES organizations(id),id TEXT NOT NULL,hash TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(org_id,id));
CREATE TABLE IF NOT EXISTS evidence_files(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),name TEXT NOT NULL,mime TEXT NOT NULL,checksum TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL);
${entities.map(t => `CREATE TABLE IF NOT EXISTS ${t}(org_id TEXT NOT NULL REFERENCES organizations(id),id TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL,body TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL${relationshipColumns(t)},PRIMARY KEY(org_id,id)); CREATE INDEX IF NOT EXISTS ${t}_list ON ${t}(org_id,created_at,id);`).join('\n')}
CREATE TABLE IF NOT EXISTS inventory_events(org_id TEXT NOT NULL,id TEXT NOT NULL,lot_id TEXT NOT NULL,kind TEXT NOT NULL,quantity_mg INTEGER NOT NULL,location_id TEXT,reference TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(org_id,id),FOREIGN KEY(org_id,lot_id) REFERENCES lots(org_id,id));
CREATE TABLE IF NOT EXISTS reservations(org_id TEXT NOT NULL,id TEXT NOT NULL,lot_id TEXT NOT NULL,batch_id TEXT NOT NULL,quantity_mg INTEGER NOT NULL CHECK(quantity_mg>0),status TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(org_id,id),FOREIGN KEY(org_id,lot_id) REFERENCES lots(org_id,id));
CREATE TABLE IF NOT EXISTS lot_edges(org_id TEXT NOT NULL,parent_id TEXT NOT NULL,child_id TEXT NOT NULL,quantity_mg INTEGER NOT NULL CHECK(quantity_mg>0),PRIMARY KEY(org_id,parent_id,child_id),FOREIGN KEY(org_id,parent_id) REFERENCES lots(org_id,id),FOREIGN KEY(org_id,child_id) REFERENCES lots(org_id,id),CHECK(parent_id<>child_id));
CREATE TABLE IF NOT EXISTS production_inputs(org_id TEXT NOT NULL,batch_id TEXT NOT NULL,lot_id TEXT NOT NULL,quantity_mg INTEGER NOT NULL CHECK(quantity_mg>0),PRIMARY KEY(org_id,batch_id,lot_id),FOREIGN KEY(org_id,batch_id) REFERENCES production_batches(org_id,id),FOREIGN KEY(org_id,lot_id) REFERENCES lots(org_id,id));
CREATE TABLE IF NOT EXISTS production_events(org_id TEXT NOT NULL,id TEXT NOT NULL,batch_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(org_id,id),FOREIGN KEY(org_id,batch_id) REFERENCES production_batches(org_id,id));
CREATE TABLE IF NOT EXISTS usage_events(org_id TEXT NOT NULL,batch_id TEXT NOT NULL,kind TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(org_id,batch_id,kind),FOREIGN KEY(org_id,batch_id) REFERENCES production_batches(org_id,id));
CREATE TABLE IF NOT EXISTS order_allocations(org_id TEXT NOT NULL,id TEXT NOT NULL,order_id TEXT NOT NULL,batch_id TEXT NOT NULL,quantity_mg INTEGER NOT NULL CHECK(quantity_mg>0),PRIMARY KEY(org_id,id),FOREIGN KEY(org_id,order_id) REFERENCES orders(org_id,id),FOREIGN KEY(org_id,batch_id) REFERENCES production_batches(org_id,id));
CREATE TABLE IF NOT EXISTS delivery_events(org_id TEXT NOT NULL,id TEXT NOT NULL,order_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(org_id,id),FOREIGN KEY(org_id,order_id) REFERENCES orders(org_id,id));
CREATE TABLE IF NOT EXISTS permissions(org_id TEXT NOT NULL,id TEXT NOT NULL,recipe_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(org_id,id),FOREIGN KEY(org_id,recipe_id) REFERENCES recipes(org_id,id));
CREATE TABLE IF NOT EXISTS catalog_recipes(id TEXT PRIMARY KEY,name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS catalog_recipe_versions(id TEXT PRIMARY KEY,recipe_id TEXT NOT NULL REFERENCES catalog_recipes(id),body TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS deletion_instructions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,created_at TEXT NOT NULL,reason TEXT NOT NULL);
PRAGMA user_version = 1;
`;
