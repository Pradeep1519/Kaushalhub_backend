// Run once: node scripts/seedAdmin.js
// Creates (or resets) the master admin account and the demo admin account.
// Both log in through the SAME endpoint as everyone else: POST /api/auth/login
// The Admin portal frontend switches between live/admin-real and demo/admin-demo modes.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const REAL_ADMIN = {
  name: 'KaushalHub Admin',
  email: 'kaushalhub@gmail.com',
  password: 'kaushal2026',
  role: 'admin'
};

const DEMO_ADMIN = {
  name: 'Demo Admin',
  email: 'demo.admin@kaushalhub.com',
  password: '1234',
  role: 'admin',
  isDemo: true
};

const ensureAccount = async ({ name, email, password, role, isDemo = false }) => {
  const existing = await User.findOne({ email });

  if (existing) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.findByIdAndUpdate(existing.id, {
      name,
      password: hashedPassword,
      role,
      isActive: true,
      isDemo
    });
    console.log(`✅ Existing ${role.toUpperCase()} account reset: ${email}`);
    return existing.id;
  }

  const created = await User.create({ name, email, password, role, isDemo });
  console.log(`✅ New ${role.toUpperCase()} account created: ${email}`);
  return created.id;
};

(async () => {
  try {
    await ensureAccount(REAL_ADMIN);
    await ensureAccount(DEMO_ADMIN);

    console.log('\nReal admin login:');
    console.log('   email:', REAL_ADMIN.email);
    console.log('   password:', REAL_ADMIN.password);

    console.log('\nDemo admin login:');
    console.log('   email:', DEMO_ADMIN.email);
    console.log('   password:', DEMO_ADMIN.password);

    console.log('\n⚠️  Change the real password after first login in production.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed admin accounts:', err);
    process.exit(1);
  }
})();
