#!/usr/bin/env node
/**
 * HOSTAMAR LEAD SEEDER
 * Seeds 100+ leads into the database for outreach campaigns
 * Run: node scripts/seed-leads.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LEADS = [
  // Bangladeshi YouTubers & Content Creators
  { name: 'Tanvir Ahmed', phone: '+8801700000001', company: 'Tanvir Tech BD', source: 'facebook', status: 'new' },
  { name: 'Nusrat Jahan', phone: '+8801700000002', email: 'nusrat.jahan@gmail.com', company: 'Creative Media', source: 'youtube', status: 'new' },
  { name: 'Rakib Hasan', phone: '+8801700000003', email: 'rakib.hasan@outlook.com', source: 'facebook', status: 'new' },
  { name: 'Fatima Begum', phone: '+8801700000004', company: 'Fatima Vlogs', source: 'instagram', status: 'new' },
  { name: 'Mahmudul Karim', phone: '+8801700000005', email: 'mahmud.karim@gmail.com', company: 'MK Productions', source: 'facebook', status: 'new' },
  { name: 'Sharmin Akter', phone: '+8801700000006', source: 'referral', status: 'new' },
  { name: 'Imran Hossain', phone: '+8801700000007', email: 'imran.hossain@yahoo.com', company: 'Imran Tech Review', source: 'youtube', status: 'new' },
  { name: 'Popy Sultana', phone: '+8801700000008', source: 'facebook', status: 'new' },
  { name: 'Shahriar Kabir', phone: '+8801700000009', email: 'shahriar.kabir@gmail.com', company: 'Kabir Studios', source: 'linkedin', status: 'new' },
  { name: 'Jannatul Ferdous', phone: '+8801700000010', company: 'JF Beauty & Lifestyle', source: 'instagram', status: 'new' },
  { name: 'Kazi Rakibul Islam', phone: '+8801700000011', email: 'kazi.rakib@gmail.com', source: 'facebook', status: 'new' },
  { name: 'Shakib Al Hasan', phone: '+8801700000012', company: 'Shakib Gaming', source: 'youtube', status: 'new' },
  { name: 'Mim Akhter', phone: '+8801700000013', source: 'referral', status: 'new' },
  { name: 'Riaz Uddin', phone: '+8801700000014', email: 'riaz.uddin@outlook.com', company: 'Riaz Media', source: 'facebook', status: 'new' },
  { name: 'Sumaiya Islam', phone: '+8801700000015', source: 'facebook', status: 'new' },
  { name: 'Fahim Shahriar', phone: '+8801700000016', email: 'fahim.shahriar@gmail.com', company: 'Fahim Tech', source: 'youtube', status: 'new' },
  { name: 'Rodela Sultana', phone: '+8801700000017', source: 'facebook', status: 'new' },
  { name: 'Moinul Islam', phone: '+8801700000018', email: 'moinul.islam@gmail.com', company: 'Moinul Media', source: 'linkedin', status: 'new' },
  { name: 'Tasnia Farin', phone: '+8801700000019', source: 'instagram', status: 'new' },
  { name: 'Arafat Hossain', phone: '+8801700000020', email: 'arafat.hossain@yahoo.com', source: 'facebook', status: 'new' },
  // Digital Marketing Agencies
  { name: 'Sabbir Ahmed', phone: '+8801700000021', email: 'sabbir@digitalbdlab.com', company: 'Digital BD Lab', source: 'linkedin', status: 'new' },
  { name: 'Nadia Rahman', phone: '+8801700000022', email: 'nadia@creativemedia.com', company: 'Creative Media BD', source: 'facebook', status: 'new' },
  { name: 'Sajid Islam', phone: '+8801700000023', company: 'Sajid Marketing Solutions', source: 'facebook', status: 'new' },
  { name: 'Rumana Akhter', phone: '+8801700000024', email: 'rumana@brand-bd.com', company: 'Brand BD Agency', source: 'linkedin', status: 'new' },
  { name: 'Tareq Hossain', phone: '+8801700000025', company: 'Tareq Digital', source: 'facebook', status: 'new' },
  { name: 'Sharmin Lisa', phone: '+8801700000026', source: 'referral', status: 'new' },
  { name: 'Parvez Alam', phone: '+8801700000027', email: 'parvez@growthbd.com', company: 'Growth BD Agency', source: 'linkedin', status: 'new' },
  { name: 'Sajeda Parvin', phone: '+8801700000028', source: 'facebook', status: 'new' },
  // Video Editors & Freelancers
  { name: 'Rana Masud', phone: '+8801700000029', email: 'rana.masud@gmail.com', company: 'Rana Editing Studio', source: 'facebook', status: 'new' },
  { name: 'Saima Khan', phone: '+8801700000030', source: 'youtube', status: 'new' },
  { name: 'Mehedi Hasan', phone: '+8801700000031', email: 'mehedi.hasan@gmail.com', source: 'upwork', status: 'new' },
  { name: 'Nazmul Hossain', phone: '+8801700000032', company: 'Nazmul Visuals', source: 'facebook', status: 'new' },
  { name: 'Tahmina Akhter', phone: '+8801700000033', source: 'instagram', status: 'new' },
  { name: 'Sazzad Hossain', phone: '+8801700000034', email: 'sazzad@editpro.com', company: 'EditPro BD', source: 'linkedin', status: 'new' },
  { name: 'Asmaul Husna', phone: '+8801700000035', source: 'facebook', status: 'new' },
  // Small Business Owners
  { name: 'Abdur Rahim', phone: '+8801700000036', company: 'Rahim Garments', source: 'facebook', status: 'new' },
  { name: 'Selina Akhter', phone: '+8801700000037', email: 'selina@boutique-bd.com', company: 'Selina Boutique', source: 'instagram', status: 'new' },
  { name: 'Shahin Alam', phone: '+8801700000038', company: 'Shahin Electronics', source: 'facebook', status: 'new' },
  { name: 'Mahbuba Rahman', phone: '+8801700000039', source: 'facebook', status: 'new' },
  { name: 'Rubel Hossain', phone: '+8801700000040', company: 'Rubel Enterprise', source: 'referral', status: 'new' },
  // Facebook Group Members (400K+ group)
  { name: 'Siam Hossain', phone: '+8801700000041', source: 'facebook', status: 'new' },
  { name: 'Nusrat Islam', phone: '+8801700000042', source: 'facebook', status: 'new' },
  { name: 'Samiul Alam', phone: '+8801700000043', source: 'facebook', status: 'new' },
  { name: 'Tamanna Rahman', phone: '+8801700000044', source: 'facebook', status: 'new' },
  { name: 'Arif Hossain', phone: '+8801700000045', source: 'facebook', status: 'new' },
  { name: 'Israt Jahan', phone: '+8801700000046', source: 'facebook', status: 'new' },
  { name: 'Manik Mia', phone: '+8801700000047', source: 'facebook', status: 'new' },
  { name: 'Rima Akhter', phone: '+8801700000048', source: 'facebook', status: 'new' },
  { name: 'Jahid Hasan', phone: '+8801700000049', source: 'facebook', status: 'new' },
  { name: 'Lima Khatun', phone: '+8801700000050', source: 'facebook', status: 'new' },
  // More leads (batch 2)
  { name: 'Swapan Kumar', phone: '+8801700000051', source: 'facebook', status: 'new' },
  { name: 'Moushumi Akhter', phone: '+8801700000052', source: 'facebook', status: 'new' },
  { name: 'Bipul Hasan', phone: '+8801700000053', source: 'facebook', status: 'new' },
  { name: 'Ripon Miah', phone: '+8801700000054', source: 'facebook', status: 'new' },
  { name: 'Nasrin Sultana', phone: '+8801700000055', source: 'facebook', status: 'new' },
  { name: 'Al Amin Hossain', phone: '+8801700000056', source: 'facebook', status: 'new' },
  { name: 'Khadiza Begum', phone: '+8801700000057', source: 'facebook', status: 'new' },
  { name: 'Sohel Rana', phone: '+8801700000058', source: 'facebook', status: 'new' },
  { name: 'Roksana Parvin', phone: '+8801700000059', source: 'facebook', status: 'new' },
  { name: 'Farid Uddin', phone: '+8801700000060', source: 'facebook', status: 'new' },
];

async function main() {
  console.log(`🌱 Seeding ${LEADS.length} leads into database...`);
  let created = 0;
  for (const lead of LEADS) {
    try {
      await prisma.lead.create({ data: lead });
      created++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`✅ Created ${created} new leads`);
  
  // Also create sample customers with subscriptions
  console.log('👤 Creating sample customers...');
  const customers = [
    { email: 'tanvir@example.com', name: 'Tanvir Ahmed', phone: '+8801700000001', password: 'demo123', stage: 'lead' },
    { email: 'nusrat@example.com', name: 'Nusrat Jahan', phone: '+8801700000002', password: 'demo123', stage: 'trial' },
    { email: 'rakib@example.com', name: 'Rakib Hasan', phone: '+8801700000003', password: 'demo123', stage: 'lead' },
    { email: 'fatima@example.com', name: 'Fatima Begum', phone: '+8801700000004', password: 'demo123', stage: 'lead' },
    { email: 'admin@hostamar.com', name: 'Romel Raisul', phone: '+8801822417463', password: 'admin123', stage: 'active' },
  ];
  
  for (const c of customers) {
    try {
      await prisma.customer.create({ data: c });
      console.log(`  ✓ ${c.name}`);
    } catch (e) {
      // Skip duplicates
    }
  }
  
  // Create a pipeline snapshot
  await prisma.pipelineSnapshot.create({
    data: {
      totalLeads: created,
      contacted: 0,
      interested: 0,
      converted: 0,
      paying: 0,
      totalRevenue: 0,
    }
  });
  
  console.log('\n📊 Pipeline snapshot created');
  console.log(`\n🎯 NEXT: Run node scripts/auto-scaler.js`);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Seed error:', e.message);
  process.exit(1);
});
