/**
 * import-whiskeys-v2.mjs
 *
 * Imports 3,356 whiskeys from the SQLite database into Supabase:
 *  1. Uploads bottle images to the `images` storage bucket
 *  2. Deletes existing non-custom (seed) whiskeys
 *  3. Batch-inserts the full catalog with all new fields
 *
 * Usage:
 *   node scripts/import-whiskeys-v2.mjs
 */

import { createClient } from '@supabase/supabase-js'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL         = 'https://kchdgmawuaoxxsradzhf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjaGRnbWF3dWFveHhzcmFkemhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwNDE4NSwiZXhwIjoyMDg5MTgwMTg1fQ.eCWwRIKdCW6nUEMOJ5HC2KAJ_R8vjGLp5hKyqDDs9Kc'

const SQLITE_PATH = '/tmp/cellar-data/data/whiskey.sqlite'
const IMAGES_DIR  = '/tmp/cellar-data/data/images'
const BATCH_SIZE  = 100
const IMG_CONCURRENCY = 10  // parallel image uploads at a time

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── Type mapping ─────────────────────────────────────────────────────────────
function mapType(typeKey, country) {
  const c = (country ?? '').toLowerCase()
  switch (typeKey) {
    case 'bourbon':       return 'Bourbon'
    case 'tennessee':     return 'Tennessee'
    case 'rye':           return 'Rye'
    case 'pot-still':     return 'Irish'
    case 'single-malt':
      if (c.includes('scotland') || c.includes('united kingdom')) return 'Scotch'
      if (c.includes('japan'))                                     return 'Japanese'
      if (c.includes('ireland'))                                   return 'Irish'
      if (c.includes('united states'))                             return 'American Single Malt'
      return 'World'
    case 'blended':
    case 'blended-malt':
    case 'grain':
      if (c.includes('scotland') || c.includes('united kingdom')) return 'Scotch'
      if (c.includes('ireland'))                                   return 'Irish'
      if (c.includes('japan'))                                     return 'Japanese'
      return 'World'
    default:
      // No type_key — guess from country
      if (c.includes('scotland'))      return 'Scotch'
      if (c.includes('united states')) return 'Bourbon'
      if (c.includes('ireland'))       return 'Irish'
      if (c.includes('japan'))         return 'Japanese'
      return 'World'
  }
}

// ─── Price tier mapping ───────────────────────────────────────────────────────
function mapPriceTier(lowestPrice) {
  const p = parseFloat(lowestPrice ?? 0)
  if (p < 30)  return '$'
  if (p < 80)  return '$$'
  if (p < 150) return '$$$'
  if (p < 300) return '$$$$'
  return '$$$$$'
}

