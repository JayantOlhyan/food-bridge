import mongoose from 'mongoose';
const {Schema}=mongoose;
/** Reusable embedded geospatial sub-schema shared by organizers, NGOs, and listings. */
const location={lat:{type:Number,required:true},lng:{type:Number,required:true},address:{type:String,required:true}};
/** Mongoose model representing a surplus food donor or catering venue. */
export const Organizer=mongoose.model('Organizer',new Schema({name:String,type:String,phone:String,location}));
/** Mongoose model storing NGO capacity, diet capabilities, and shift hours. */
export const Ngo=mongoose.model('Ngo',new Schema({name:String,location,dailyCapacityMeals:Number,remainingCapacityMeals:Number,acceptsVeg:Boolean,acceptsNonVeg:Boolean,availableFrom:String,availableTo:String,hasVehicle:Boolean,active:Boolean}));
/** Mongoose model capturing surplus food details, safety deadline, and status. */
export const Listing=mongoose.model('Listing',new Schema({organizerId:{type:Schema.Types.ObjectId,ref:'Organizer'},eventName:String,eventType:String,location,foodItems:[{name:String,dietType:String,category:String}],quantityMeals:Number,quantityKg:Number,preparedAt:Date,holdingCondition:String,packagingAvailable:Boolean,pickupWindowStart:Date,pickupWindowEnd:Date,notes:String,safeDeadline:Date,status:{type:String,enum:['POSTED','ACCEPTED','COLLECTED','DELIVERED','EXPIRED','CANCELLED','INELIGIBLE']},eligibility:{eligible:Boolean,reasons:[String]}},{timestamps:true}));
/** Mongoose model recording a 1-to-1 NGO claim and delivery confirmation trail. */
export const Pickup=mongoose.model('Pickup',new Schema({listingId:{type:Schema.Types.ObjectId,ref:'Listing',unique:true},ngoId:{type:Schema.Types.ObjectId,ref:'Ngo'},volunteerName:String,status:String,acceptedAt:Date,collectedAt:Date,deliveredAt:Date,deliveredMeals:Number,deliveredKg:Number}));
/** Mongoose model storing organizer and NGO workflow alerts. */
export const Notification=mongoose.model('Notification',new Schema({recipientType:String,recipientId:Schema.Types.ObjectId,listingId:Schema.Types.ObjectId,message:String,read:{type:Boolean,default:false}},{timestamps:true}));
