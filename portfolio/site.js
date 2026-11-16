(() => {
const $=s=>document.querySelector(s), fmt=(x,n=0)=>Number.isFinite(x)?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:n}).format(x):'—';
const form=$('#calculator');
if(form){
const input=name=>form.elements.namedItem(name), num=name=>Number(input(name).value);
function update(){
const names=['price','reserve','fee','goal','media','fixed','direct','rate','sale','masters','days','daily','timeReserve','cac','prep'];
const valid=names.every(n=>input(n).value!==''&&Number.isFinite(num(n))&&num(n)>=0)&&num('rate')<=100&&num('timeReserve')<=100;
if(!valid){['required','contribution','profit','capacity','spare'].forEach(x=>$('#'+x).textContent='—');$('#calc-status').textContent='Заполните все поля неотрицательными числами. Доли должны быть от 0 до 100%.';$('#calc-status').className='calc-status warn';$('#capacity-bar').style.width='0%';return;}
const contribution=num('price')*(1-num('rate')/100)-num('direct')-num('reserve')-num('sale');
const cap=Math.floor(num('masters')*num('days')*num('daily')*(1-num('timeReserve')/100));
const fixed=num('fixed')+num('fee'),goal=num('goal'),media=num('media'),cac=num('cac'),prep=num('prep');
const mode=input('mode').value, margin=mode==='fixed'?contribution:contribution-cac;
const orders=margin>0?Math.ceil((goal+fixed+(mode==='fixed'?media:0))/margin):null;
const first=margin>0?Math.ceil((goal+fixed+prep+(mode==='fixed'?media:0))/margin):null;
const profit=n=>n===null?null:n*margin-fixed-(mode==='fixed'?media:0);
$('#contribution').textContent=fmt(contribution)+' ₽';$('#capacity').textContent=fmt(cap);
$('#required').textContent=orders===null?'—':fmt(orders);
$('#profit').textContent=orders===null?'—':fmt(profit(orders))+' ₽';$('#spare').textContent=orders===null?'—':fmt(cap-orders);
$('#meter-label').textContent=orders===null?'Расчёт цели невозможен':fmt(orders)+' заказов из '+fmt(cap)+' плановых слотов';
$('#capacity-bar').style.width=orders===null?'0%':Math.min(100,cap>0?orders/cap*100:100)+'%';$('#capacity-bar').className=orders!==null&&orders>cap?'over':'';
const ok=orders!==null&&orders<=cap;
$('#calc-status').className='calc-status'+(ok?'':' warn');
$('#calc-status').textContent=orders===null?'Вклад после выбранных переменных расходов неположительный. Увеличение объёма не достигает цели в этой модели.':orders>cap?'План превышает мощность на '+fmt(orders-cap)+' заказов. Сначала проверьте цену, CAC, затраты и фактическое время.':'План помещается в расчётную мощность. Остаток '+fmt(cap-orders)+' слотов; спрос и производительность ещё нужно подтвердить.';
$('#calc-formula').textContent='Вклад: цена × (1 − '+fmt(num('rate'),1)+'%) − '+fmt(num('direct'))+' − '+fmt(num('reserve'))+' − '+fmt(num('sale'))+'. Режим: '+(mode==='fixed'?'фиксированный медиабюджет '+fmt(media)+' ₽.':'медиа-CAC '+fmt(cac)+' ₽ на заказ.');
$('#scenario-base').textContent=fmt(profit(30))+' ₽';$('#scenario-target').textContent=orders===null?'—':fmt(orders)+' / '+fmt(profit(orders))+' ₽';
$('#scenario-first').textContent=first===null?'—':fmt(first)+' / '+fmt(profit(first)-prep)+' ₽';
$('#scenario-media').textContent=orders===null?'—':fmt(mode==='fixed'?media:orders*cac)+' ₽';
$('#scenario-cac').textContent=orders&&orders>0?fmt(mode==='fixed'?media/orders:cac)+' ₽':'—';
}
form.addEventListener('input',update);form.addEventListener('change',update);form.addEventListener('reset',()=>requestAnimationFrame(update));update();
}
const copy=$('#copy-brief');
if(copy)copy.addEventListener('click',async()=>{const text=$('#brief-text').innerText;try{await navigator.clipboard.writeText(text);$('#copy-status').textContent='Бриф скопирован. Заполните его и передайте в текущий чат.';}catch{$('#copy-status').textContent='Выделите текст брифа ниже и скопируйте его вручную.';}});
const search=$('#task-search'),week=$('#task-week');
if(search&&week){const rows=[...document.querySelectorAll('[data-task]')];function filter(){let count=0;rows.forEach(row=>{const show=row.textContent.toLocaleLowerCase('ru').includes(search.value.toLocaleLowerCase('ru'))&&(!week.value||row.dataset.week===week.value);row.hidden=!show;if(show)count++;});$('#task-count').textContent='Показано: '+count+' из '+rows.length;$('#task-empty').hidden=count!==0;}search.addEventListener('input',filter);week.addEventListener('change',filter);filter();}
})();

