const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(`${__dirname}/../app.js`, 'utf8');
const KEY = 'fangcun-returns-v2';
const products = [{id:'p_a',name:'产品 A',principal:1000,baseline:10}, {id:'p_b',name:'产品 B',principal:500,baseline:0}];
function app(initial, options = {}) {
  const nodes = new Map(), storage = options.storage || new Map([[KEY, JSON.stringify(initial)]]);
  let now = '2026-10-30T08:00:00Z';
  const events = {};
  let inputs = [], exported;
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {value:'',textContent:'',innerHTML:'',hidden:false,
      addEventListener(){},setAttribute(){},close(){this.open=false;},showModal(){this.open=true;},focus(){},select(){},click(){}});
    return nodes.get(selector);
  };
  vm.runInNewContext(source, {document:{querySelector:node,querySelectorAll:selector=>selector==='[data-income-withdrawal]'?inputs.filter(i=>i.dataset.incomeWithdrawal):selector==='[data-principal-product]'?inputs.filter(i=>i.dataset.principalProduct):inputs,createElement:()=>node('download')},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(options.failHistory && k.includes('history'))throw Error('QuotaExceeded');storage.set(k,v);},removeItem:k=>storage.delete(k)},
    window:{addEventListener(name,fn){events[name]=fn;}},location:{hash:'',search:'',protocol:'file:'},navigator:{},
    URL:{createObjectURL:blob=>(exported=blob,'blob:test'),revokeObjectURL(){}},Blob,URLSearchParams,
    structuredClone,Intl,Date:class extends Date {constructor(...args){super(...(args.length?args:[now]));}},setTimeout:()=>0,clearTimeout(){},confirm:options.confirm||(()=>true)});
  return {node,storage,advance:date=>{now=date;events.focus();},read:()=>JSON.parse(storage.get(KEY)),
    save(date, values){node('#record-date').value=date;inputs=Object.entries(values).map(([id,value])=>({dataset:{recordProduct:id},value:String(value)}));node('#record-form').onsubmit({preventDefault(){}});},
    changePrincipal(date, values, withdrawals={}){node('#principal-change-date').value=date;node('#principal-change-date').onchange();inputs=Object.entries(values).map(([id,value])=>({dataset:{principalProduct:id},value:String(value)})).concat(Object.entries(withdrawals).map(([id,value])=>({dataset:{incomeWithdrawal:id},value:String(value)})));node('#principal-change-form').onsubmit({preventDefault(){}});},
    fields(date){node('#record-date').value=date;node('#record-date').onchange();return node('#record-fields').innerHTML;},
    async csv(){node('#csv').onclick();return exported.text();},
    async historyExport(){node('#history-export').onclick();return JSON.parse(await exported.text());},
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
  assert.equal(restored.read().version,9);
  assert.match(restored.fields('2026-10-03'),/value="25.00"/);
});
test('legacy cumulative data converts chronologically, including gaps and nonzero baseline', async () => {
  const a=app({version:2,products,records:{'2026-10-03':{p_a:12,p_b:-2},'2026-09-30':{p_a:15},'2026-10-01':{p_a:20}}});
  assert.match(a.fields('2026-09-30'),/value="15.00"/);
  assert.match(a.fields('2026-10-03'),/value="12.00"/);
  const backup=await a.backup();
  assert.equal(backup.version,9);
  assert.equal(backup.records['2026-10-01'].p_a,20);
  a.save('2026-10-02',{p_a:18});
  assert.equal(a.node('#return-total').textContent,'10.00');
  assert.equal(a.node('#month-total').textContent,'-3.00');
  assert.equal(a.read().version,9);
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
  assert.equal((await a.backup()).version,9);
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
  a.node('#maturity-year').value='2027';a.node('#maturity-year').onchange();
  assert.match(a.node('#maturity-chart').innerHTML,/2027-01 到期本金 350,000.00 元/);
  assert.match(a.node('#maturity-chart').innerHTML,/2027-04 到期本金 0.00 元/);
  a.node('#maturity-year').value='2028';a.node('#maturity-year').onchange();
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

test('vault snapshots migrate, save independently, round-trip and reject invalid backups',async()=>{
  const a=app(assets([]));
  const edit=(date,id,amount)=>{
    a.node('#vault-table').onclick({target:{closest:()=>({dataset:{vaultDate:date,vaultId:id}})}});
    a.node('#vault-amount').value=amount;submit(a,'#vault-cell-form');
  };
  assert.match(a.node('#vault-table').innerHTML,/<th scope="col">日期<\/th>/);
  assert.match(a.node('#vault-table').innerHTML,/2 月 月初 · 1 日/);
  assert.equal((a.node('#vault-table').innerHTML.match(/<tr class="vault-month-start">/g)||[]).length,12);
  assert.doesNotMatch(a.node('#vault-table').innerHTML,/月末|vault-month-end/);
  edit('2026-10-01','p_abc','123.45');edit('2026-11-01','p_cash','0');edit('2026-12-01','p_abc','200');
  assert.equal(a.read().vault.balances['2026-10-01'].p_abc,123.45);
  assert.equal(a.read().vault.balances['2026-11-01'].p_cash,0);
  assert.deepEqual(a.read().records,{});
  edit('2026-10-01','p_abc','-1');assert.equal(a.read().vault.balances['2026-10-01'].p_abc,123.45);
  const backup=await a.backup(),restored=app(backup);
  assert.deepEqual((await restored.backup()).vault,backup.vault);
  edit('2026-10-01','p_abc','');assert.equal(Object.hasOwn(a.read().vault.balances,'2026-10-01'),false);
  a.node('#add-institution').onclick();a.node('#institution-name').value='我的银行';a.node('#institution-icon').value='ccb';submit(a,'#institution-form');
  assert.equal(a.read().vault.institutions.at(-1).name,'我的银行');
  const before=a.read();backup.vault.balances['2026-10-15']={p_cash:5};
  await a.node('#import-file').onchange({target:{files:[{size:100,text:async()=>JSON.stringify(backup)}],value:'file'}});
  assert.deepEqual(a.read(),before);
});

test('version 7 monthly vault values migrate to month end, including leap February',async()=>{
  const old=assets([]);
  old.version=7;
  old.vault={institutions:[{id:'p_cash',name:'现金',icon:'cash'}],balances:{'2024-02':{p_cash:25},'2026-04':{p_cash:40}}};
  const a=app(old);
  a.node('#vault-table').onclick({target:{closest:()=>({dataset:{vaultDate:'2024-02-01',vaultId:'p_cash'}})}});
  a.node('#vault-amount').value='0';submit(a,'#vault-cell-form');
  const backup=await a.backup();
  assert.equal(backup.version,9);
  assert.equal(backup.vault.balances['2024-02-29'].p_cash,25);
  assert.equal(backup.vault.balances['2026-04-30'].p_cash,40);
  assert.equal(backup.vault.balances['2024-02'],undefined);
  assert.equal(backup.vault.balances['2024-02-01'].p_cash,0);
  assert.deepEqual((await app(backup).backup()).vault,backup.vault);
});

test('maturity calendar selects one year and keeps detail in the selected year',()=>{
 const a=app(assets([]));
 assert.match(a.node('#maturity-year').innerHTML,/2028 年/);
 assert.equal((a.node('#maturity-chart').innerHTML.match(/data-maturity=/g)||[]).length,3);
 a.node('#maturity-year').value='2027';a.node('#maturity-year').onchange();
 assert.equal((a.node('#maturity-chart').innerHTML.match(/data-maturity=/g)||[]).length,12);
 assert.doesNotMatch(a.node('#maturity-chart').innerHTML,/data-maturity="2026/);
 assert.match(a.node('#maturity-detail').innerHTML,/2027-01/);
 a.node('#plan-target-month').value='2028-01';a.node('#plan-target-month').onchange();
 assert.equal(a.node('#maturity-year').value,'2028');
 a.node('#asset-horizon').value='12';a.node('#asset-horizon').onchange();
 assert.equal(a.node('#maturity-year').value,'2026');
});


test('clearing a vault row removes all its balances but preserves other dates and ledger data',async()=>{
  const initial=assets([]);
  initial.version=8;
  initial.vault={institutions:[{id:'p_cash',name:'现金',icon:'cash'},{id:'p_abc',name:'农业银行',icon:'abc'}],balances:{
    '2026-10-01':{p_cash:0,p_abc:123},'2026-10-31':{p_cash:456},'2025-10-01':{p_cash:789}
  }};
  const click=a=>a.node('#vault-table').onclick({target:{closest:selector=>selector==='[data-vault-clear]'?{dataset:{vaultClear:'2026-10-01'}}:null}});
  const cancelled=app(initial,{confirm:()=>false});
  click(cancelled);assert.deepEqual(cancelled.read(),initial);
  const a=app(initial);click(a);
  const expected={...structuredClone(initial),version:9,incomeWithdrawals:{}};delete expected.vault.balances['2026-10-01'];
  assert.deepEqual(a.read(),expected);
  assert.match(a.node('#vault-table').innerHTML,/data-vault-clear="2026-10-01"[^>]*disabled/);
  assert.deepEqual((await app(await a.backup()).backup()).vault,expected.vault);
});

test('vault and trends hide footer notes and switching back restores them',()=>{
  const a=app(assets([]));
  for(const page of ['vault','trends']){
    a.node(`#show-${page}`).onclick();assert.equal(a.node('footer').hidden,true);
    a.node('#show-ledger').onclick();assert.equal(a.node('footer').hidden,false);
  }
});

test('vault compares month starts only, ignoring retained month ends and preserving gaps',()=>{
  const initial=assets([]);initial.version=8;
  initial.vault={institutions:[{id:'p_cash',name:'现金',icon:'cash'}],balances:{
    '2026-01-01':{p_cash:100.10},'2026-01-31':{p_cash:120.30},
    '2026-02-01':{p_cash:0},'2026-02-28':{p_cash:0},'2026-03-31':{p_cash:50}
  }};
  const a=app(initial);
  const changes=()=>[...a.node('#vault-table').innerHTML.matchAll(/<td class="vault-change [^"]*">([^<]*)<\/td>/g)].map(m=>m[1]);
  assert.deepEqual(changes().slice(0,7),['—','-100.10','—','—','—','—','—']);
  a.node('#vault-table').onclick({target:{closest:selector=>selector==='[data-vault-id]'?{dataset:{vaultDate:'2026-01-01',vaultId:'p_cash'}}:null}});
  a.node('#vault-amount').value='110.10';submit(a,'#vault-cell-form');
  assert.deepEqual(changes().slice(0,3),['—','-110.10','—']);
  a.node('#vault-table').onclick({target:{closest:selector=>selector==='[data-vault-clear]'?{dataset:{vaultClear:'2026-01-01'}}:null}});
  assert.deepEqual(changes().slice(0,3),['—','—','—']);
});

test('principal and income withdrawals reduce holdings independently without changing earned returns',async()=>{
  const a=app({version:4,products:[products[0]],records:{'2026-09-30':{p_a:100},'2026-10-01':{p_a:120},'2026-10-02':{p_a:130}}});
  a.changePrincipal('2026-10-01',{p_a:-200},{p_a:30});
  assert.equal(a.node('#principal-total').textContent,'800.00');
  assert.equal(a.node('#holding-total').textContent,'900.00');
  assert.equal(a.node('#return-total').textContent,'130.00');
  assert.equal(a.node('#month-total').textContent,'30.00');
  assert.match(a.fields('2026-10-01'),/value="90.00"/);
  assert.match(a.fields('2026-10-02'),/value="100.00"/);
  assert.match(await a.csv(),/"2026-10-01","-200","90","20","90","20","30"/);
  assert.match(a.node('#trend-cards').innerHTML,/130.00/);
  a.save('2026-10-02',{p_a:105});
  assert.equal(a.read().records['2026-10-02'].p_a,135);
  assert.equal(a.node('#month-total').textContent,'35.00');
  a.node('#ledger').ondblclick({target:{closest:()=>({dataset:{editDate:'2026-10-02',editProduct:'p_a'}})}});
  assert.equal(a.node('#cell-amount').value,'105.00');
  a.node('#cell-amount').value='110';submit(a,'#cell-form');
  assert.equal(a.read().records['2026-10-02'].p_a,140);
  assert.equal(a.node('#holding-total').textContent,'910.00');
  const backup=await a.backup(),restored=app(backup);
  assert.deepEqual((await restored.backup()).incomeWithdrawals,{'2026-10-01':{p_a:30}});
  assert.equal(restored.node('#holding-total').textContent,'910.00');
  a.changePrincipal('2026-10-01',{}, {p_a:40});
  assert.equal(a.node('#principal-total').textContent,'1,000.00');
  assert.equal(a.node('#holding-total').textContent,'1,100.00');
  assert.equal(a.node('#month-total').textContent,'40.00');
  a.changePrincipal('2026-10-01',{},{});
  assert.deepEqual(a.read().incomeWithdrawals,{});
  assert.equal(a.node('#holding-total').textContent,'1,140.00');
  a.changePrincipal('2026-10-01',{}, {p_a:30});
  a.node('#clear-all').onclick();assert.deepEqual(a.read().incomeWithdrawals,{});
});

test('withdrawal-only dates carry balances across months, with no fabricated daily income',async()=>{
  const a=app({version:4,products:[products[0]],records:{'2026-09-30':{p_a:100}}});
  a.changePrincipal('2026-10-01',{}, {p_a:100});
  assert.equal(a.node('#holding-total').textContent,'1,000.00');
  assert.equal(a.node('#return-total').textContent,'100.00');
  assert.match(a.node('#ledger').innerHTML,/data-principal-date="2026-10-01"/);
  a.save('2026-10-02',{p_a:5});
  assert.equal(a.read().records['2026-10-02'].p_a,105);
  assert.equal(a.node('#month-total').textContent,'0.00');
  a.save('2026-10-03',{p_a:8});
  assert.equal(a.node('#month-total').textContent,'3.00');
});

test('invalid income withdrawals and historical edits cannot corrupt balances',async()=>{
  const a=app({version:4,products:[products[0]],records:{'2026-10-01':{p_a:100},'2026-10-03':{p_a:110}}});
  a.changePrincipal('2026-10-01',{}, {p_a:60});
  a.changePrincipal('2026-10-03',{}, {p_a:50});
  const before=a.read();
  for(const amount of [-1,1.001,101]){
    a.changePrincipal('2026-10-01',{p_a:-100},{p_a:amount});
    assert.deepEqual(a.read(),before);assert.ok(a.node('#principal-change-error').textContent);
  }
  a.changePrincipal('2026-10-01',{}, {p_a:70}); // makes the later withdrawal invalid
  assert.deepEqual(a.read(),before);
  a.save('2026-10-01',{p_a:-1});
  assert.deepEqual(a.read(),before);assert.match(a.node('#record-error').textContent,/超过可用收益/);
  for(const withdrawals of [null,[],{'2026-02-30':{p_a:1}},{'2026-10-01':{p_missing:1}},{'2026-10-01':{p_a:101}}]){
    const invalid={...before,incomeWithdrawals:withdrawals};
    await a.node('#import-file').onchange({target:{files:[{size:100,text:async()=>JSON.stringify(invalid)}],value:'file'}});
    assert.deepEqual(a.read(),before);assert.match(a.node('#toast').textContent,/无法导入/);
  }
});

const HISTORY_KEY = KEY + '-history-v1';
test('daily snapshots survive reload, roll over by Beijing day, and retain 30 usage days', () => {
  const a=app({version:4,products,records:{}});
  assert.equal(JSON.parse(a.storage.get(HISTORY_KEY)).length,1);
  a.advance('2026-10-30T15:59:00Z');
  assert.equal(JSON.parse(a.storage.get(HISTORY_KEY)).length,1);
  a.advance('2026-10-30T16:01:00Z');
  assert.equal(JSON.parse(a.storage.get(HISTORY_KEY)).length,2);
  const b=app(null,{storage:a.storage});
  assert.equal(JSON.parse(b.storage.get(HISTORY_KEY)).length,2);
  for(let i=1;i<=30;i++)b.advance(`2026-11-${String(i).padStart(2,'0')}T08:00:00Z`);
  const history=JSON.parse(b.storage.get(HISTORY_KEY));
  assert.equal(history.length,30);
  assert.equal(history[0].day,'2026-11-01');
});
test('restore backs up current ledger, recalculates totals, and exports selected snapshot', async () => {
  const a=app({version:4,products,records:{'2026-10-01':{p_a:20,p_b:5}}});
  a.save('2026-10-01',{p_a:90,p_b:5});
  a.node('#history').onclick();
  assert.equal((await a.historyExport()).records['2026-10-01'].p_a,20);
  a.node('#history-restore').onclick();
  assert.equal(a.read().records['2026-10-01'].p_a,20);
  assert.equal(a.node('#return-total').textContent,'25.00');
  a.node('#history').onclick();
  a.node('#history-restore').onclick();
  assert.equal(a.read().records['2026-10-01'].p_a,90);
  const before=a.read();
  a.node('#return-total').textContent='wrong';
  a.node('#recalculate').onclick();
  assert.equal(a.node('#return-total').textContent,'95.00');
  assert.deepEqual(a.read(),before);
  for(let i=0;i<25;i++)a.save('2026-10-01',{p_a:i,p_b:5});
  assert.equal(JSON.parse(a.storage.get(HISTORY_KEY)).filter(e=>e.kind==='change').length,20);
  assert.equal(JSON.parse(a.storage.get(HISTORY_KEY)).filter(e=>e.kind==='daily').length,1);
});
test('backup failure blocks edits and leaves saved data intact', () => {
  const a=app({version:4,products,records:{}},{failHistory:true});
  const before=a.read();
  a.save('2026-10-01',{p_a:100});
  assert.deepEqual(a.read(),before);
  assert.match(a.node('#toast').textContent,/未保存/);
});
test('recalculate reads latest saved data, retains missing entries and accounts for withdrawals', () => {
  const a=app({version:4,products,records:{'2026-10-01':{p_a:100}}});
  a.changePrincipal('2026-10-01',{}, {p_a:30});
  const before=a.read();
  a.node('#recalculate').onclick();
  assert.equal(a.node('#return-total').textContent,'100.00');
  assert.match(a.fields('2026-10-01'),/value="70.00"/);
  assert.deepEqual(a.read(),before);
  const updated=a.read();updated.records['2026-10-01'].p_a=110;
  a.storage.set(KEY,JSON.stringify(updated));
  a.node('#recalculate').onclick();
  assert.equal(a.node('#return-total').textContent,'110.00');
  assert.match(a.node('#ledger').innerHTML,/未填写，不计入/);
});

test('clear and import preserve recoverable snapshots; cancelling restore is read-only', async () => {
  const initial={version:4,products,records:{'2026-10-01':{p_a:20}}};
  const a=app(initial);
  a.node('#clear-all').onclick();
  assert.equal(a.read().products.length,0);
  a.node('#history').onclick();a.node('#history-restore').onclick();
  assert.equal(a.read().records['2026-10-01'].p_a,20);
  await a.node('#import-file').onchange({target:{files:[{size:100,text:async()=>JSON.stringify({...initial,records:{}})}],value:'file'}});
  assert.deepEqual(a.read().records,{});
  a.node('#history').onclick();a.node('#history-restore').onclick();
  assert.equal(a.read().records['2026-10-01'].p_a,20);
  const b=app(initial,{confirm:()=>false});b.save('2026-10-01',{p_a:99});
  const before=b.read();b.node('#history').onclick();b.node('#history-restore').onclick();
  assert.deepEqual(b.read(),before);
});

function displayedRowTotal(a, day) {
  const row=a.node('#ledger').innerHTML.split('<tr ').find(r=>r.includes(`<th>10.${day} <small>`));
  return row.match(/<td class="total [^"]*" title="[^"]*">([^<]*)<\/td>/)[1];
}
test('screenshot totals sum only entered remaining income despite baselines and previous records', async () => {
  const ps=['a','b','c','d','e','f'].map(id=>({id:'p_'+id,name:id,principal:1000,baseline:100}));
  ps[2].baseline=273.45;
  const a=app({version:4,products:ps,records:{
    '2026-09-30':{p_d:900,p_e:2000,p_f:500},
    '2026-10-07':{p_a:115.07},
    '2026-10-08':{p_a:115.07,p_b:0,p_e:1039.45,p_f:446.71},
    '2026-10-09':{p_a:125.31,p_b:-25.90,p_e:1006.90,p_f:440.28},
    '2026-10-10':{p_a:129.85,p_b:28.11,p_e:1006.90,p_f:440.28}
  }});
  const before=a.read();
  const expected=['115.07','1,601.23','1,546.59','1,605.14'];
  for(let i=0;i<4;i++)assert.equal(displayedRowTotal(a,i+7),expected[i]+' *');
  const csv=await a.csv();
  for(let i=0;i<4;i++) {
    const line=csv.split('\r\n').find(r=>r.startsWith(`"2026-10-${String(i+7).padStart(2,'0')}"`));
    assert.equal(line.split(',')[19],`"${Number(expected[i].replace(',',''))}"`);
  }
  a.node('#recalculate').onclick();
  assert.deepEqual(a.read(),before);
  assert.equal(displayedRowTotal(a,8),'1,601.23 *');
  a.save('2026-10-08',{p_a:0});
  assert.equal(displayedRowTotal(a,8),'0.00 *');
  assert.equal(displayedRowTotal(a,6),'—');
});
test('row totals exclude withdrawn income while daily gains still include withdrawals', async () => {
  const a=app({version:4,products,records:{'2026-09-30':{p_a:100},'2026-10-01':{p_a:120}}});
  a.changePrincipal('2026-10-01',{}, {p_a:30});
  assert.equal(displayedRowTotal(a,1),'90.00 *');
  assert.equal(a.node('#month-total').textContent,'20.00');
  assert.equal(a.node('#return-total').textContent,'120.00');
  assert.match(await a.csv(),/"90","20","30",""/);
});
