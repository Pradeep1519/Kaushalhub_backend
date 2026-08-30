// Run once: node scripts/seedDemo.js
// Creates 3 easy-to-remember test logins (simple 4-digit passwords, for LOCAL TESTING ONLY):
//   1. Demo admin account -> logs into the Admin portal in demo mode
//   2. Demo teacher      -> logs into the Trainer portal
//   3. Demo student      -> logs into the Student portal (and home website)
//
// All three use the SAME /api/auth/login endpoint — only the "role" differs.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const accounts = [
  { name: 'Demo Admin', email: 'demo.admin@kaushalhub.com', password: '1234', role: 'admin', isDemo: true },
  { name: 'Demo Teacher', email: 'teacher@kaushalhub.com', password: '1234', role: 'trainer', isDemo: true },
  { name: 'Demo Student', email: 'student@kaushalhub.com', password: '1234', role: 'student', isDemo: true }
];

(async () => {
  try {
    for (const acc of accounts) {
      const existing = await User.findOne({ email: acc.email });

      if (existing) {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(acc.password, salt);
        await User.findByIdAndUpdate(existing.id, {
          name: acc.name,
          password: hashedPassword,
          role: acc.role,
          isActive: true,
          isDemo: !!acc.isDemo
        });
        console.log(`✅ ${acc.role.toUpperCase()} already existed — password reset.`);
      } else {
        await User.create({
          name: acc.name,
          email: acc.email,
          password: acc.password,
          role: acc.role,
          isDemo: !!acc.isDemo
        });
        console.log(`✅ ${acc.role.toUpperCase()} account created.`);
      }
      console.log(`   Email: ${acc.email}   Password: ${acc.password}\n`);
    }

    console.log('All demo accounts are ready. Use them with /api/auth/login on any portal.');
    console.log('⚠️  These are simple test passwords — change them before going live publicly.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed demo accounts:', err);
    process.exit(1);
  }
})();
