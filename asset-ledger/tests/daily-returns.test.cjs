const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(`${__dirname}/../app.js`, 'utf8');
const KEY = 'fangcun-returns-v2';
const products = [{id:'p_a',name:'产品 A',principal:1000,baseline:10}, {id:'p_b',name:'产品 B',principal:500,baseline:0}];
function app(initial) {
  const nodes = new Map(), storage = new Map([[KEY, JSON.stringify(initial)]]);
  let inputs = [], exported;
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {value:'',textContent:'',innerHTML:'',hidden:false,
      addEventListener(){},setAttribute(){},close(){this.open=false;},showModal(){this.open=true;},focus(){},select(){},click(){}});
    return nodes.get(selector);
  };
  vm.runInNewContext(source, {document:{querySelector:node,querySelectorAll:()=>inputs,createElement:()=>node('download')},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    window:{addEventListener(){}},location:{hash:'',search:'',protocol:'file:'},navigator:{},
    URL:{createObjectURL:blob=>(exported=blob,'blob:test'),revokeObjectURL(){}},Blob,URLSearchParams,
    structuredClone,Intl,Date:class extends Date {constructor(...args){super(...(args.length?args:['2026-10-30T08:00:00Z']));}},setTimeout:()=>0,clearTimeout(){},confirm:()=>true});
  return {node,read:()=>JSON.parse(storage.get(KEY)),
    save(date, values){node('#record-date').value=date;inputs=Object.entries(values).map(([id,value])=>({dataset:{recordProduct:id},value:String(value)}));node('#record-form').onsubmit({preventDefault(){}});},
    changePrincipal(date, values){node('#principal-change-date').value=date;node('#principal-change-date').onchange();inputs=Object.entries(values).map(([id,value])=>({dataset:{principalProduct:id},value:String(value)}));node('#principal-change-form').onsubmit({preventDefault(){}});},
    fields(date){node('#record-date').value=date;node('#record-date').onchange();return node('#record-fields').innerHTML;},
    async csv(){node('#csv').onclick();return exported.text();},
    async backup(){node('#backup').onclick();return JSON.parse(await exported.text());}};
}
test('records are cumulative income; daily rise is the difference from yesterday', async () => {
  const a=app({version:4,products,records:{}});
  a.save('2026-09-30',{p_a:12});
  a.save('2026-10-01',{p_a:20,p_b:0});
  a.save('2026-10-02',{p_a:30,p_b:-5});
  a.save('2026-10-03',{p_a:25,p_b:0});
  assert.equal(a.read().records['2026-10-03'].p_a,25);
  assert.equal(a.node('#month-total').textContent,'13.00');
  assert.equal(a.node('#return-total').textContent,'25.00');
  assert.equal(a.node('#holding-total').textContent,'1,525.00');
  assert.match(a.fields('2026-10-03'),/value="25.00"/);
  assert.match(a.fields('2026-10-03'),/value="0.00"/);
  assert.match(a.node('#ledger').innerHTML,/>25.00<\/td><td class="delta loss"[^>]*>-5.00/);
  assert.match(await a.csv(),/"2026-10-03","","25","-5","","0","5","25","0"/);
  const restored=app(await a.backup());
  assert.equal(restored.read().version,6);
  assert.match(restored.fields('2026-10-03'),/value="25.00"/);
});
test('legacy cumulative data converts chronologically, including gaps and nonzero baseline', async () => {
  const a=app({version:2,products,records:{'2026-10-03':{p_a:12,p_b:-2},'2026-09-30':{p_a:15},'2026-10-01':{p_a:20}}});
  assert.match(a.fields('2026-09-30'),/value="15.00"/);
  assert.match(a.fields('2026-10-03'),/value="12.00"/);
  const backup=await a.backup();
  assert.equal(backup.version,6);
  assert.equal(backup.records['2026-10-01'].p_a,20);
  a.save('2026-10-02',{p_a:18});
  assert.equal(a.node('#return-total').textContent,'10.00');
  assert.equal(a.node('#month-total').textContent,'-3.00');
  assert.equal(a.read().version,6);
});
test('blank products remove only that date; invalid precision is rejected', () => {
  const a=app({version:4,products,records:{'2026-10-01':{p_a:5,p_b:7},'2026-10-02':{p_a:4,p_b:3}}});
  a.save('2026-10-01',{p_a:0,p_b:''});
  assert.deepEqual(a.read().records['2026-10-01'],{p_a:0});
  assert.equal(a.read().records['2026-10-02'].p_b,3);
  a.save('2026-10-02',{p_a:1.001});
  assert.match(a.node('#record-error').textContent,/最多两位小数/);
  assert.equal(a.read().records['2026-10-02'].p_a,4);
});

