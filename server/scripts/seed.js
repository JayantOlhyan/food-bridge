import 'dotenv/config';

async function runSeed() {
  const port = process.env.PORT || 4000;
  if (process.env.MONGODB_URI) {
    const { connectDatabase, disconnectDatabase } = await import('../db.js');
    await connectDatabase();
    const { seed } = await import('./seed-data.js');
    await seed();
    await disconnectDatabase();
    console.log('Demo database seeded successfully (MONGODB_URI).');
    return;
  }

  // Try resetting on active running server
  try {
    const response = await fetch(`http://localhost:${port}/api/demo/reset`, { method: 'POST' });
    if (response.ok) {
      console.log('Running development server database re-seeded successfully.');
      return;
    }
  } catch {
    // Server is not currently running; run seed directly on ephemeral instance
  }

  const { connectDatabase, disconnectDatabase } = await import('../db.js');
  await connectDatabase();
  const { seed } = await import('./seed-data.js');
  await seed();
  await disconnectDatabase();
  console.log('Demo database seeded successfully (ephemeral instance). Note: Server also auto-seeds on startup when DEMO_MODE=true.');
}

await runSeed();
