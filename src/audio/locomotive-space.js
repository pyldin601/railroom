/** Front-biased locomotive transmission with short, quiet carriage reflections. */
export class LocomotiveSpace{
 constructor(context,destination){
  this.context=context;this.input=context.createGain();this.input.gain.value=.4;
  this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=2200;this.filter.Q.value=-3;
  this.input.connect(this.filter);this.paths=[];
  for(const [x,z,delay,level] of [[-.7,-14,0,.8],[-3,-6,.023,.22],[3,-4,.041,.18],[-2,2,.067,.08]]){
   const pan=context.createPanner(),gain=context.createGain(),echo=context.createDelay(.1);
   pan.panningModel='HRTF';pan.rolloffFactor=0;pan.positionX.value=x;pan.positionY.value=-.5;pan.positionZ.value=z;
   gain.gain.value=level;echo.delayTime.value=delay;
   this.filter.connect(echo).connect(gain).connect(pan).connect(destination);
   this.paths.push({pan,gain,echo,z});
  }
 }
 setListener(seat){for(const [i,path] of this.paths.entries())path.pan.positionZ.setTargetAtTime(i===0?-14:seat+path.z,this.context.currentTime,.03);}
 setSpatial(enabled){for(const {pan} of this.paths)pan.panningModel=enabled?'HRTF':'equalpower';}
 dispose(){this.input.disconnect();this.filter.disconnect();for(const {pan,gain,echo} of this.paths){pan.disconnect();gain.disconnect();echo.disconnect();}}
}