test('double click edits only the selected cell after confirmation; cancel and Escape do not save', () => {
  const a=app({version:4,products,records:{'2026-10-01':{p_a:5,p_b:7},'2026-10-02':{p_a:4}}});
  const open=(date,id)=>a.node('#ledger').ondblclick({target:{closest:()=>({dataset:{editDate:date,editProduct:id}})}});
  const submit=()=>a.node('#cell-form').onsubmit({preventDefault(){}});
  open('2026-10-01','p_a');
  assert.equal(a.node('#cell-dialog').open,true);
  assert.equal(a.node('#cell-amount').value,'5.00');
  assert.equal(a.node('#cell-context').textContent,'2026-10-01 · 产品 A');
  a.node('#cell-amount').value='-2.50';
  assert.equal(a.read().records['2026-10-01'].p_a,5);
  a.node('#cancel-cell').onclick(); submit();
  assert.equal(a.read().records['2026-10-01'].p_a,5);
  open('2026-10-01','p_a'); a.node('#cell-amount').value='-2.50'; submit();
  assert.equal(a.node('#cell-dialog').open,false);
  assert.deepEqual(a.read().records,{'2026-10-01':{p_a:-2.5,p_b:7},'2026-10-02':{p_a:4}});
  assert.equal(a.node('#month-total').textContent,'6.50');
  open('2026-10-03','p_b'); assert.equal(a.node('#cell-amount').value,'');
  submit(); assert.match(a.node('#cell-error').textContent,/有效/);
  a.node('#cell-amount').value='1.001';submit();
  assert.equal(a.read().records['2026-10-03'],undefined);
  a.node('#cell-amount').value='0';submit();
  assert.equal(a.read().records['2026-10-03'].p_b,0);
  open('2026-10-01','p_a'); a.node('#cell-amount').value='999';
  a.node('#cell-dialog').oncancel();submit();
  assert.equal(a.read().records['2026-10-01'].p_a,-2.5);
  a.node('#ledger').ondblclick({target:{closest:()=>null}});
});

