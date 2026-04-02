import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = 'https://kchdgmawuaoxxsradzhf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjaGRnbWF3dWFveHhzcmFkemhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwNDE4NSwiZXhwIjoyMDg5MTgwMTg1fQ.eCWwRIKdCW6nUEMOJ5HC2KAJ_R8vjGLp5hKyqDDs9Kc'
const IMAGES_DIR = '/tmp/cellar-data/data/images'
const CONCURRENCY = 15

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// Build set of local file IDs
const localFiles = new Set(readdirSync(IMAGES_DIR).map(f => f.replace('.webp', '')))
console.log(`Local image files: ${localFiles.size}`)

// Upload all local files to storage (upsert)
console.log('Uploading images to storage...')
const fileList = [...localFiles]
let uploaded = 0, failed = 0

for (let i = 0; i < fileList.length; i += CONCURRENCY) {
  const chunk = fileList.slice(i, i + CONCURRENCY)
  await Promise.all(chunk.map(async id => {
    const data = readFileSync(resolve(IMAGES_DIR, `${id}.webp`))
    const { error } = await sb.storage.from('images').upload(`whiskeys/${id}.webp`, data, { contentType: 'image/webp', upsert: true })
    if (error) failed++
    else uploaded++
  }))
  if ((i + CONCURRENCY) % 500 === 0 || i + CONCURRENCY >= fileList.length) {
    console.log(`  ↑ ${Math.min(i + CONCURRENCY, fileList.length)}/${fileList.length} (failed: ${failed})`)
  }
}
console.log(`Upload done: ${uploaded} ok, ${failed} failed`)

// Now update whiskeys table: set image_url where thumbnail matches a local file, null otherwise
console.log('\nUpdating whiskeys image_url...')

// Get all whiskeys
let all = [], from = 0
while (true) {
  const { data } = await sb.from('whiskeys').select('id, image_url').range(from, from + 999)
  if (!data?.length) break
  all = [...all, ...data]
  if (data.length < 1000) break
  from += 1000
}
console.log(`Total whiskeys: ${all.length}`)

// Split into has-valid-local-file vs needs-null
const toUpdate = [], toNull = []
for (const w of all) {
  if (!w.image_url) continue
  const thumbId = w.image_url.split('/').pop().replace('.webp', '')
  if (localFiles.has(thumbId)) {
    // Reconstruct clean URL without any timestamp
    const cleanUrl = `${SUPABASE_URL}/storage/v1/object/public/images/whiskeys/${thumbId}.webp`
    if (w.image_url !== cleanUrl) toUpdate.push({ id: w.id, image_url: cleanUrl })
  } else {
    toNull.push(w.id)
  }
}

console.log(`To null (no local file): ${toNull.length}`)
console.log(`To update URL: ${toUpdate.length}`)

for (let i = 0; i < toNull.length; i += 100) {
  await sb.from('whiskeys').update({ image_url: null }).in('id', toNull.slice(i, i + 100))
}
console.log('Nulled done')

for (let i = 0; i < toUpdate.length; i += 100) {
  const batch = toUpdate.slice(i, i + 100)
  await Promise.all(batch.map(w => sb.from('whiskeys').update({ image_url: w.image_url }).eq('id', w.id)))
}
console.log('Updates done')

// Final count
const { count } = await sb.from('whiskeys').select('*', { count: 'exact', head: true }).not('image_url', 'is', null)
console.log(`\nDone! ${count} whiskeys now have valid image URLs`)
