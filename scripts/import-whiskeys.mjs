import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const SUPABASE_URL = 'https://kchdgmawuaoxxsradzhf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjaGRnbWF3dWFveHhzcmFkemhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwNDE4NSwiZXhwIjoyMDg5MTgwMTg1fQ.eCWwRIKdCW6nUEMOJ5HC2KAJ_R8vjGLp5hKyqDDs9Kc'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Map all CSV types → original 5 schema types
const TYPE_MAP = {
  'Bourbon':              'Bourbon',
  'Tennessee':            'Bourbon',   // Lincoln County process, bourbon-adjacent
  'American':             'Bourbon',   // American whiskey defaults to Bourbon
  'American Single Malt': 'Bourbon',   // US craft malt whiskey
  'Corn':                 'Bourbon',   // Corn whiskey / bourbon style
  'American Brandy':      'Bourbon',   // Edge case — closest match
  'Scotch':               'Scotch',
  'Blended Scotch':       'Scotch',
  'Blended Malt Scotch':  'Scotch',
  'Blended Grain Scotch': 'Scotch',
  'Blended':              'Scotch',
  'Welsh':                'Scotch',    // Single malt, Scotch style
  'English':              'Scotch',    // Single malt, Scotch style
  'Swedish':              'Scotch',    // Single malt, Scotch style
  'Danish':               'Scotch',    // Single malt, Scotch style
  'Australian':           'Scotch',    // Single malt, Scotch style
  'Indian':               'Scotch',    // Single malt, Scotch style
  'Japanese':             'Japanese',
  'Taiwanese':            'Japanese',  // Craft East Asian whisky tradition
  'Irish':                'Irish',
  'Rye':                  'Rye',
  'Canadian':             'Rye',       // Canadian whisky is typically rye-forward
}

const csvPath = '/Users/cooper/Downloads/the_cellar_whiskeys.csv'
const csv = readFileSync(csvPath, 'utf-8')
const lines = csv.trim().split('\n')
const headers = lines[0].split(',')

const whiskeys = lines.slice(1).map(line => {
  const values = line.split(',')
  return {
    name: values[1]?.trim(),
    distillery: values[2]?.trim(),
    type: TYPE_MAP[values[3]?.trim()] ?? 'Bourbon',
    region: values[4]?.trim(),
    abv: parseFloat(values[5]),
    price_tier: values[6]?.trim(),
    is_custom: values[8]?.trim().toLowerCase() === 'true',
  }
}).filter(w => w.name)

console.log(`📦 Parsed ${whiskeys.length} whiskeys from CSV`)

// Delete existing non-custom (seed) whiskeys
console.log('🗑️  Removing existing seed whiskeys...')
const { error: deleteError } = await supabase
  .from('whiskeys')
  .delete()
  .eq('is_custom', false)

if (deleteError) {
  console.error('❌ Delete failed:', deleteError.message)
  process.exit(1)
}
console.log('✅ Seed whiskeys removed')

// Insert in batches of 100
const BATCH_SIZE = 100
let inserted = 0

for (let i = 0; i < whiskeys.length; i += BATCH_SIZE) {
  const batch = whiskeys.slice(i, i + BATCH_SIZE)
  const { error } = await supabase.from('whiskeys').insert(batch)
  if (error) {
    console.error(`❌ Insert failed at batch ${i / BATCH_SIZE + 1}:`, error.message)
    process.exit(1)
  }
  inserted += batch.length
  console.log(`⬆️  Inserted ${inserted}/${whiskeys.length}...`)
}

console.log(`\n🥃 Done! ${inserted} whiskeys imported successfully.`)