test('income changes compare calendar days across months and recalculate the next day', async () => {
  const a=app({version:4,products,records:{'2026-09-30':{p_a:100},'2026-10-01':{p_a:120},'2026-10-02':{p_a:110},'2026-10-04':{p_a:0}}});
  a.save('2026-10-01',{p_a:120});
  let csv=await a.csv();
  assert.match(csv,/"2026-10-01","","120","20"/);
  assert.match(csv,/"2026-10-02","","110","-10"/);
  assert.match(csv,/"2026-10-04","","0",""/);
  a.save('2026-10-01',{p_a:90});
  csv=await a.csv();
  assert.match(csv,/"2026-10-01","","90","-10"/);
  assert.match(csv,/"2026-10-02","","110","20"/);
  assert.match(a.node('#ledger').innerHTML,/class="entry editable[^>]*data-edit-date="2026-10-01"/);
  assert.doesNotMatch(a.node('#ledger').innerHTML,/class="delta[^>]*data-edit-date/);
});

test('version 3 daily return records migrate to cumulative values once', async () => {
  const a=app({version:3,products,records:{'2026-10-01':{p_a:5},'2026-10-02':{p_a:-2},'2026-10-04':{p_a:0}}});
  assert.match(a.fields('2026-10-01'),/value="15.00"/);
  assert.match(a.fields('2026-10-02'),/value="13.00"/);
  assert.match(a.fields('2026-10-04'),/value="13.00"/);
  assert.equal(a.read().version,3);
  assert.equal((await a.backup()).version,6);
});

test('monthly income sums visible daily rises and excludes dates without a computable rise', async () => {
  const a=app({version:4,products:[products[0]],records:{'2026-09-30':{p_a:10},'2026-10-01':{p_a:20},'2026-10-02':{p_a:25},'2026-10-04':{p_a:100}}});
  assert.equal(a.node('#month-total').textContent,'15.00');
  const csv=await a.csv();
  assert.match(csv,/"本月收益","","15","","","15"/);
});

test('principal changes preserve income, historical balances and backups', async () => {
  const a=app({version:4,products,records:{'2026-10-14':{p_a:20,p_b:5},'2026-10-16':{p_a:25,p_b:8}}});
  a.changePrincipal('2026-10-15',{p_a:500});
  assert.equal(a.node('#principal-total').textContent,'2,000.00');
  assert.equal(a.node('#return-total').textContent,'33.00');
  assert.match(a.fields('2026-10-14'),/本金 1,000.00 元/);
  assert.match(a.fields('2026-10-15'),/本金 1,500.00 元/);
  a.changePrincipal('2026-10-20',{p_a:-1200});
  assert.equal(a.node('#holding-total').textContent,'833.00');
  assert.match(await a.csv(),/"2026-10-15","500"/);
  a.changePrincipal('2026-10-15',{});
  assert.match(a.node('#principal-change-error').textContent,/本金不能低于 0/);
  assert.equal(a.read().principalChanges['2026-10-15'].p_a,500);
  a.changePrincipal('2026-10-20',{});
  assert.equal(a.read().principalChanges['2026-10-20'],undefined);
  const backup=await a.backup();
  assert.deepEqual(backup.principalChanges,{'2026-10-15':{p_a:500}});
  assert.equal(app(backup).node('#principal-total').textContent,'2,000.00');
  a.node('#prev-month').onclick();
  assert.equal(a.node('#principal-total').textContent,'1,500.00');
});

const planning={salary:20000,expenses:6000,reserve:4000,cash:10000,target:30000};
const lot=(id,date,amount=10000,extra={})=>({id,productId:'p_a',buyDate:'2026-10-01',maturityDate:date,amount,expected:null,status:'holding',...extra});
const assets=lots=>({version:6,products,records:{},principalChanges:{},lots,planning});
const submit=(a,id)=>a.node(id).onsubmit({preventDefault(){}});
test('maturity ladder groups purchase batches, excludes received, overdue and undated amounts',async()=>{
  const a=app(assets([lot('p_1','2027-01-06',250000),lot('p_2','2027-01-08',100000),lot('p_3','2026-10-01'),lot('p_4',''),lot('p_5','2027-04-01',10000,{status:'received'}),lot('p_6','2028-02-18',20000),lot('p_7','2027-04-01',10000,{buyDate:'2027-01-01'})]));
  assert.match(a.node('#asset-summary').innerHTML,/370,000.00/);
  assert.match(a.node('#asset-alert').textContent,/1 笔已到期未确认/);
  assert.match(a.node('#asset-alert').textContent,/1 笔活期/);
  assert.match(a.node('#maturity-chart').innerHTML,/2027-01 到期本金 350,000.00 元/);
  assert.match(a.node('#maturity-chart').innerHTML,/2027-04 到期本金 0.00 元/);
  assert.match(a.node('#maturity-chart').innerHTML,/2028-02 到期本金 20,000.00 元/);
  assert.deepEqual((await a.backup()).lots,assets([lot('p_1','2027-01-06',250000),lot('p_2','2027-01-08',100000),lot('p_3','2026-10-01'),lot('p_4',''),lot('p_5','2027-04-01',10000,{status:'received'}),lot('p_6','2028-02-18',20000),lot('p_7','2027-04-01',10000,{buyDate:'2027-01-01'})]).lots);
});
test('payday simulation respects budget, selected maturity month, exact days and does not book a purchase',async()=>{
  const a=app(assets([lot('p_1','2027-04-05',5000)]));
  a.node('#plan-target-month').value='2027-04';a.node('#plan-target-month').onchange();
  a.node('#plan-buy-date').value='2026-10-30';a.node('#plan-buy-date').onchange();
  assert.match(a.node('#plan-advice').textContent,/153–182 天/);
  a.node('#candidate-date').value='2027-04-15';a.node('#candidate-amount').value='20000';submit(a,'#simulate-form');
  assert.match(a.node('#plan-result').textContent,/5,000.00 → 25,000.00/);
  assert.match(a.node('#plan-result').textContent,/目标缺口 5,000.00/);
  assert.equal((await a.backup()).lots.length,1);
  a.node('#candidate-amount').value='20000.01';submit(a,'#simulate-form');
  assert.match(a.node('#plan-result').textContent,/超过/);
  a.node('#candidate-amount').value='10000';a.node('#candidate-date').value='2027-03-15';submit(a,'#simulate-form');
  assert.match(a.node('#plan-result').textContent,/无法填补/);
});
test('recording and editing a lot preserves principal and returns; invalid dates cannot overwrite it',async()=>{
  const a=app({version:5,products,records:{'2026-10-30':{p_a:20}},principalChanges:{}});
  a.node('#add-lot').onclick();a.node('#lot-product').value='p_a';a.node('#lot-buy').value='2026-10-01';a.node('#lot-maturity').value='2027-04-01';a.node('#lot-amount').value='1000';a.node('#lot-expected').value='';a.node('#lot-status').value='holding';submit(a,'#lot-form');
  const saved=await a.backup();assert.equal(saved.lots.length,1);assert.equal(saved.lots[0].expected,null);
  assert.equal(a.node('#principal-total').textContent,'1,500.00');assert.equal(a.node('#return-total').textContent,'20.00');
  a.node('#asset-lots').onclick({target:{closest:selector=>selector==='[data-edit-lot]'?{dataset:{editLot:saved.lots[0].id}}:null}});
  a.node('#lot-maturity').value='2026-09-30';submit(a,'#lot-form');assert.match(a.node('#lot-error').textContent,/持仓信息不正确/);
  assert.equal(a.read().lots[0].maturityDate,'2027-04-01');
  a.node('#lot-maturity').value='2027-05-01';submit(a,'#lot-form');assert.equal(a.read().lots.length,1);assert.equal(a.read().lots[0].maturityDate,'2027-05-01');
  assert.deepEqual((await app(await a.backup()).backup()).lots,a.read().lots);
  a.node('#clear-all').onclick();assert.equal(a.read().lots.length,0);assert.equal(a.read().planning.target,0);
});
test('invalid imported maturity data is rejected without replacing the ledger',async()=>{
 const a=app(assets([]));
 for(const bad of [lot('p_1','2026-02-30'),lot('p_1','2027-01-01',-1),lot('p_1','2027-01-01',1,{productId:'p_missing'})]){
  await a.node('#import-file').onchange({target:{files:[{size:200,text:async()=>JSON.stringify(assets([bad]))}],value:'file'}});
  assert.match(a.node('#toast').textContent,/无法导入/);assert.equal(a.read().lots.length,0);
 }
});
