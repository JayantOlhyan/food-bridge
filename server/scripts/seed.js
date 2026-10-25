import 'dotenv/config';
if(process.env.MONGODB_URI){const {connectDatabase,disconnectDatabase}=await import('../db.js');await connectDatabase();const {seed}=await import('./seed-data.js');await seed();await disconnectDatabase();console.log('Demo database seeded.');}
else {const response=await fetch(`http://localhost:${process.env.PORT||4000}/api/demo/reset`,{method:'POST'});if(!response.ok)throw new Error(await response.text());console.log('Running development database seeded.');}
