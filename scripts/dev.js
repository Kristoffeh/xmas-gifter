const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to generate Prisma Client');
  process.exit(1);
}

// Check if DATABASE_URL is set
const envPath = path.join(process.cwd(), '.env');
let hasDatabaseUrl = false;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  hasDatabaseUrl = envContent.includes('DATABASE_URL=') && 
                   envContent.split('DATABASE_URL=')[1]?.trim().length > 0;
}

if (hasDatabaseUrl) {
  console.log('📦 Pushing database schema...');
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    console.log('✅ Database schema synced');
  } catch (error) {
    console.warn('⚠️  Database connection failed, continuing without syncing schema');
    console.warn('   Make sure your DATABASE_URL is set correctly in .env');
  }
} else {
  console.log('⚠️  DATABASE_URL not found in .env, skipping database sync');
  console.log('   Create a .env file with DATABASE_URL to enable automatic migrations');
}

console.log('🚀 Starting Next.js dev server...');
try {
  execSync('next dev', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start dev server');
  process.exit(1);
}





