const User = require('../models/User');

const seedUsers = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Seeder: Seeding demo accounts is strictly blocked in production mode.');
    return;
  }
  try {
    const demoAccounts = [
      {
        name: 'Khushi Sharma',
        email: 'student@campus.edu',
        passwordHash: 'password123', // Mongoose pre-save hook will hash this automatically
        role: 'student',
        roomNo: 'B-204',
        hostelBlock: 'Tagore Hall',
        isActive: true,
      },
      {
        name: 'Dr. Rajesh K. Verma',
        email: 'warden@campus.edu',
        passwordHash: 'password123',
        role: 'warden',
        hostelBlock: 'Tagore Hall',
        isActive: true,
      },
      {
        name: 'Ramesh Kumar (Plumber)',
        email: 'staff@campus.edu',
        passwordHash: 'password123',
        role: 'staff',
        isActive: true,
      },
      {
        name: 'Chief Admin Operator',
        email: 'admin@campus.edu',
        passwordHash: 'password123',
        role: 'admin',
        isActive: true,
      },
    ];

    for (const account of demoAccounts) {
      const exists = await User.findOne({ email: account.email });
      if (!exists) {
        await User.create(account);
        console.log(`Seeder: Created demo profile for [${account.role.toUpperCase()}] - ${account.email}`);
      }
    }
    console.log('Seeder: Demo account verification completed successfully.');
  } catch (error) {
    console.error('Seeder: Error seeding default database profiles:', error.message);
  }
};

module.exports = seedUsers;
