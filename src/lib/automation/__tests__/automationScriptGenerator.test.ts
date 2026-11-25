import assert from 'assert';
import {
  generateSelectedInstallationScript,
  BUILT_IN_AUTOMATION_SCRIPTS,
} from '../scriptGenerator';
import { TOOL_CATALOG, TOOL_CATEGORIES } from '../toolCatalog';

export function runVerification() {
  console.log('Running Server Setup & Automation Script Generator Verification...');

  // 1. Tool Categories
  assert.strictEqual(TOOL_CATEGORIES.length, 7, 'Must have 7 categories');
  console.log('✓ 7 Categories verified.');

  // 2. Tool Catalog
  assert(TOOL_CATALOG.length >= 24, 'Must have at least 24 tools');
  const catalogIds = TOOL_CATALOG.map((t) => t.id);
  assert(catalogIds.includes('docker'), 'Missing docker');
  assert(catalogIds.includes('java'), 'Missing java');
  assert(catalogIds.includes('git'), 'Missing git');
  assert(catalogIds.includes('jenkins'), 'Missing jenkins');
  assert(catalogIds.includes('sonarqube'), 'Missing sonarqube');
  assert(catalogIds.includes('trivy'), 'Missing trivy');
  console.log(`✓ Tool Catalog verified with ${TOOL_CATALOG.length} tools.`);

  // 3. Selective generation (Docker + Java 17 + Git ONLY)
  const selected = [
    { toolId: 'docker' },
    { toolId: 'java', version: '17' },
    { toolId: 'git' },
  ];

  const { script, toolOrder, totalTools } = generateSelectedInstallationScript(selected, {
    serverName: 'EC2-Production-Target',
  });

  assert.strictEqual(totalTools, 3, 'Must contain exactly 3 tools');
  assert.deepStrictEqual(toolOrder, ['docker', 'java', 'git']);
  assert(script.includes('install_docker()'), 'Must contain install_docker()');
  assert(script.includes('install_java()'), 'Must contain install_java()');
  assert(script.includes('install_git()'), 'Must contain install_git()');

  // Must NOT contain unselected tools
  assert(!script.includes('install_jenkins()'), 'Must NOT contain install_jenkins()');
  assert(!script.includes('install_python()'), 'Must NOT contain install_python()');
  assert(!script.includes('install_nginx()'), 'Must NOT contain install_nginx()');
  assert(!script.includes('install_mysql()'), 'Must NOT contain install_mysql()');
  console.log('✓ Selective execution guarantee verified (Only selected tools generated).');

  // 4. Built-in templates
  assert(BUILT_IN_AUTOMATION_SCRIPTS.length >= 4, 'Must have at least 4 built-in scripts');
  console.log('✓ Built-in scripts library verified.');

  console.log('All verification checks passed successfully!');
}
