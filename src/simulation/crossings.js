export function findCrossings(segments,axles,route){
 const result=[];
 for(const seg of segments){const end=seg.start.position+seg.start.speed*seg.duration+.5*seg.acceleration*seg.duration**2;
  if(end<=seg.start.position)continue;
  for(const axle of axles)for(const object of route.between(seg.start.position-axle.offset,end-axle.offset)){
   const d=Math.max(0,object.position+axle.offset-seg.start.position),v=seg.start.speed,a=seg.acceleration;
   const t=Math.abs(a)<1e-12?d/v:2*d/(v+Math.sqrt(Math.max(0,v*v+2*a*d)));
   result.push({objectId:object.id,wheelsetId:axle.id,offset:axle.offset,side:object.side,simulationTime:seg.start.time+t,speedMps:Math.max(0,v+a*t),kind:object.type,position:object.position});
  }
 }
 return result.sort((a,b)=>a.simulationTime-b.simulationTime||a.wheelsetId.localeCompare(b.wheelsetId)||a.side.localeCompare(b.side));
}
