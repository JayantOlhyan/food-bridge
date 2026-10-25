import {config as defaults} from '../config.js';
export function haversineKm(a,b) {
  const rad = n => n*Math.PI/180;
  const dlat=rad(b.lat-a.lat), dlng=rad(b.lng-a.lng);
  return 6371*2*Math.atan2(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2),Math.sqrt(1-(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2)));
}
export function eligibility(listing,now=new Date(),cfg=defaults) {
  const reasons=[];
  const prepared=+new Date(listing.preparedAt), end=+new Date(listing.pickupWindowEnd), start=+new Date(listing.pickupWindowStart);
  const hold=cfg.maxHoldHours[listing.holdingCondition];
  if (!listing.eventName || !listing.location || !listing.foodItems?.length || !Number.isFinite(prepared) || !Number.isFinite(end) || !Number.isFinite(start) || !hold) reasons.push('Required listing fields are missing or invalid.');
  if (!(listing.quantityMeals>0)) reasons.push('Quantity must be greater than zero.');
  if (prepared>+now) reasons.push('Preparation time cannot be in the future.');
  if (start>=end) reasons.push('Pickup window must end after it starts.');
  const deadline=Math.min(end,prepared+hold*3600000);
  if (deadline<=+now) reasons.push('Safe collection deadline has expired.');
  else if (deadline-+now<cfg.minLeadMinutes*60000) reasons.push(`At least ${cfg.minLeadMinutes} minutes of lead time is required.`);
  return {eligible:reasons.length===0,reasons:reasons.length?reasons:['Within the configured holding limit.','Sufficient collection lead time.'],safeDeadline:Number.isFinite(deadline)?new Date(deadline):null};
}
const delhiMinutes = date => {const d=new Date(+new Date(date)+330*60000);return d.getUTCHours()*60+d.getUTCMinutes();};
const timeMinutes = value => {const [h,m]=value.split(':').map(Number);return h*60+m;};
function availableAt(ngo,date) {const t=delhiMinutes(date),a=timeMinutes(ngo.availableFrom),b=timeMinutes(ngo.availableTo);return a<=b?t>=a&&t<=b:t>=a||t<=b;}
export function match(listing,ngos,now=new Date(),cfg=defaults) {
  const safety=eligibility(listing,now,cfg), deadline=+new Date(safety.safeDeadline);
  const results=ngos.map(ngo=>{
    const distanceKm=haversineKm(listing.location,ngo.location), etaMinutes=Math.ceil(distanceKm/cfg.avgSpeedKmh*60+cfg.bufferMinutes);
    const arrival=Math.max(+now+etaMinutes*60000,+new Date(listing.pickupWindowStart));
    const reasons=[];
    if (!safety.eligible) reasons.push('Excluded: listing is not safety-eligible.');
    if (!ngo.active) reasons.push('Excluded: NGO is inactive.');
    if (!availableAt(ngo,arrival)) reasons.push('Excluded: outside NGO availability hours.');
    if (listing.foodItems.some(f=>f.dietType==='non-veg'?!ngo.acceptsNonVeg:!ngo.acceptsVeg)) reasons.push('Excluded: diet mismatch.');
    if (arrival>deadline) reasons.push('Excluded: cannot arrive before deadline.');
    if (ngo.remainingCapacityMeals<=0) reasons.push('Excluded: no remaining capacity.');
    const feasible=!reasons.length, full=ngo.remainingCapacityMeals>=listing.quantityMeals;
    if(feasible) reasons.push(`Arrives ${Math.floor((deadline-arrival)/60000)} min before deadline`,full?`Capacity ${ngo.remainingCapacityMeals} ≥ ${listing.quantityMeals} needed`:`Partial — can accept ${ngo.remainingCapacityMeals} of ${listing.quantityMeals} meals. Split pickups are out of scope.`);
    return {ngoId:String(ngo._id),ngo,feasible,matchType:!feasible?'Excluded':full?'Full match':'Partial',score:0,distanceKm,etaMinutes,reasons,margin:Math.max(0,deadline-arrival)};
  });
  const full=results.filter(r=>r.feasible&&r.matchType==='Full match'), maxDistance=Math.max(...full.map(r=>r.distanceKm),1), maxMargin=Math.max(deadline-+now,1);
  for(const r of full) r.score=Math.round(100*(cfg.weights.timeMargin*Math.min(1,r.margin/maxMargin)+cfg.weights.distance*(1-r.distanceKm/maxDistance)+cfg.weights.capacityFit*listing.quantityMeals/r.ngo.remainingCapacityMeals));
  const tier=r=>!r.feasible?2:r.matchType==='Full match'?0:1;
  return results.sort((a,b)=>tier(a)-tier(b)||b.score-a.score||a.distanceKm-b.distanceKm||a.ngoId.localeCompare(b.ngoId));
}
export function urgency(deadline,now=new Date(),cfg=defaults) {const minutes=(+new Date(deadline)-+now)/60000;return minutes<cfg.urgencyMinutes.high?'High':minutes<cfg.urgencyMinutes.medium?'Medium':'Low';}