// ─── Parallel upload helper ───────────────────────────────────────────────────
async function uploadImages(records) {
  console.log(`\n📸 Uploading ${records.length} images (${IMG_CONCURRENCY} at a time)…`)
  let done = 0
  const urlMap = {}

  for (let i = 0; i < records.length; i += IMG_CONCURRENCY) {
    const chunk = records.slice(i, i + IMG_CONCURRENCY)
    await Promise.all(chunk.map(async ({ thumbnailId }) => {
      const localPath = resolve(IMAGES_DIR, `${thumbnailId}.webp`)
      let fileData
      try {
        fileData = readFileSync(localPath)
      } catch {
        urlMap[thumbnailId] = null
        return
      }
      const storagePath = `whiskeys/${thumbnailId}.webp`
      const { error } = await sb.storage
        .from('images')
        .upload(storagePath, fileData, { contentType: 'image/webp', upsert: true })
      if (error) {
        console.warn(`  ⚠️  Image upload failed for ${thumbnailId}: ${error.message}`)
        urlMap[thumbnailId] = null
      } else {
        const { data } = sb.storage.from('images').getPublicUrl(storagePath)
        urlMap[thumbnailId] = data.publicUrl
      }
    }))
    done += chunk.length
    if (done % 200 === 0 || done === records.length) {
      console.log(`  ↑ ${done}/${records.length} images uploaded`)
    }
  }
  return urlMap
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const db = new Database(SQLITE_PATH, { readonly: true })

// Pull all complete records
const rows = db.prepare(`
  SELECT
    doc_id,
    json_extract(detail_json, '$.whisky_id')       AS thumbnail_id,
    json_extract(detail_json, '$.full_name')        AS full_name,
    json_extract(detail_json, '$.distillery_name')  AS distillery,
    json_extract(detail_json, '$.country')          AS country,
    json_extract(detail_json, '$.type')             AS type_key,
    json_extract(search_json, '$.type_key')         AS type_key_search,
    json_extract(detail_json, '$.alcohol')          AS abv_str,
    json_extract(detail_json, '$.lowest_price')     AS lowest_price,
    json_extract(detail_json, '$.maintaste')        AS main_taste,
    json_extract(detail_json, '$.subtaste')         AS sub_taste,
    json_extract(detail_json, '$.mild_full')        AS mild_full,
    json_extract(detail_json, '$.smooth_spicy')     AS smooth_spicy,
    json_extract(detail_json, '$.fresh_warm')       AS fresh_warm,
    json_extract(search_json, '$.region')           AS region
  FROM search_hits
  WHERE detail_json IS NOT NULL
    AND json_extract(detail_json, '$.full_name')       != ''
    AND json_extract(detail_json, '$.distillery_name') IS NOT NULL
    AND json_extract(detail_json, '$.country')         IS NOT NULL
    AND json_extract(detail_json, '$.alcohol')         IS NOT NULL
    AND json_extract(detail_json, '$.lowest_price')    IS NOT NULL
`).all()

console.log(`📦 ${rows.length} complete records loaded from SQLite`)

// Upload all images first
const imgUrlMap = await uploadImages(rows.map(r => ({ thumbnailId: r.thumbnail_id })))

// Build whiskey insert rows
const whiskeys = rows.map(r => {
  const abvStr  = (r.abv_str ?? '').replace('%', '').trim()
  const abv     = abvStr ? parseFloat(abvStr) : null
  const typeKey = r.type_key ?? r.type_key_search
  const type    = mapType(typeKey, r.country)

  return {
    name:         r.full_name.trim(),
    distillery:   r.distillery.trim(),
    type,
    country:      r.country ?? null,
    region:       r.region   ?? null,
    abv:          isNaN(abv) ? null : abv,
    price_tier:   mapPriceTier(r.lowest_price),
    image_url:    imgUrlMap[r.thumbnail_id] ?? null,
    main_taste:   r.main_taste  ?? null,
    sub_taste:    r.sub_taste   ?? null,
    mild_full:    r.mild_full   ? parseFloat(r.mild_full)   : null,
    smooth_spicy: r.smooth_spicy ? parseFloat(r.smooth_spicy) : null,
    fresh_warm:   r.fresh_warm  ? parseFloat(r.fresh_warm)  : null,
    is_custom:    false,
    created_by:   null,
  }
})

// Remove existing seed whiskeys
console.log('\n🗑️  Removing existing seed whiskeys…')
const { error: deleteError } = await sb.from('whiskeys').delete().eq('is_custom', false)
if (deleteError) {
  console.error('❌ Delete failed:', deleteError.message)
  process.exit(1)
}
console.log('✅ Seed whiskeys removed')

// Batch insert
console.log(`\n⬆️  Inserting ${whiskeys.length} whiskeys in batches of ${BATCH_SIZE}…`)
let inserted = 0
for (let i = 0; i < whiskeys.length; i += BATCH_SIZE) {
  const batch = whiskeys.slice(i, i + BATCH_SIZE)
  const { error } = await sb.from('whiskeys').insert(batch)
  if (error) {
    console.error(`❌ Insert failed at batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
    process.exit(1)
  }
  inserted += batch.length
  if (inserted % 500 === 0 || inserted === whiskeys.length) {
    console.log(`  ↑ ${inserted}/${whiskeys.length} whiskeys inserted`)
  }
}

console.log(`\n🥃 Done! ${inserted} whiskeys imported successfully.`)
db.close()
