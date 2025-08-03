const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const componentsDir = path.join(__dirname, '../src/components');
const files = fs.readdirSync(componentsDir);

// UI-Komponenten identifizieren (tsx Dateien direkt im components Ordner)
const uiComponents = files.filter(file => {
  const filePath = path.join(componentsDir, file);
  return file.endsWith('.tsx') && fs.statSync(filePath).isFile();
});

console.log(`Found ${uiComponents.length} UI components to move\n`);

// Zähle Imports für jede Komponente
const componentUsage = [];

for (const component of uiComponents) {
  const componentName = component.replace('.tsx', '');
  
  try {
    // Suche nach Imports dieser Komponente
    const grepCommand = `rg -c "from ['\"](\\.\\./)*components/${componentName}['\"]|from ['\"]@/components/${componentName}['\"]" --type tsx --type ts 2>/dev/null || echo "0"`;
    const output = execSync(grepCommand, { encoding: 'utf-8', shell: true });
    
    const lines = output.trim().split('\n').filter(line => line.includes(':'));
    const totalCount = lines.reduce((sum, line) => {
      const count = parseInt(line.split(':').pop()) || 0;
      return sum + count;
    }, 0);
    
    componentUsage.push({
      name: component,
      count: totalCount,
      componentName
    });
  } catch (error) {
    componentUsage.push({
      name: component,
      count: 0,
      componentName
    });
  }
}

// Sortiere nach Nutzung (wenig genutzte zuerst)
componentUsage.sort((a, b) => a.count - b.count);

console.log('UI Components sorted by usage (least used first):');
console.log('================================================');
componentUsage.forEach(comp => {
  console.log(`${comp.name.padEnd(25)} - ${comp.count} imports`);
});

// Speichere für weitere Verarbeitung
fs.writeFileSync(
  path.join(__dirname, 'ui-components-usage.json'),
  JSON.stringify(componentUsage, null, 2)
);