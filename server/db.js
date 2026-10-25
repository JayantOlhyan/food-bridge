import 'dotenv/config';
import mongoose from 'mongoose';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
let memory;
export async function connectDatabase(){
 let uri=process.env.MONGODB_URI;
 if(!uri){if(process.env.NODE_ENV==='production') throw new Error('MONGODB_URI is required in production');memory=await MongoMemoryReplSet.create({replSet:{count:1}});uri=memory.getUri();console.log('Development: ephemeral MongoDB replica set; data resets on restart.');}
 await mongoose.connect(uri);
}
export async function disconnectDatabase(){await mongoose.disconnect();await memory?.stop();}
