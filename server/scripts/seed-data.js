import {Organizer,Ngo,Listing,Pickup,Notification} from '../models.js';
import {eligibility} from '../services/matching.js';
export async function seed(){
 await Promise.all([Organizer.deleteMany({}),Ngo.deleteMany({}),Listing.deleteMany({}),Pickup.deleteMany({}),Notification.deleteMany({})]);
 const now=Date.now(),at=m=>new Date(now+m*60000), location={lat:28.592,lng:77.046,address:'Sample event venue, Dwarka, New Delhi'};
 const organizer=await Organizer.create({name:'Sample Wedding Caterer',type:'wedding caterer',phone:'Demo account',location});
 const names=['Community Kitchen','Seva Kitchen','Hope Shelter','Meal Collective','Community Table','Neighbourhood Pantry','Care Kitchen'];
 const ngos=await Ngo.insertMany(names.map((name,i)=>({name:`NGO ${String.fromCharCode(65+i)} – ${name}`,location:{lat:location.lat+[.017986,.008993,.06745,.025,-.028,.04,-.055][i],lng:location.lng,address:`Mock Delhi location ${String.fromCharCode(65+i)}`},dailyCapacityMeals:[50,10,100,80,60,120,35][i],remainingCapacityMeals:[50,10,100,80,60,120,35][i],acceptsVeg:true,acceptsNonVeg:i%2===0,availableFrom:i===2?'02:00':'00:00',availableTo:i===2?'02:01':'23:59',hasVehicle:i!==5,active:i!==6})));
 async function listing(eventName,quantityMeals,extra={}){const data={organizerId:organizer._id,eventName,eventType:'Wedding',location,foodItems:[{name:'Veg pulao, dal makhani, paneer butter masala, roti',dietType:'veg',category:'Prepared meal'}],quantityMeals,quantityKg:18,preparedAt:at(-60),holdingCondition:'hot-held',packagingAvailable:true,pickupWindowStart:at(-15),pickupWindowEnd:at(120),notes:'Packed in sealed containers',...extra};const e=eligibility(data);return Listing.create({...data,safeDeadline:e.safeDeadline,eligibility:e,status:e.eligible?'POSTED':'INELIGIBLE',...extra});}
 await listing('Sample Wedding Reception',40);
 await listing('Sangeet Night · Banquet hall',60,{pickupWindowEnd:at(50),quantityKg:26});
 await listing('Concert Food Stall',30,{holdingCondition:'packaged-sealed',pickupWindowEnd:at(240),quantityKg:12});
 await listing('Birthday Dinner',15,{preparedAt:at(-360),pickupWindowEnd:at(-60)});
 const active=await listing('Corporate Lunch – Hall B',25,{status:'ACCEPTED',quantityKg:10});
 await Pickup.create({listingId:active._id,ngoId:ngos[3]._id,status:'ACCEPTED',acceptedAt:at(-10)});
 await Ngo.updateOne({_id:ngos[3]._id},{$inc:{remainingCapacityMeals:-25}});
 for(const [index,title,meals,kg] of [[0,'Office Event',35,15],[1,'Community Bhandara',40,18]]){const item=await listing(title,meals,{status:'DELIVERED',preparedAt:at(-1440*(index+1)-60),pickupWindowStart:at(-1440*(index+1)),pickupWindowEnd:at(-1440*(index+1)+120),quantityKg:kg});await Pickup.create({listingId:item._id,ngoId:ngos[index===0?0:4]._id,status:'DELIVERED',acceptedAt:at(-1440*(index+1)+10),collectedAt:at(-1440*(index+1)+20),deliveredAt:at(-1440*(index+1)+40),deliveredMeals:meals,deliveredKg:kg});}
 await Notification.create({recipientType:'organizer',recipientId:organizer._id,listingId:active._id,message:'NGO D accepted Corporate Lunch – Hall B. Simulated alert.'});
 return {organizer,ngos};
}
