const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gewcuxamglbbysddmfgu.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6cPcqdQIbERtMcLQlMNpYw_Eqw6vs1G';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function deduplicateById(items) {
  const map = new Map();
  items.forEach(item => {
    map.set(item.id, item);
  });
  return Array.from(map.values());
}

async function seed() {
  console.log('Reading database.json...');
  const db = JSON.parse(fs.readFileSync('src/data/database.json', 'utf8'));

  // 1. Seed Landlords
  const landlords = [
    {
      id: 'landlord-1',
      first_name: 'David',
      last_name: 'Adeyemi',
      email: 'david.adeyemi@northstarholding.com',
      phone: '+234 803 111 2233',
      company_name: 'Adeyemi Asset Holdings Ltd',
      bank_name: 'First Bank Nigeria',
      bank_account_number: '3029182390',
      management_fee_percentage: 10.0,
      remittance_frequency: 'Monthly',
      notes: 'Primary owner for commercial boutique & Ikoyi residential portfolio.'
    },
    {
      id: 'landlord-2',
      first_name: 'Elena',
      last_name: 'Vasiliev',
      email: 'elena.vasiliev@torontocrest.ca',
      phone: '+1 416 555 0192',
      company_name: 'Crestwood Real Estate Trust',
      bank_name: 'TD Canada Trust',
      bank_account_number: '004-1829102',
      management_fee_percentage: 8.5,
      remittance_frequency: 'Monthly',
      notes: 'Master landlord for Maple Heights and Harbourview multi-family assets.'
    }
  ];

  console.log('Seeding Landlords...');
  await supabase.from('landlords').upsert(landlords);

  // 2. Properties
  const propertiesWithLandlords = deduplicateById(db.properties).map((p, idx) => ({
    ...p,
    landlord_id: idx % 2 === 0 ? 'landlord-2' : 'landlord-1'
  }));
  console.log('Seeding Properties...');
  await supabase.from('properties').upsert(propertiesWithLandlords);

  // 3. Units (deduplicated)
  console.log('Seeding Units...');
  const cleanUnits = deduplicateById(db.units);
  const { error: uErr } = await supabase.from('units').upsert(cleanUnits);
  if (uErr) console.warn('Units notice:', uErr.message);

  // 4. Tenants
  console.log('Seeding Tenants...');
  await supabase.from('tenants').upsert(deduplicateById(db.tenants));

  // 5. Leases
  console.log('Seeding Leases...');
  const { error: leErr } = await supabase.from('leases').upsert(deduplicateById(db.leases));
  if (leErr) console.warn('Leases notice:', leErr.message);

  // 6. Payments
  console.log('Seeding Payments...');
  const { error: pErr } = await supabase.from('payments').upsert(deduplicateById(db.payments));
  if (pErr) console.warn('Payments notice:', pErr.message);

  // 7. Vendors
  console.log('Seeding Vendors...');
  await supabase.from('vendors').upsert(deduplicateById(db.vendors));

  // 8. Maintenance Requests
  console.log('Seeding Maintenance Requests...');
  const { error: mErr } = await supabase.from('maintenance_requests').upsert(deduplicateById(db.maintenance_requests));
  if (mErr) console.warn('Maintenance notice:', mErr.message);

  // 9. Bills
  console.log('Seeding Bills...');
  await supabase.from('bills').upsert(deduplicateById(db.bills));

  // 10. Expenses
  console.log('Seeding Expenses...');
  const { error: expErr } = await supabase.from('expenses').upsert(deduplicateById(db.expenses));
  if (expErr) console.warn('Expenses notice:', expErr.message);

  // 11. Notices
  console.log('Seeding Notices...');
  const { error: nErr } = await supabase.from('notices').upsert(deduplicateById(db.notices));
  if (nErr) console.warn('Notices notice:', nErr.message);

  // 12. Communications
  console.log('Seeding Communications...');
  await supabase.from('communications').upsert(deduplicateById(db.communications));

  // 13. Automation Rules & Logs
  console.log('Seeding Automation Rules & Logs...');
  const cleanRules = deduplicateById(db.automation_rules).map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    automation_type: r.automation_type || 'system',
    enabled: r.enabled !== false,
    trigger_config: r.trigger_config || null,
    action_config: r.action_config || null
  }));
  await supabase.from('automation_rules').upsert(cleanRules);
  await supabase.from('automation_logs').upsert(deduplicateById(db.automation_logs));

  // 14. Tasks & Applicants
  console.log('Seeding Tasks...');
  await supabase.from('tasks').upsert(deduplicateById(db.tasks));

  console.log('Seeding Applicants...');
  const { error: appErr } = await supabase.from('applicants').upsert(deduplicateById(db.applicants));
  if (appErr) console.warn('Applicants notice:', appErr.message);

  // 15. Shortlet Bookings (deduplicated)
  console.log('Seeding Shortlet Bookings...');
  const cleanBookings = deduplicateById(db.shortlet_bookings);
  const { error: sErr } = await supabase.from('shortlet_bookings').upsert(cleanBookings);
  if (sErr) console.warn('Shortlet notice:', sErr.message);

  console.log('\nSUCCESS: Database successfully seeded to Supabase Postgres!');
}

seed().catch(err => {
  console.error('Fatal error during seed:', err);
});
