import 'dotenv/config';
process.env.DEMO_MODE??='true';
import {connectDatabase,disconnectDatabase} from './db.js';
import {app,expire} from './app.js';
import {Organizer} from './models.js';
import {seed} from './scripts/seed-data.js';

await connectDatabase();
if(!await Organizer.exists({})&&process.env.DEMO_MODE==='true')await seed();

const timer=setInterval(()=>expire().catch(console.error),60000);
timer.unref();

const port=Number(process.env.PORT)||4000;
const server=app.listen(port,()=>console.log(`FoodBridge API listening on http://localhost:${port}`));

let shuttingDown=false;
async function shutdown(signal){
  if(shuttingDown)return;
  shuttingDown=true;
  console.log(`Received ${signal}. Gracefully shutting down FoodBridge API...`);
  clearInterval(timer);
  server.close(async()=>{
    try{
      await disconnectDatabase();
      process.exit(0);
    }catch(err){
      console.error('Error during database disconnect:',err);
      process.exit(1);
    }
  });
}

process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));
