(() => {
  'use strict';
  const KEY = 'fangcun-returns-v2';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDate = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const cents = n => Math.round(Number(n) * 100);
  const money = n => (n / 100).toLocaleString('zh-CN', {minimumFractionDigits:2,maximumFractionDigits:2});
  const color = n => n > 0 ? 'gain' : n < 0 ? 'loss' : 'muted';
  const uid = () => `p_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
  const validAmount = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e9 && Math.abs(n * 100 - Math.round(n * 100)) < .0001;
  const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= '1900-01-01' && d <= '9999-12-31' && new Date(`${d}T12:00:00Z`).toISOString().slice(0,10) === d;
  let month = localDate().slice(0,7), timer, draft, storageBroken = false;
  function validate(data) {
    if (!data || data.version !== 2 || !Array.isArray(data.products) || data.products.length > 100 || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) throw Error('备份格式不正确');
    const ids = new Set();
    const products = data.products.map(p => {
      if (!p || typeof p.id !== 'string' || !/^p_[\w-]{1,100}$/.test(p.id) || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 60 || !validAmount(p.principal) || p.principal < 0 || !validAmount(p.baseline)) throw Error('产品信息不正确');
      ids.add(p.id); return {id:p.id,name:p.name.trim(),principal:p.principal,baseline:p.baseline};
    });
    const records = {};
    for (const [date, row] of Object.entries(data.records)) {
      if (!validDate(date) || !row || typeof row !== 'object' || Array.isArray(row)) throw Error('记录日期不正确');
      const clean = {};
      for (const [id, value] of Object.entries(row)) { if (!ids.has(id) || !validAmount(value)) throw Error('收益记录不正确'); clean[id] = value; }
      if (Object.keys(clean).length) records[date] = clean;
    }
    return {version:2,products,records};
  }
  function load() {
    storageBroken = false;
    try { const raw = localStorage.getItem(KEY); if (raw !== null) return validate(JSON.parse(raw)); }
    catch { storageBroken = true; }
    return {version:2,products:[],records:{}};
  }
  let data = load();
  function notify(text) { $('#toast').textContent = text; $('#toast').hidden = false; clearTimeout(timer); timer = setTimeout(() => { $('#toast').hidden = true; },4500); }
  function commit(next) {
    if (storageBroken) { notify('本地数据读取失败。请先导出原始数据，检查浏览器存储后刷新。'); return false; }
    try { localStorage.setItem(KEY,JSON.stringify(next)); data = next; $('#save-status').textContent = '已保存到本机'; return true; }
    catch { $('#save-status').textContent = '保存失败'; notify('保存失败：请检查浏览器存储权限或空间，并导出备份。'); return false; }
  }
  const dates = () => Object.keys(data.records).sort();
  function lastValue(product,date,inclusive = true) {
    const prev = dates().filter(d => (inclusive ? d <= date : d < date) && Object.hasOwn(data.records[d],product.id)).at(-1);
    return prev ? cents(data.records[prev][product.id]) : cents(product.baseline);
  }
  function delta(product,date) { return Object.hasOwn(data.records[date] || {},product.id) ? cents(data.records[date][product.id]) - lastValue(product,date,false) : null; }
  function daily(date) { return data.products.reduce((sum,p) => sum + (delta(p,date) ?? 0),0); }
  function monthDates() {
    const [year,m] = month.split('-').map(Number);
    return Array.from({length:new Date(year,m,0).getDate()},(_,i) => `${month}-${String(i+1).padStart(2,'0')}`);
  }
  const weekday = date => new Date(`${date}T12:00:00Z`).getUTCDay();
  function render() {
    const days = monthDates(), end = days.at(-1), start = days[0], products = data.products;
    $('#month').value = month;
    $('#table-title').textContent = `${Number(month.slice(0,4))} 年 ${Number(month.slice(5))} 月 · 每日收益`;
    const principal = products.reduce((s,p) => s + cents(p.principal),0);
    const accumulated = products.reduce((s,p) => s + lastValue(p,end),0);
    const monthly = products.map(p => lastValue(p,end) - lastValue(p,start,false));
    $('#principal-total').textContent = money(principal);
    $('#month-total').textContent = money(monthly.reduce((s,n) => s+n,0));
    $('#month-total').className = color(monthly.reduce((s,n) => s+n,0));
    $('#return-total').textContent = money(accumulated);
    $('#holding-total').textContent = money(principal+accumulated);
    let html = `<thead><tr><th>理财产品</th>${products.map(p => `<th colspan="2">${esc(p.name)}</th>`).join('')}<th colspan="3">收益汇总</th></tr><tr><th>理财本金</th>${products.map(p => `<th colspan="2">${money(cents(p.principal))}</th>`).join('')}<th colspan="3">总本金 ${money(principal)}</th></tr><tr><th>日期</th>${products.map(() => '<th>累计收益</th><th class="change-head">涨跌</th>').join('')}<th>累计总收益</th><th class="change-head">当日增减</th><th>本周增减</th></tr></thead><tbody>`;
    days.forEach((date,i) => {
      const day = weekday(date), recorded = Object.keys(data.records[date] || {}).length;
      html += `<tr class="${day===0||day===6?'weekend ':''}${date===localDate()?'today':''}"><th>${Number(date.slice(5,7))}.${Number(date.slice(8))} <small>周${'日一二三四五六'[day]}</small></th>`;
      products.forEach(p => {
        const value = data.records[date]?.[p.id], change = delta(p,date);
        html += `<td class="entry">${value===undefined?'—':money(cents(value))}</td><td class="delta ${color(change)}">${change===null?'—':money(change)}</td>`;
      });
      const total = products.reduce((s,p) => s+lastValue(p,date),0);
      const tooltip = recorded && recorded < products.length ? '部分产品已记录，未填产品沿用上次累计收益' : '';
      html += `<td class="total ${recorded?'':'muted'}" title="${tooltip}">${recorded?money(total)+(recorded<products.length?' *':''):'—'}</td><td class="total ${recorded?color(daily(date)):'muted'}">${recorded?money(daily(date)):'—'}</td>`;
      if (i===0 || day===1) {
        const count = Math.min(day===0?1:8-day,days.length-i), group = days.slice(i,i+count);
        const sum = group.reduce((s,d) => s+daily(d),0), has = group.some(d => Object.keys(data.records[d] || {}).length);
        html += `<td class="week ${has?color(sum):'muted'}" rowspan="${count}" title="本月内的周收益；跨月周只计算本月日期">${has?money(sum):'—'}</td>`;
      }
      html += '</tr>';
    });
    html += `</tbody><tfoot><tr><th>本月收益</th>${products.map((p,i) => `<td colspan="2" class="${color(monthly[i])}">${money(monthly[i])}</td>`).join('')}<td colspan="3" class="${color(monthly.reduce((s,n)=>s+n,0))}">${money(monthly.reduce((s,n)=>s+n,0))}</td></tr><tr><th>月末持仓金额</th>${products.map(p => `<td colspan="2">${money(cents(p.principal)+lastValue(p,end))}</td>`).join('')}<td colspan="3">${money(principal+accumulated)}</td></tr></tfoot>`;
    $('#ledger').innerHTML = html;
  }
  function renderRecordFields() {
    const date = $('#record-date').value;
    $('#record-fields').innerHTML = data.products.map(p => {
      const value = data.records[date]?.[p.id];
      return `<label class="record-field"><span>${esc(p.name)}<small>本金 ${money(cents(p.principal))} 元</small></span><input data-record-product="${p.id}" type="number" min="0" max="2000000000" step="0.01" inputmode="decimal" placeholder="最新持仓金额" value="${value === undefined ? '' : ((cents(p.principal)+cents(value))/100).toFixed(2)}"></label>`;
    }).join('');
    $('#record-error').textContent = '';
  }
  $('#record-date').onchange = renderRecordFields;
  $('#close-record').onclick = () => $('#record-dialog').close();
  $('#cancel-record').onclick = () => $('#record-dialog').close();
  $('#record-form').onsubmit = event => {
    event.preventDefault();
    const date = $('#record-date').value;
    if (!validDate(date)) { $('#record-error').textContent='请选择有效日期'; return; }
    const row = {};
    for (const input of document.querySelectorAll('[data-record-product]')) {
      if (!input.value.trim()) continue;
      const p = data.products.find(p => p.id === input.dataset.recordProduct);
      const holding = Number(input.value), value = (cents(holding)-cents(p.principal))/100;
      if (!Number.isFinite(holding) || holding < 0 || !validAmount(value)) { $('#record-error').textContent='请输入有效金额，最多两位小数'; return; }
      row[p.id] = value;
    }
    if (!Object.keys(row).length) { $('#record-error').textContent='请至少填写一个产品的持仓金额'; return; }
    const next=structuredClone(data);
    next.records[date] = row;
    if (commit(next)) { month=date.slice(0,7); render(); $('#record-dialog').close(); notify('记录已保存，收益已更新'); }
  };
  $('#clear-all').onclick = () => {
    if (!confirm('清空全部产品、所有日期的收益记录及本浏览器旧版账本？此操作不能撤销。')) return;
    const wasBroken=storageBroken; storageBroken=false;
    if (!commit({version:2,products:[],records:{}})) { storageBroken=wasBroken; return; }
    try { localStorage.removeItem('fangcun-ledger-v1'); $('#legacy-backup').hidden=true; }
    catch { notify('收益表已清空，但旧版账本清除失败'); render(); return; }
    render(); notify('全部数据已清空，可重新添加产品');
  };
  $('#month').addEventListener('change',event => { if (/^\d{4}-\d{2}$/.test(event.target.value) && event.target.value >= '1900-01' && event.target.value <= '9999-12') {month = event.target.value;render();} else event.target.value = month; });
  function moveMonth(n) { const d = new Date(`${month}-15T12:00:00Z`); d.setUTCMonth(d.getUTCMonth()+n); const next = d.toISOString().slice(0,7); if (next >= '1900-01' && next <= '9999-12') {month=next;render();} }
  $('#prev-month').onclick = () => moveMonth(-1); $('#next-month').onclick = () => moveMonth(1);
  $('#today').onclick = () => {month=localDate().slice(0,7);render();};
  $('#record-today').onclick = () => {
    if (!data.products.length) { $('#manage').click(); notify('请先添加理财产品，再新增记录'); return; }
    $('#record-date').value=localDate(); renderRecordFields(); $('#record-dialog').showModal();
  };
  function renderProducts() {
    $('#product-rows').innerHTML = draft.map(p => `<div class="product-row" data-id="${p.id}"><input aria-label="产品名称" maxlength="60" required value="${esc(p.name)}"><input aria-label="本金" type="number" min="0" max="1000000000" step="0.01" required value="${p.principal}"><input aria-label="期初收益" type="number" min="-1000000000" max="1000000000" step="0.01" required value="${p.baseline}"><button type="button" data-remove="${p.id}" title="删除产品" aria-label="删除${esc(p.name)}">×</button></div>`).join('');
  }
  function readDraft() { draft = [...document.querySelectorAll('.product-row')].map(row => { const inputs = row.querySelectorAll('input'); return {id:row.dataset.id,name:inputs[0].value,principal:Number(inputs[1].value),baseline:Number(inputs[2].value)}; }); }
  $('#manage').onclick = () => {draft=structuredClone(data.products);$('#product-error').textContent='';renderProducts();$('#products-dialog').showModal();};
  $('#close-dialog').onclick = () => $('#products-dialog').close();
  $('#add-product').onclick = () => {readDraft();if(draft.length>=100)return;draft.push({id:uid(),name:'',principal:0,baseline:0});renderProducts();$('#product-rows').lastElementChild.querySelector('input').focus();};
  $('#product-rows').onclick = event => {const id=event.target.dataset.remove;if(!id)return;readDraft();draft=draft.filter(p=>p.id!==id);renderProducts();};
  $('#product-form').onsubmit = event => {
    event.preventDefault();readDraft(); const removed=data.products.filter(p=>!draft.some(d=>d.id===p.id));
    if (removed.some(p=>dates().some(d=>Object.hasOwn(data.records[d],p.id))) && !confirm('保存后将删除已移除产品的全部收益记录。建议先导出备份。确定继续？'))return;
    const next=structuredClone(data);next.products=draft;for(const row of Object.values(next.records))for(const p of removed)delete row[p.id];
    try {const clean=validate(next);if(commit(clean)){$('#products-dialog').close();render();notify('产品设置已保存');}}catch(error){$('#product-error').textContent=error.message;}
  };
  function download(content,type,name) { const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
  $('#backup').onclick = () => download(storageBroken ? (localStorage.getItem(KEY) || '{}') : JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2),'application/json',`收益记录备份-${localDate()}.json`);
  $('#restore').onclick = () => $('#import-file').click();
  $('#import-file').onchange = async event => {
    const file=event.target.files?.[0];if(!file)return;
    try {if(file.size>10*1024*1024)throw Error('备份文件不能超过 10MB');const imported=validate(JSON.parse(await file.text()));
      if(!confirm('导入将替换当前收益表的全部产品和记录，建议先导出备份。确定导入？'))return;
      const wasBroken=storageBroken;storageBroken=false;
      if(commit(imported)){render();notify('备份已恢复');}else storageBroken=wasBroken;
    }catch(error){notify(`无法导入：${error.message}`);}finally{event.target.value='';}
  };
  $('#csv').onclick = () => {
    const cell = value => {const str=String(value);return '"'+(/^[=+\-@\t\r]/.test(str)&&typeof value==='string'?"'":'')+str.replace(/"/g,'""')+'"';};
    const rows=[['日期',...data.products.flatMap(p=>[`${p.name} 累计收益`,`${p.name} 涨跌`]),'累计总收益','当日增减']];
    for(const date of monthDates()){const has=Object.keys(data.records[date]||{}).length;rows.push([date,...data.products.flatMap(p=>[data.records[date]?.[p.id]??'',delta(p,date)===null?'':delta(p,date)/100]),has?data.products.reduce((s,p)=>s+lastValue(p,date),0)/100:'',has?daily(date)/100:'']);}
    const days=monthDates();rows.push(['本月收益',...data.products.flatMap(p=>[(lastValue(p,days.at(-1))-lastValue(p,days[0],false))/100,'']),'',days.reduce((s,d)=>s+daily(d),0)/100]);
    download('\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8',`收益记录-${month}.csv`);
  };
  try {if(localStorage.getItem('fangcun-ledger-v1')){$('#legacy-backup').hidden=false;$('#legacy-backup').onclick=()=>download(localStorage.getItem('fangcun-ledger-v1'),'application/json',`旧版账本备份-${localDate()}.json`);}}catch{}
  window.addEventListener('storage',event=>{if(event.key===KEY){data=load();render();notify('已同步此浏览器另一窗口的修改');}});
  render();
  if(storageBroken){$('#save-status').textContent='本地数据读取失败';notify('原始数据已保留，请先导出备份再检查存储。');}
  if('serviceWorker' in navigator && location.protocol !== 'file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
