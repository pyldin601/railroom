/** Event-driven while idle; capped at 30 fps while animating. */
export function createRenderLoop(draw, {frame=requestAnimationFrame,timer=setTimeout,cancelTimer=clearTimeout,visible=()=>!document.hidden}={}){
 let queued=false,wake=null;
 function invalidate(){
  if(wake!==null){cancelTimer(wake);wake=null;}
  if(queued||!visible())return;
  queued=true;
  frame(()=>{
   queued=false;if(!visible())return;
   if(draw())wake=timer(()=>{wake=null;invalidate();},1000/30);
  });
 }
 return invalidate;
}
