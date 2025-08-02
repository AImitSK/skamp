// scripts/migrate-team-folders.ts
const { runMigration } = require('../src/lib/email/team-folder-migration');

/**
 * Team-Folder Migration Script
 * 
 * Usage:
 * npm run migrate:folders         # Migriert alle Organisationen
 * npm run migrate:emails          # Migriert alle E-Mails  
 * npm run migrate:all             # Migriert alles
 * npm run migrate:org <orgId>     # Migriert spezifische Organisation
 */

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const organizationId = args[1];
  const dryRun = args.includes('--dry-run');

  console.log('🚀 Starting Team-Folder Migration...');
  console.log(`Command: ${command}`);
  if (organizationId) console.log(`Organization: ${organizationId}`);
  if (dryRun) console.log('⚠️ DRY RUN MODE');

  try {
    switch (command) {
      case 'folders':
        await runMigration({
          type: 'folders',
          organizationId,
          dryRun
        });
        break;

      case 'emails':
        await runMigration({
          type: 'emails',
          organizationId,
          dryRun
        });
        break;

      case 'all':
        await runMigration({
          type: 'all',
          organizationId,
          dryRun
        });
        break;

      case 'org':
        if (!organizationId) {
          console.error('❌ Organization ID required for org command');
          process.exit(1);
        }
        await runMigration({
          type: 'all',
          organizationId,
          dryRun
        });
        break;

      default:
        console.log('📖 USAGE:');
        console.log('  npm run migrate:folders          # Migrate all organizations');
        console.log('  npm run migrate:emails           # Migrate all emails');
        console.log('  npm run migrate:all              # Migrate everything');
        console.log('  npm run migrate:org <orgId>      # Migrate specific organization');
        console.log('  Add --dry-run for testing');
        break;
    }

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// CLI ausführen wenn direkt gestartet
if (require.main === module) {
  main();
}

module.exports = { main };