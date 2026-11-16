(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NicheModel=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function validate(m){
 if(!m||!m.meta||!m.inputs||!Array.isArray(m.canvas))throw Error('Нужны meta, inputs и canvas');
 const i=m.inputs,keys=['traffic','conversion','price','direct','variable_rate','service_reserve','first_cost','repeat_cost','apc','cpc','fixed','tracking','target_profit','preparation'];
 keys.forEach(k=>{if(!finite(i[k])||i[k]<0)throw Error('Некорректный параметр '+k);});
 if(i.conversion>1||i.variable_rate>=1||i.apc<1)throw Error('Проверьте доли и APC');
 if(m.canvas.length!==9||new Set(m.canvas.map(x=>x.id)).size!==9)throw Error('В канве должны быть 9 разных блоков');
 if(m.capacity?.enabled){const c=m.capacity;['teams','days','orders_per_day','reserve_rate'].forEach(k=>{if(!finite(c[k])||c[k]<0)throw Error('Некорректная мощность '+k);});if(c.reserve_rate>=1)throw Error('Резерв мощности должен быть меньше 100%');}
 if(!Array.isArray(m.retention)||m.retention[0]!==1||m.retention.some(x=>!finite(x)||x<0||x>1))throw Error('Проверьте профиль повторных покупок');
 return true;
}
function calc(m,patch={}){
 const i={...m.inputs,...patch},c=m.capacity||{},cogs=i.direct+i.service_reserve+i.price*i.variable_rate;
 const gross=i.price-cogs,arpc=gross*i.apc-i.first_cost-i.repeat_cost*(i.apc-1),buyers=i.traffic*i.conversion,orders=buyers*i.apc,ac=i.traffic*i.cpc;
 const cm=buyers*arpc-ac,overhead=i.fixed+i.tracking,profit=cm-overhead;
 const capacity=c.enabled?Math.floor(c.teams*c.days*c.orders_per_day*(1-c.reserve_rate)):null;
 return {inputs:i,cogs,gross,arpc,buyers,orders,ac,cm,overhead,profit,capacity,grossCapacity:c.enabled?c.teams*c.days*c.orders_per_day:null,revenue:orders*i.price,cac:buyers>0?ac/buyers:null,fullCac:buyers>0?ac/buyers+i.first_cost:null,leads:i.traffic*(i.lead_rate||0),activated:i.traffic*(i.lead_rate||0)*(i.activation_rate||0),impressions:i.ctr>0?i.traffic/i.ctr:null};
}
function calculate(m,patch={}){
 validate({...m,inputs:{...m.inputs,...patch}});const b=calc(m,patch),i=b.inputs,T=i.target_profit+b.overhead,targetPerCustomer=b.buyers>0?(T+b.ac)/b.buyers:null;
 function row(key,label,symbol,value,patchForTarget,unit,note,mode='period'){
  const valid=value!==null&&finite(value)&&value>=0&&(unit!=='ratio'||value<=1)&&(key!=='apc'||value>=1);
  const outcome=valid?calc(m,{...patch,...patchForTarget(value)}):null;
  const slots=outcome?Math.ceil(outcome.orders-1e-9):null;
  return {key,label,symbol,current:({traffic:i.traffic,conversion:i.conversion,price:i.price,cogs:b.cogs,first_cost:i.first_cost,apc:i.apc,cpc:i.cpc})[key],target:valid?value:null,rawTarget:value,unit,note,mode,outcome,slots,status:!valid?'impossible':mode==='cohort'?'horizon':b.capacity!==null&&slots>b.capacity?'capacity':'candidate'};
 }
 const trafficDen=i.conversion*b.arpc-i.cpc;
 const rows=[
 row('traffic','Посетители','ua',trafficDen>0?T/trafficDen:null,v=>({traffic:v}),'number','CPC постоянный; рекламный бюджет растёт вместе с посетителями.'),
 row('conversion','Посетитель → покупатель','c1',i.traffic>0&&b.arpc>0?(T/i.traffic+i.cpc)/b.arpc:null,v=>({conversion:v}),'ratio','Общий переход от посетителя к новому покупателю.'),
 row('price','Средний чек','avp',targetPerCustomer!==null?(targetPerCustomer+(i.direct+i.service_reserve)*i.apc+i.first_cost+i.repeat_cost*(i.apc-1))/(i.apc*(1-i.variable_rate)):null,v=>({price:v}),'money','Процентные расходы пересчитываются вместе с ценой.'),
 row('cogs','Прямые расходы на заказ','cogs',targetPerCustomer!==null?i.price-(targetPerCustomer+i.first_cost+i.repeat_cost*(i.apc-1))/i.apc:null,v=>({direct:v-i.service_reserve-i.price*i.variable_rate}),'money','Общая сумма прямых затрат; резерв и процентные статьи показаны отдельно.'),
 row('first_cost','Стоимость первой продажи','1scogs',targetPerCustomer!==null?b.gross*i.apc-i.repeat_cost*(i.apc-1)-targetPerCustomer:null,v=>({first_cost:v}),'money','Отрицательная требуемая стоимость означает недостижимость этим рычагом.'),
 row('apc','Покупок на клиента','apc',targetPerCustomer!==null&&b.gross>i.repeat_cost?(targetPerCustomer+i.first_cost-i.repeat_cost)/(b.gross-i.repeat_cost):null,v=>({apc:v}),'times','Теоретический расчёт калькулятора. Повторы требуют своего окна; этот результат не обещает прибыль первого месяца.','cohort'),
 row('cpc','Стоимость посетителя','cpa → CPC',i.traffic>0?(b.buyers*b.arpc-T)/i.traffic:null,v=>({cpc:v}),'money','В исходном шаблоне cpa — стоимость входящей единицы. В этой модели это CPC, а не CAC.')
 ];
 // A target COGS cannot reduce separately preserved expenses below zero.
 const cog=rows.find(x=>x.key==='cogs');if(cog.target!==null&&cog.target<i.service_reserve+i.price*i.variable_rate){cog.target=null;cog.status='impossible';cog.outcome=null;}
 const sensitivity=[
 ['price','Чек +10%',{price:i.price*1.1}],
 ['cogs','Прямые затраты −10%',{direct:b.cogs*.9-i.service_reserve-i.price*i.variable_rate}],
 ['conversion','Конверсия +10%',{conversion:Math.min(1,i.conversion*1.1)}],
 ['cpc','CPC −10%',{cpc:i.cpc*.9}],
 ['traffic','Посетители +10%',{traffic:i.traffic*1.1}],
 ['first_cost','Первая продажа −10%',{first_cost:i.first_cost*.9}]
 ].map(([key,label,p])=>({key,label,profit:calc(m,{...patch,...p}).profit,delta:calc(m,{...patch,...p}).profit-b.profit}));
 const unit=i.price-(i.direct+i.service_reserve+i.price*i.variable_rate)-i.first_cost;
 const fixedOrders=unit>0?Math.ceil((i.target_profit+b.ac+b.overhead)/unit-1e-9):null;
 const firstOrders=unit>0?Math.ceil((i.target_profit+b.ac+b.overhead+i.preparation)/unit-1e-9):null;
 const constantCac=b.cac!==null&&unit>b.cac?Math.ceil((i.target_profit+b.overhead)/(unit-b.cac)-1e-9):null;
 const retained=m.retention.map((_,month)=>{let repeats=0;for(let cohort=0;cohort<month;cohort++)repeats+=b.buyers*m.retention[month-cohort];return {month:month+1,new:b.buyers,repeats,total:b.buyers+repeats,revenue:(b.buyers+repeats)*i.price,profit:b.buyers*unit+repeats*(b.gross-i.repeat_cost)-b.ac-b.overhead};});
 const apc12=m.retention.reduce((s,x)=>s+x,0),ltv=b.gross*apc12-i.repeat_cost*(apc12-1);
 return {...b,targetCM:T,targetRows:rows,sensitivity,unit,fixedOrders,firstOrders,constantCac,retained,apc12,ltv,ltvAfterAcquisition:b.fullCac===null?null:ltv-b.fullCac};
}
return {validate,calculate,calc};
});

