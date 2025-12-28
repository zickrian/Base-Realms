/**
 * Script to upload all assets from public folder to Supabase Storage
 * Run with: node scripts/upload-assets.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htdiytcpgyawxzpitlll.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required in .env.local');
  console.log('💡 Get it from: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BUCKET_NAME = 'assets';
const PUBLIC_FOLDER = path.join(__dirname, '..', 'public');

// List of all files to upload with their storage paths
const filesToUpload = [
  // Root files
  { local: 'background.png', storage: 'background.png' },
  { local: 'backround.png', storage: 'backround.png' },
  { local: 'logos_demo.png', storage: 'logos_demo.png' },
  
  // Game icons
  { local: 'game/icons/awan.png', storage: 'game/icons/awan.png' },
  { local: 'game/icons/backcards.png', storage: 'game/icons/backcards.png' },
  { local: 'game/icons/battle-button.png', storage: 'game/icons/battle-button.png' },
  { local: 'game/icons/button1.png', storage: 'game/icons/button1.png' },
  { local: 'game/icons/card1.png', storage: 'game/icons/card1.png' },
  { local: 'game/icons/card2.png', storage: 'game/icons/card2.png' },
  { local: 'game/icons/cards-icon.png', storage: 'game/icons/cards-icon.png' },
  { local: 'game/icons/cards.png', storage: 'game/icons/cards.png' },
  { local: 'game/icons/epic.png', storage: 'game/icons/epic.png' },
  { local: 'game/icons/eth.svg', storage: 'game/icons/eth.svg' },
  { local: 'game/icons/idrx.svg', storage: 'game/icons/idrx.svg' },
  { local: 'game/icons/legend.png', storage: 'game/icons/legend.png' },
  { local: 'game/icons/level-badge.png', storage: 'game/icons/level-badge.png' },
  { local: 'game/icons/logos.png', storage: 'game/icons/logos.png' },
  { local: 'game/icons/market.png', storage: 'game/icons/market.png' },
  { local: 'game/icons/nav-bg.png', storage: 'game/icons/nav-bg.png' },
  { local: 'game/icons/packs.png', storage: 'game/icons/packs.png' },
  { local: 'game/icons/progress-bar.png', storage: 'game/icons/progress-bar.png' },
  { local: 'game/icons/quest-button.png', storage: 'game/icons/quest-button.png' },
  { local: 'game/icons/rare.png', storage: 'game/icons/rare.png' },
  { local: 'game/icons/stage-button.png', storage: 'game/icons/stage-button.png' },
  { local: 'game/icons/swords.png', storage: 'game/icons/swords.png' },
];

async function uploadFile(localPath, storagePath) {
  const fullLocalPath = path.join(PUBLIC_FOLDER, localPath);
  
  if (!fs.existsSync(fullLocalPath)) {
    console.log(`⚠️  File not found: ${localPath}`);
    return false;
  }

  try {
    const fileBuffer = fs.readFileSync(fullLocalPath);
    const fileExt = path.extname(localPath).toLowerCase();
    
    // Determine content type
    let contentType = 'application/octet-stream';
    if (fileExt === '.png') contentType = 'image/png';
    else if (fileExt === '.svg') contentType = 'image/svg+xml';
    else if (fileExt === '.jpg' || fileExt === '.jpeg') contentType = 'image/jpeg';
    else if (fileExt === '.webp') contentType = 'image/webp';

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error(`❌ Error uploading ${localPath}:`, error.message);
      return false;
    }

    console.log(`✅ Uploaded: ${storagePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error reading/uploading ${localPath}:`, error.message);
    return false;
  }
}

async function uploadAllAssets() {
  console.log('🚀 Starting asset upload to Supabase Storage...\n');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`📁 Source: ${PUBLIC_FOLDER}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of filesToUpload) {
    const success = await uploadFile(file.local, file.storage);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n📊 Upload Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📦 Total: ${filesToUpload.length}`);

  if (failCount === 0) {
    console.log('\n🎉 All assets uploaded successfully!');
    console.log(`\n🔗 Storage URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`);
  } else {
    console.log('\n⚠️  Some files failed to upload. Please check the errors above.');
  }
}

// Run the upload
uploadAllAssets().catch(console.error);

