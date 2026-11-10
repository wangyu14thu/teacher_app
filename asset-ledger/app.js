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
  const validAmount = (n, limit = 1e9) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= limit && Math.abs(n * 100 - Math.round(n * 100)) < .0001;
  const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= '1900-01-01' && d <= '9999-12-31' && new Date(`${d}T12:00:00Z`).toISOString().slice(0,10) === d;
  const monthEnd = m => `${m}-${String(new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0)).getUTCDate()).padStart(2,'0')}`;
  let month = localDate().slice(0,7), timer, draft, storageBroken = false;
  const vaultIcons = {abc:'农业银行',bocom:'交通银行',icbc:'工商银行',alipay:'支付宝',wechat:'微信',fund:'公积金',cash:'现金',other:'其他机构',boc:'中国银行',ccb:'建设银行',cmb:'招商银行',psbc:'邮储银行'};
  const emptyVault = () => ({institutions:['abc','bocom','icbc','alipay','wechat','fund','cash'].map(icon=>({id:'p_'+icon,name:vaultIcons[icon],icon})),balances:{}});
  function validateVault(vault, version) {
    if (!vault || !Array.isArray(vault.institutions) || vault.institutions.length > 100 || !vault.balances || typeof vault.balances !== 'object' || Array.isArray(vault.balances)) throw Error('大金库格式不正确');
    const ids = new Set();
    const institutions = vault.institutions.map(i=>{
      if (!i || !/^p_[\w-]{1,100}$/.test(i.id) || ids.has(i.id) || typeof i.name !== 'string' || !i.name.trim() || i.name.length>60 || !Object.hasOwn(vaultIcons,i.icon)) throw Error('资产机构信息不正确');
      ids.add(i.id); return {id:i.id,name:i.name.trim(),icon:i.icon};
    });
    const balances = {};
    for (const [key,row] of Object.entries(vault.balances)) {
      const legacy = version === 7;
      if (legacy ? !/^\d{4}-(0[1-9]|1[0-2])$/.test(key) || key<'1900-01' || key>'9999-12' : !validDate(key) || (key.slice(8) !== '01' && key !== monthEnd(key.slice(0,7)))) throw Error('资产日期不正确');
      if (!row || typeof row!=='object' || Array.isArray(row)) throw Error('资产余额不正确');
      const date = legacy ? monthEnd(key) : key;
      balances[date]={};
      for(const [id,value] of Object.entries(row)) {
        if(!ids.has(id) || !validAmount(value) || value<0) throw Error('资产余额不正确');
        balances[date][id]=value;
      }
    }
    return {institutions,balances};
  }
  function validate(data) {
    if (!data || ![2,3,4,5,6,7,8,9].includes(data.version) || !Array.isArray(data.products) || data.products.length > 100 || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) throw Error('备份格式不正确');
    const ids = new Set();
    const products = data.products.map(p => {
      if (!p || typeof p.id !== 'string' || !/^p_[\w-]{1,100}$/.test(p.id) || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 60 || !validAmount(p.principal) || p.principal < 0 || !validAmount(p.baseline)) throw Error('产品信息不正确');
      ids.add(p.id); return {id:p.id,name:p.name.trim(),principal:p.principal,baseline:p.baseline};
    });
    const records = {};
    for (const [date, row] of Object.entries(data.records)) {
      if (!validDate(date) || !row || typeof row !== 'object' || Array.isArray(row)) throw Error('记录日期不正确');
      const clean = {};
      for (const [id, value] of Object.entries(row)) { if (!ids.has(id) || !validAmount(value, data.version >= 3 ? 2e9 : 1e9)) throw Error('收益记录不正确'); clean[id] = value; }
      if (Object.keys(clean).length) records[date] = clean;
    }
    // Version 2 stored cumulative returns. Version 3 stored daily changes.
    if (data.version === 2) {
      // Values are already cumulative.
    } else if (data.version === 3) {
      for (const product of products) {
        let total = cents(product.baseline);
        for (const date of Object.keys(records).sort()) {
          if (!Object.hasOwn(records[date], product.id)) continue;
          total += cents(records[date][product.id]);
          records[date][product.id] = total / 100;
        }
      }
    }
    const principalChanges = {};
    if (data.version >= 5) {
      if (!data.principalChanges || typeof data.principalChanges !== 'object' || Array.isArray(data.principalChanges)) throw Error('本金变动格式不正确');
      for (const [date, row] of Object.entries(data.principalChanges || {})) {
        if (!validDate(date) || !row || typeof row !== 'object' || Array.isArray(row)) throw Error('本金变动日期不正确');
        const clean = {};
        for (const [id, value] of Object.entries(row)) { if (!ids.has(id) || !validAmount(value, 1e9)) throw Error('本金变动金额不正确'); clean[id] = value; }
        if (Object.keys(clean).length) principalChanges[date] = clean;
      }
    }
    for (const product of products) {
      let balance = cents(product.principal);
      for (const date of Object.keys(principalChanges).sort()) {
        if (Object.hasOwn(principalChanges[date], product.id)) balance += cents(principalChanges[date][product.id]);
        if (balance < 0) throw Error(`${product.name} 在 ${date} 的本金不能低于 0`);
      }
    }
    const incomeWithdrawals = {};
    if (data.version >= 9) {
      if (!data.incomeWithdrawals || typeof data.incomeWithdrawals !== 'object' || Array.isArray(data.incomeWithdrawals)) throw Error('收益取出格式不正确');
      for (const [date,row] of Object.entries(data.incomeWithdrawals)) {
        if (!validDate(date) || !row || typeof row !== 'object' || Array.isArray(row)) throw Error('收益取出日期不正确');
        const clean = {};
        for (const [id,value] of Object.entries(row)) {
          if (!ids.has(id) || !validAmount(value) || value < 0) throw Error('取出收益请输入非负金额，最多两位小数');
          if (value > 0) clean[id] = value;
        }
        if (Object.keys(clean).length) incomeWithdrawals[date] = clean;
      }
    }
    for (const product of products) {
      let withdrawn = 0;
      for (const date of Object.keys(incomeWithdrawals).sort()) {
        if (!Object.hasOwn(incomeWithdrawals[date],product.id)) continue;
        withdrawn += cents(incomeWithdrawals[date][product.id]);
        const latest = Object.keys(records).sort().filter(d=>d<=date && Object.hasOwn(records[d],product.id)).at(-1);
        const earned = cents(latest ? records[latest][product.id] : product.baseline);
        if (withdrawn > earned) throw Error(`${product.name} 在 ${date} 的取出收益超过可用收益，请先补录该日收益`);
      }
    }
    const lots = data.version >= 6 ? data.lots : [];
    if (!Array.isArray(lots) || lots.length > 10000) throw Error('持仓明细格式不正确');
    const lotIds = new Set();
    const cleanLots = lots.map(l => {
      if (!l || typeof l.id !== 'string' || !/^p_[\w-]{1,100}$/.test(l.id) || lotIds.has(l.id) || !ids.has(l.productId) || !validDate(l.buyDate) || (l.maturityDate !== '' && (!validDate(l.maturityDate) || l.maturityDate < l.buyDate)) || !validAmount(l.amount) || l.amount <= 0 || (l.expected !== null && (!validAmount(l.expected) || l.expected < 0)) || !['holding','received'].includes(l.status)) throw Error('持仓信息不正确：请检查产品、金额、日期和状态');
      lotIds.add(l.id);
      return {id:l.id,productId:l.productId,buyDate:l.buyDate,maturityDate:l.maturityDate,amount:l.amount,expected:l.expected,status:l.status};
    });
    const planning = data.version >= 6 ? data.planning : {salary:0,expenses:0,reserve:0,cash:0,target:0};
    if (!planning || !['salary','expenses','reserve','cash','target'].every(k => validAmount(planning[k]) && planning[k] >= 0)) throw Error('工资规划金额不正确');
    return {version:9,vault:validateVault(data.version>=7?data.vault:emptyVault(),data.version),products,records,principalChanges,incomeWithdrawals,lots:cleanLots,planning:Object.fromEntries(['salary','expenses','reserve','cash','target'].map(k=>[k,planning[k]]))};
  }
  function load() {
    storageBroken = false;
    try { const raw = localStorage.getItem(KEY); if (raw !== null) return validate(JSON.parse(raw)); }
    catch { storageBroken = true; }
    return {version:9,vault:emptyVault(),products:[],records:{},principalChanges:{},incomeWithdrawals:{},lots:[],planning:{salary:0,expenses:0,reserve:0,cash:0,target:0}};
  }
  let data = load();
  function notify(text) { $('#toast').textContent = text; $('#toast').hidden = false; clearTimeout(timer); timer = setTimeout(() => { $('#toast').hidden = true; },4500); }
  const HISTORY_KEY = KEY + '-history-v1';
  function readHistory() {
    const entries = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(entries) || entries.some(e => !e || typeof e.raw !== 'string' || typeof e.id !== 'string' || typeof e.day !== 'string' || typeof e.at !== 'string' || !['daily','change'].includes(e.kind))) throw Error('备份记录无法读取，请先导出当前账本');
    return entries;
  }
  function snapshot(beforeChange = false) {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return;
    let entries = readHistory();
    const day = localDate(), at = new Date().toISOString();
    const add = kind => entries.push({id:uid(),kind,day,at,raw});
    if (!entries.some(e => e.kind === 'daily' && e.day === day)) add('daily');
    if (beforeChange && entries.filter(e=>e.kind==='change').at(-1)?.raw !== raw) add('change');
    const retained = new Set([...entries.filter(e=>e.kind==='daily').slice(-30), ...entries.filter(e=>e.kind==='change').slice(-20)]);
    entries = entries.filter(e=>retained.has(e));
    const serialized = JSON.stringify(entries);
    if (serialized !== localStorage.getItem(HISTORY_KEY)) localStorage.setItem(HISTORY_KEY, serialized);
    $('#backup-status').textContent = '自动备份已就绪 · ' + day + '（北京时间）';
  }
  function autoBackup() {
    try { snapshot(); }
    catch { $('#backup-status').textContent = '自动备份失败，请导出备份'; }
  }
  function commit(next) {
    if (storageBroken) { notify('本地数据读取失败。请先导出原始数据，检查浏览器存储后刷新。'); return false; }
    try { snapshot(true); localStorage.setItem(KEY,JSON.stringify(next)); data = next; $('#save-status').textContent = '已保存到本机'; return true; }
    catch { $('#save-status').textContent = '保存失败'; notify('保存或修改前备份失败，本次修改未保存。请检查浏览器存储权限或空间，并导出备份。'); return false; }
  }
  const dates = () => Object.keys(data.records).sort();
  const principalAt = (product,date) => cents(product.principal) + Object.entries(data.principalChanges || {}).filter(([d,row]) => d <= date && Object.hasOwn(row,product.id)).reduce((sum,[,row]) => sum + cents(row[product.id]),0);
  const principalChange = (product,date) => Object.hasOwn((data.principalChanges && data.principalChanges[date]) || {},product.id) ? cents(data.principalChanges[date][product.id]) : null;
  function lastValue(product,date,inclusive = true) {
    const previous = dates().filter(d => (inclusive ? d <= date : d < date) && Object.hasOwn(data.records[d],product.id)).at(-1);
    return previous ? cents(data.records[previous][product.id]) : cents(product.baseline);
  }
  const withdrawnAt = (product,date) => Object.entries(data.incomeWithdrawals).filter(([d])=>d<=date).reduce((sum,[,row])=>sum+cents(row[product.id]||0),0);
  const remainingAt = (product,date) => lastValue(product,date)-withdrawnAt(product,date);
  function delta(product,date) { return Object.hasOwn(data.records[date] || {},product.id) ? cents(data.records[date][product.id])-withdrawnAt(product,date) : null; }
  // Sum exactly the remaining-income cells shown on this date; missing is not zero input.
  const recordedTotal = date => data.products.reduce((sum,p) => sum + (delta(p,date) ?? 0),0);
  function changeFromYesterday(product,date) {
    const previous = new Date(`${date}T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate()-1);
    const current = delta(product,date), before = delta(product,previous.toISOString().slice(0,10));
    return current === null || before === null ? null : current-before+withdrawnAt(product,date)-withdrawnAt(product,previous.toISOString().slice(0,10));
  }
  const signedMoney = value => (value > 0 ? '+' : '') + money(value);
  function daily(date) { const changes = data.products.map(p => changeFromYesterday(p,date)).filter(value => value !== null); return changes.length ? changes.reduce((sum,value) => sum+value,0) : null; }
  function monthDates() {
    const [year,m] = month.split('-').map(Number);
    return Array.from({length:new Date(year,m,0).getDate()},(_,i) => `${month}-${String(i+1).padStart(2,'0')}`);
  }
  const weekday = date => new Date(`${date}T12:00:00Z`).getUTCDay();
  function render() {
    const days = monthDates(), end = days.at(-1), start = days[0], products = data.products;
    $('#month').value = month;
    $('#table-title').textContent = `${Number(month.slice(0,4))} 年 ${Number(month.slice(5))} 月 · 每日收益`;
    const principal = products.reduce((s,p) => s + principalAt(p,end),0);
    const accumulated = products.reduce((s,p) => s + lastValue(p,end),0);
    const remaining = products.reduce((s,p)=>s+remainingAt(p,end),0);
    const monthly = products.map(p => days.reduce((sum,date) => sum + (changeFromYesterday(p,date) ?? 0),0));
    $('#principal-total').textContent = money(principal);
    $('#month-total').textContent = money(monthly.reduce((s,n) => s+n,0));
    $('#month-total').className = color(monthly.reduce((s,n) => s+n,0));
    $('#return-total').textContent = money(accumulated);
    $('#return-total').className = color(accumulated);
    $('#holding-total').textContent = money(principal+remaining);
    let html = `<thead><tr><th>理财产品</th>${products.map(p => `<th colspan="2">${esc(p.name)}</th>`).join('')}<th colspan="3">收益汇总</th></tr><tr><th>截至月底本金</th>${products.map(p => `<th colspan="2">${money(principalAt(p,end))}</th>`).join('')}<th colspan="3">总本金 ${money(principal)}</th></tr><tr><th>日期</th>${products.map(() => '<th>剩余收益</th><th class="change-head">涨幅</th>').join('')}<th title="仅合计当天已填写的剩余收益；空白不计入，不额外加入期初或已取出收益">已填收益合计</th><th class="change-head">当日增减</th><th>本周增减</th></tr></thead><tbody>`;
    days.forEach((date,i) => {
      const day = weekday(date), recorded = Object.keys(data.records[date] || {}).length;
      const principalRows = products.map(p => ({product:p,amount:principalChange(p,date)})).filter(item => item.amount !== null);
      const netChange = principalRows.reduce((sum,item) => sum+item.amount,0);
      const withdrawalRows = products.filter(p=>data.incomeWithdrawals[date]?.[p.id]);
      const detail = [...principalRows.map(item => `${item.product.name} 本金 ${signedMoney(item.amount)}`),...withdrawalRows.map(p=>`${p.name} 取出收益 ${money(cents(data.incomeWithdrawals[date][p.id]))}`)].join('；');
      html += `<tr class="${day===0||day===6?'weekend ':''}${date===localDate()?'today':''}"><th>${Number(date.slice(5,7))}.${Number(date.slice(8))} <small>周${'日一二三四五六'[day]}</small>${principalRows.length || withdrawalRows.length ? `<button type="button" class="principal-change" data-principal-date="${date}" title="${esc(detail)}" aria-label="${date} 本息变动：${esc(detail)}">本息 ${withdrawalRows.length?'变动':netChange===0?'变动':signedMoney(netChange)}</button>` : ''}</th>`;
      products.forEach(p => {
        const value = delta(p,date), change = changeFromYesterday(p,date);
        html += `<td class="entry editable ${color(value)}" data-edit-date="${date}" data-edit-product="${p.id}" tabindex="0" aria-haspopup="dialog" aria-label="${esc(p.name)} ${date} 剩余收益 ${value===null?'未记录':money(value)} 元，双击或按 Enter 修改" title="双击修改截至当天的剩余收益">${value===null?'—':money(value)}</td><td class="delta ${color(change)}" title="涨幅 = 当天剩余收益 − 上一日剩余收益 + 当天取出收益；任一天未记录时不计算">${change===null?'—':signedMoney(change)}</td>`;
      });
      const total = recordedTotal(date);
      const tooltip = '仅合计当天已填写的剩余收益；空白不计入。\n' + products.map(p => {
        const value = delta(p,date);
        return `${p.name}：${value === null ? '未填写，不计入' : money(value)}`;
      }).join('\n');
      html += `<td class="total ${recorded?color(total):'muted'}" title="${esc(tooltip)}">${recorded?money(total)+(recorded<products.length?' *':''):'—'}</td><td class="total ${recorded?color(daily(date)):'muted'}">${daily(date)!==null?money(daily(date)):'—'}</td>`;
      if (i===0 || day===1) {
        const count = Math.min(day===0?1:8-day,days.length-i), group = days.slice(i,i+count);
        const known = group.map(d => daily(d)).filter(value => value !== null), sum = known.reduce((s,value) => s+value,0), has = known.length > 0;
        html += `<td class="week ${has?color(sum):'muted'}" rowspan="${count}" title="本月内的周收益；跨月周只计算本月日期">${has?money(sum):'—'}</td>`;
      }
      html += '</tr>';
    });
    html += `</tbody><tfoot><tr><th>本月收益</th>${products.map((p,i) => `<td colspan="2" class="${color(monthly[i])}">${money(monthly[i])}</td>`).join('')}<td colspan="3" class="${color(monthly.reduce((s,n)=>s+n,0))}">${money(monthly.reduce((s,n)=>s+n,0))}</td></tr><tr><th>月末持仓金额</th>${products.map(p => `<td colspan="2">${money(principalAt(p,end)+remainingAt(p,end))}</td>`).join('')}<td colspan="3">${money(principal+remaining)}</td></tr></tfoot>`;
    $('#ledger').innerHTML = products.length ? html : '<tbody><tr><td class="empty-state"><h3>账本为空，从第一个产品开始</h3><p>点击「管理产品」添加产品，再点击「新增记录」填写当日剩余收益。</p></td></tr></tbody>';
    renderVault();
    renderTrends();
    renderAssets();
  }
  function renderTrends() {
    const all = $('#trend-range').value === 'all';
    $('#trend-cards').innerHTML = data.products.length ? data.products.map(p => {
      const points = dates().filter(d => (all || d.startsWith(month)) && Object.hasOwn(data.records[d],p.id))
        .map(date => ({date,value:lastValue(p,date)}));
      if (!points.length) return `<article class="trend-card"><h3>${esc(p.name)}</h3><p class="empty-state">此范围内暂无记录，新增记录后将在这里显示趋势。</p></article>`;
      const values = points.map(p => p.value), low = Math.min(0,...values), high = Math.max(0,...values);
      const padding = Math.max((high-low)*.12,100), min = low-padding, max = high+padding;
      const first = Date.parse(points[0].date), last = Date.parse(points.at(-1).date);
      const x = d => last===first ? 360 : 100+(Date.parse(d)-first)/(last-first)*520;
      const y = v => 220-(v-min)/(max-min)*180;
      const ticks = Array.from({length:5},(_,i) => min+(max-min)*i/4);
      const latest = points.at(-1), change = latest.value-points[0].value;
      const labels = [...new Set([points[0].date,points[Math.floor((points.length-1)/2)].date,latest.date])];
      const gradient = `curve-${p.id}`;
      return `<article class="trend-card"><div class="trend-card-head"><h3>${esc(p.name)}</h3><div><strong class="${color(latest.value)}">${money(latest.value)}</strong><small>最近累计收益 · ${latest.date}</small></div></div>
        <div class="chart-scroll"><svg viewBox="0 0 700 270" role="img" aria-label="${esc(p.name)}累计收益趋势，${points.length}条记录，最新${money(latest.value)}元">
        <defs><linearGradient id="${gradient}" x1="0" x2="0" y1="40" y2="220" gradientUnits="userSpaceOnUse"><stop offset="${(y(0)-40)/180}" stop-color="#b42332"/><stop offset="${(y(0)-40)/180}" stop-color="#16704b"/></linearGradient></defs>
        ${ticks.map(v => `<line x1="100" x2="620" y1="${y(v)}" y2="${y(v)}" stroke="#e2e7ef"/><text x="90" y="${y(v)+4}" text-anchor="end">${money(Math.round(v))}</text>`).join('')}
        <line x1="100" x2="620" y1="${y(0)}" y2="${y(0)}" stroke="#8090a3" stroke-dasharray="4 4"/>
        <polyline fill="none" stroke="url(#${gradient})" stroke-width="3" stroke-linejoin="round" points="${points.map(pt=>`${x(pt.date)},${y(pt.value)}`).join(' ')}"/>
        ${points.map(pt=>`<circle tabindex="0" cx="${x(pt.date)}" cy="${y(pt.value)}" r="4" fill="${pt.value<0?'#16704b':'#b42332'}"><title>${pt.date}：${money(pt.value)} 元</title></circle>`).join('')}
        ${labels.map(d=>`<text x="${x(d)}" y="250" text-anchor="middle">${d.slice(5)}</text>`).join('')}</svg></div>
        <p class="trend-note">${points.length} 条记录 · 区间增减 <span class="${color(change)}">${money(change)} 元</span>${points.length===1?' · 记录两次后显示连线':''}</p>
        <details><summary>查看曲线数据</summary><ul class="trend-values">${points.map(pt=>`<li><span>${pt.date}</span><strong class="${color(pt.value)}">${money(pt.value)} 元</strong></li>`).join('')}</ul></details></article>`;
    }).join('') : '<div class="empty-state"><h3>还没有理财产品</h3><p>先在「管理产品」中添加产品，再通过「新增记录」录入金额。</p></div>';
  }
  function switchPage(page) {
    if(location.hash !== `#${page}`) history.replaceState(null,'',`${location.pathname}${location.search}#${page}`);
    for (const name of ['ledger','trends','assets','vault','butler']) {
      $(`#${name}-page`).hidden = name !== page;
      $(`#show-${name}`).setAttribute('aria-pressed',String(name === page));
    }
    $('.summary').hidden = ['assets','vault','butler'].includes(page);
    $('.toolbar').hidden = ['vault','butler'].includes(page);
    $('[aria-label="数据维护"]').hidden = page === 'butler';
    $('#sprite-toggle').hidden = page === 'butler';
    $('#vault-toolbar').hidden = page !== 'vault';
    $('footer').hidden = ['trends','vault','butler'].includes(page);
  }
  $('#show-ledger').onclick=()=>switchPage('ledger');
  $('#show-trends').onclick=()=>switchPage('trends');
  $('#show-vault').onclick=()=>switchPage('vault');
  $('#show-assets').onclick=()=>switchPage('assets');
  $('#show-butler').onclick=()=>switchPage('butler');
  $('#sprite-toggle').onclick=()=>{switchPage('butler');$('#chat-input').focus();};
  window.addEventListener('hashchange',()=>switchPage(['trends','assets','vault','butler'].includes(location.hash.slice(1))?location.hash.slice(1):'ledger'));
  $('#trend-range').onchange=renderTrends;
  function renderRecordFields() {
    const date = $('#record-date').value;
    $('#record-fields').innerHTML = data.products.map(p => {
      const value = delta(p,date);
      return `<label class="record-field"><span>${esc(p.name)}<small>本金 ${money(principalAt(p,date))} 元</small></span><input data-record-product="${p.id}" type="number" min="-2000000000" max="2000000000" step="0.01" inputmode="decimal" placeholder="截至当日剩余收益" value="${value === null ? '' : (value/100).toFixed(2)}"></label>`;
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
      const value = Number(input.value);
      if (!validAmount(value, 2e9)) { $('#record-error').textContent='请输入有效金额，最多两位小数'; return; }
      row[p.id] = (cents(value)+withdrawnAt(p,date))/100;
    }
    if (!Object.keys(row).length) { $('#record-error').textContent='请至少填写一个产品的剩余收益（可填 0）'; return; }
    const next=structuredClone(data);
    next.records[date] = row;
    try { if (commit(validate(next))) { month=date.slice(0,7); render(); $('#record-dialog').close(); notify('记录已保存，收益已更新'); } } catch(error) { $('#record-error').textContent=error.message; }
  };
  let editingCell = null;
  function openCellEditor(event) {
    const cell = event.target.closest('[data-edit-date]');
    if (!cell) return;
    const date = cell.dataset.editDate, id = cell.dataset.editProduct;
    const product = data.products.find(p => p.id === id);
    if (!product || !validDate(date)) return;
    editingCell = {date,id};
    $('#cell-context').textContent = `${date} · ${product.name}`;
    const value = delta(product,date);
    $('#cell-amount').value = value === null ? '' : (value/100).toFixed(2);
    $('#cell-error').textContent = '';
    $('#cell-dialog').showModal();
    $('#cell-amount').focus();
    $('#cell-amount').select();
  }
  $('#ledger').ondblclick = openCellEditor;
  $('#ledger').onkeydown = event => {
    if (event.key === 'Enter' && event.target.closest('[data-edit-date]')) {
      event.preventDefault(); openCellEditor(event);
    }
  };
  const closeCellEditor = () => { editingCell = null; $('#cell-dialog').close(); };
  $('#cancel-cell').onclick = closeCellEditor;
  $('#close-cell').onclick = closeCellEditor;
  $('#cell-dialog').oncancel = () => { editingCell = null; };
  $('#cell-form').onsubmit = event => {
    event.preventDefault();
    if (!editingCell) return;
    const {date,id} = editingCell;
    if (!data.products.some(p => p.id === id)) {
      $('#cell-error').textContent = '该产品已删除，请关闭后重新选择'; return;
    }
    const input = $('#cell-amount'), value = Number(input.value);
    if (!input.value.trim() || !validAmount(value, 2e9)) {
      $('#cell-error').textContent = '请输入有效的剩余收益，最多两位小数'; return;
    }
    const next = structuredClone(data);
    next.records[date] = {...next.records[date], [id]:(cents(value)+withdrawnAt(data.products.find(p=>p.id===id),date))/100};
    try { if (commit(validate(next))) {
      month = date.slice(0,7); render(); closeCellEditor(); notify('剩余收益已更新');
    } } catch(error) { $('#cell-error').textContent=error.message; }
  };
  $('#clear-all').onclick = () => {
    if (!confirm('清空全部产品、所有收益记录、本息变动、持仓明细、大金库和规划设置及本浏览器旧版账本？可从自动备份恢复，备份仍保留在本浏览器。')) return;
    const wasBroken=storageBroken; storageBroken=false;
    if (!commit({version:9,vault:emptyVault(),products:[],records:{},principalChanges:{},incomeWithdrawals:{},lots:[],planning:{salary:0,expenses:0,reserve:0,cash:0,target:0}})) { storageBroken=wasBroken; return; }
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
  function openPrincipalChanges(date) {
    if (!data.products.length) { $('#manage').click(); notify('请先添加理财产品，再记录本息变动'); return; }
    $('#principal-change-date').value = date; renderPrincipalChangeFields(); $('#principal-change-dialog').showModal();
  }
  $('#principal-changes').onclick = () => openPrincipalChanges(localDate());
  $('#ledger').onclick = event => {
    const button = event.target.closest('[data-principal-date]');
    if (button) openPrincipalChanges(button.dataset.principalDate);
  };
  function renderPrincipalChangeFields() {
    const date = $('#principal-change-date').value;
    $('#principal-change-fields').innerHTML = data.products.map(p => {
      const value = data.principalChanges && data.principalChanges[date] ? data.principalChanges[date][p.id] : undefined;
      const withdrawal = data.incomeWithdrawals[date]?.[p.id];
      return `<fieldset class="capital-change-product"><legend>${esc(p.name)}</legend><p class="hint">变动前本金 ${money(principalAt(p,date)-(principalChange(p,date) ?? 0))} 元 · 可取收益 ${money(Math.max(0,remainingAt(p,date)+cents(withdrawal||0)))} 元</p><div class="capital-change-inputs"><label>本金变动（元）<input aria-label="${esc(p.name)} 本金变动" data-principal-product="${p.id}" type="number" min="-1000000000" max="1000000000" step="0.01" inputmode="decimal" placeholder="追加 + / 取出 −" value="${value === undefined ? '' : Number(value).toFixed(2)}"></label><label>取出收益（元）<input aria-label="${esc(p.name)} 取出收益" data-income-withdrawal="${p.id}" type="number" min="0" max="1000000000" step="0.01" inputmode="decimal" placeholder="填正数，留空不取出" value="${withdrawal === undefined ? '' : withdrawal.toFixed(2)}"></label></div></fieldset>`;
    }).join('');
    $('#principal-change-error').textContent = '';
  }
  $('#principal-change-date').onchange = renderPrincipalChangeFields;
  $('#close-principal-change').onclick = () => $('#principal-change-dialog').close();
  $('#cancel-principal-change').onclick = () => $('#principal-change-dialog').close();
  $('#principal-change-form').onsubmit = event => {
    event.preventDefault();
    const date = $('#principal-change-date').value;
    if (!validDate(date)) { $('#principal-change-error').textContent = '请选择有效日期'; return; }
    const row = {};
    for (const input of document.querySelectorAll('[data-principal-product]')) {
      if (!input.value.trim()) continue;
      const value = Number(input.value);
      if (!validAmount(value, 1e9)) { $('#principal-change-error').textContent = '请输入有效金额，最多两位小数'; return; }
      if (value !== 0) row[input.dataset.principalProduct] = value;
    }
    const withdrawals = {};
    for (const input of document.querySelectorAll('[data-income-withdrawal]')) {
      if (!input.value.trim()) continue;
      const value = Number(input.value);
      if (!validAmount(value) || value < 0) { $('#principal-change-error').textContent = '取出收益请输入非负金额，最多两位小数'; return; }
      if (value !== 0) withdrawals[input.dataset.incomeWithdrawal] = value;
    }
    const next = structuredClone(data);
    if (Object.keys(withdrawals).length) next.incomeWithdrawals[date] = withdrawals;
    else delete next.incomeWithdrawals[date];
    if (Object.keys(row).length) next.principalChanges[date] = row;
    else delete next.principalChanges[date];
    try {
      const checked = validate(next);
      if (commit(checked)) { month = date.slice(0,7); render(); $('#principal-change-dialog').close(); notify('本息变动已保存'); }
    } catch (error) { $('#principal-change-error').textContent = error.message; }
  };
  function renderProducts() {
    $('#product-rows').innerHTML = draft.map(p => `<div class="product-row" data-id="${p.id}"><input aria-label="产品名称" maxlength="60" required value="${esc(p.name)}"><input aria-label="期初本金" type="number" min="0" max="1000000000" step="0.01" required value="${p.principal}"><input aria-label="期初收益" type="number" min="-1000000000" max="1000000000" step="0.01" required value="${p.baseline}"><button type="button" data-remove="${p.id}" title="删除产品" aria-label="删除${esc(p.name)}">×</button></div>`).join('');
  }
  function readDraft() { draft = [...document.querySelectorAll('.product-row')].map(row => { const inputs = row.querySelectorAll('input'); return {id:row.dataset.id,name:inputs[0].value,principal:Number(inputs[1].value),baseline:Number(inputs[2].value)}; }); }
  $('#manage').onclick = () => {draft=structuredClone(data.products);$('#product-error').textContent='';renderProducts();$('#products-dialog').showModal();};
  $('#close-dialog').onclick = () => $('#products-dialog').close();
  $('#add-product').onclick = () => {readDraft();if(draft.length>=100)return;draft.push({id:uid(),name:'',principal:0,baseline:0});renderProducts();$('#product-rows').lastElementChild.querySelector('input').focus();};
  $('#product-rows').onclick = event => {const id=event.target.dataset.remove;if(!id)return;readDraft();draft=draft.filter(p=>p.id!==id);renderProducts();};
  $('#product-form').onsubmit = event => {
    event.preventDefault();readDraft(); const removed=data.products.filter(p=>!draft.some(d=>d.id===p.id));
    if (removed.some(p=>data.lots.some(l=>l.productId===p.id) || [...Object.values(data.records),...Object.values(data.principalChanges),...Object.values(data.incomeWithdrawals)].some(row=>Object.hasOwn(row,p.id))) && !confirm('保存后将删除已移除产品的全部收益记录、本息变动和持仓明细。建议先导出备份。确定继续？'))return;
    const next=structuredClone(data);next.products=draft;next.lots=next.lots.filter(l=>draft.some(p=>p.id===l.productId));for(const row of Object.values(next.records))for(const p of removed)delete row[p.id];
    for(const row of [...Object.values(next.principalChanges),...Object.values(next.incomeWithdrawals)])for(const p of removed)delete row[p.id];
    try {const clean=validate(next);if(commit(clean)){$('#products-dialog').close();render();notify('产品设置已保存');}}catch(error){$('#product-error').textContent=error.message;}
  };
  function download(content,type,name) { const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
  $('#backup').onclick = () => download(storageBroken ? (localStorage.getItem(KEY) || '{}') : JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2),'application/json',`收益记录备份-${localDate()}.json`);
  $('#recalculate').onclick = () => {
    const latest = load();
    if (storageBroken) { notify('本地数据读取失败，请先导出原始数据或恢复备份'); return; }
    data = latest;
    autoBackup();
    render();
    notify('已按最新保存记录重新计算涨幅及汇总。每行合计仅包含当天已填写的剩余收益，空白不计入。');
  };
  let displayedHistory = [];
  $('#history').onclick = () => {
    try {
      autoBackup();
      displayedHistory = readHistory().reverse();
      $('#history-select').innerHTML = displayedHistory.map((e,i)=>`<option value="${i}">${esc(e.at.replace('T',' ').replace('Z',' UTC'))} · ${e.kind==='daily'?'每日首次快照':'修改前快照'}</option>`).join('');
      $('#history-select').value = displayedHistory.length ? '0' : '';
      $('#history-restore').disabled = $('#history-export').disabled = !displayedHistory.length;
      $('#history-dialog').showModal();
    } catch(error) { notify(error.message); }
  };
  $('#close-history').onclick = () => $('#history-dialog').close();
  $('#history-export').onclick = () => {
    const entry = displayedHistory[Number($('#history-select').value)];
    if (entry) download(entry.raw,'application/json',`账本快照-${entry.day}-${entry.id}.json`);
  };
  $('#history-restore').onclick = () => {
    const entry = displayedHistory[Number($('#history-select').value)];
    if (!entry) return;
    try {
      const next = validate(JSON.parse(entry.raw));
      if (!confirm('恢复此快照将替换整个账本。当前版本会先备份，恢复后可在修改前快照中找回。继续？')) return;
      const wasBroken = storageBroken; storageBroken = false;
      if (commit(next)) { render(); $('#history-dialog').close(); notify('已恢复快照并重新计算'); }
      else storageBroken = wasBroken;
    } catch(error) { notify('无法恢复：'+error.message); }
  };
  $('#restore').onclick = () => $('#import-file').click();
  $('#import-file').onchange = async event => {
    const file=event.target.files?.[0];if(!file)return;
    try {if(file.size>10*1024*1024)throw Error('备份文件不能超过 10MB');const imported=validate(JSON.parse(await file.text()));
      if(!confirm('导入将替换当前账本的全部产品、记录和大金库数据，建议先导出备份。确定导入？'))return;
      const wasBroken=storageBroken;storageBroken=false;
      if(commit(imported)){render();notify('备份已恢复');}else storageBroken=wasBroken;
    }catch(error){notify(`无法导入：${error.message}`);}finally{event.target.value='';}
  };
  $('#csv').onclick = () => {
    const cell = value => {const str=String(value);return '"'+(/^[=+\-@\t\r]/.test(str)&&typeof value==='string'?"'":'')+str.replace(/"/g,'""')+'"';};
    const rows=[['日期',...data.products.flatMap(p=>[`${p.name} 本金变动`,`${p.name} 剩余收益`,`${p.name} 涨幅（元）`]),'已填收益合计','当日增减',...data.products.map(p=>`${p.name} 取出收益`)]];
    for(const date of monthDates()){const has=Object.keys(data.records[date]||{}).length;rows.push([date,...data.products.flatMap(p=>[principalChange(p,date)===null?'':principalChange(p,date)/100,delta(p,date)===null?'':delta(p,date)/100,changeFromYesterday(p,date)===null?'':changeFromYesterday(p,date)/100]),has?recordedTotal(date)/100:'',daily(date)===null?'':daily(date)/100,...data.products.map(p=>data.incomeWithdrawals[date]?.[p.id]??'')]);}
    const days=monthDates();rows.push(['本月收益',...data.products.flatMap(p=>['',days.reduce((sum,date)=>sum+(changeFromYesterday(p,date)??0),0)/100,'']),'',days.map(d=>daily(d)).filter(v=>v!==null).reduce((s,v)=>s+v,0)/100,...data.products.map(()=>'')]);
    download('\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8',`收益记录-${month}.csv`);
  };
  function vaultIcon(i) {
    if(i.icon==='wechat') return '<svg class="vault-icon" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#07b75b"/><path fill="white" d="M14 6c-6 0-10 3.5-10 8 0 2.4 1.3 4.5 3.5 6L6.5 23l4-1.8 2 .5c-.5-1-.7-2-.7-3 0-4.6 4.2-8.2 9.7-8.2h.6C20.5 7.8 17.5 6 14 6Z"/><path fill="white" d="M22 12c-4.8 0-8 2.9-8 6.5s3.2 6.5 8 6.5l2.5-.4 3 1.4-.7-2.5c1.8-1.2 2.7-3 2.7-5 0-3.6-3-6.5-7.5-6.5Z"/><g fill="#07b75b"><circle cx="10" cy="12" r="1.2"/><circle cx="17" cy="12" r="1.2"/><circle cx="19" cy="17" r="1"/><circle cx="25" cy="17" r="1"/></g></svg>';
    const symbols = {alipay:'支',wechat:'●●',fund:'⌂',cash:'¥',other:'▦'};
    return symbols[i.icon] ? `<span class="vault-icon vault-icon-${i.icon}" aria-hidden="true">${symbols[i.icon]}</span>` : `<img class="vault-icon" src="assets/banks/${i.icon}.svg" alt="">`;
  }
  function renderVault() {
    const year = month.slice(0,4), {institutions,balances} = data.vault;
    $('#vault-year').value=year;
    let previousTotal=null;
    $('#vault-table').innerHTML=`<thead><tr><th scope="col">日期</th>${institutions.map(i=>`<th scope="col"><span class="vault-bank">${vaultIcon(i)}${esc(i.name)}</span></th>`).join('')}<th scope="col" class="vault-total">总计（元）</th><th scope="col" class="vault-change">涨幅（元）</th></tr></thead><tbody>${Array.from({length:12},(_,n)=>{
      const m=year+'-'+String(n+1).padStart(2,'0');
      const date=m+'-01';
        const row=balances[date]||{}, values=Object.values(row), total=values.reduce((sum,v)=>sum+cents(v),0);
        const change=values.length && previousTotal!==null ? total-previousTotal : null;
        previousTotal=values.length ? total : null;
        return `<tr class="vault-month-start"><th scope="row">${n+1} 月 月初 · 1 日<button type="button" class="vault-clear-row" data-vault-clear="${date}" aria-label="清除 ${date} 所有机构余额" ${values.length?'':'disabled'}>清除整行</button></th>${institutions.map(i=>`<td><button class="vault-cell" data-vault-date="${date}" data-vault-id="${i.id}" aria-label="${date} ${esc(i.name)} 余额，点击编辑">${Object.hasOwn(row,i.id)?money(cents(row[i.id])):'—'}</button></td>`).join('')}<td class="vault-total">${values.length?money(total):'—'}${values.length && values.length<institutions.length?'<small>部分已录入</small>':''}</td><td class="vault-change ${change===null?'':color(change)}">${change===null?'—':(change>0?'+':'')+money(change)}</td></tr>`;
    }).join('')}</tbody>`;
  }
  $('#vault-year').onchange=()=>{const y=Number($('#vault-year').value);if(Number.isInteger(y)&&y>=1900&&y<=9999){month=y+'-'+month.slice(5);render();}else $('#vault-year').value=month.slice(0,4);};
  $('#vault-prev').onclick=()=>{if(Number(month.slice(0,4))>1900){month=(Number(month.slice(0,4))-1)+'-'+month.slice(5);render();}};
  $('#vault-next').onclick=()=>{if(Number(month.slice(0,4))<9999){month=(Number(month.slice(0,4))+1)+'-'+month.slice(5);render();}};
  $('#vault-backup').onclick=()=>$('#backup').onclick();
  $('#vault-restore').onclick=()=>$('#restore').onclick();
  let vaultCell=null;
  $('#vault-table').onclick=event=>{
    const clear=event.target.closest('[data-vault-clear]');
    if(clear?.dataset.vaultClear){
      const date=clear.dataset.vaultClear;
      if(!Object.keys(data.vault.balances[date]||{}).length)return;
      if(!confirm(`清除 ${date} 这一行所有机构的资产余额？其他日期不受影响，可从自动备份恢复，备份仍保留在本浏览器。`))return;
      const next=structuredClone(data);
      delete next.vault.balances[date];
      if(commit(next)){render();notify(`${date} 整行余额已清除`);}
      return;
    }
    const button=event.target.closest('[data-vault-id]');if(!button)return;
    vaultCell={date:button.dataset.vaultDate,id:button.dataset.vaultId};
    const institution=data.vault.institutions.find(i=>i.id===vaultCell.id);
    $('#vault-cell-title').textContent=`${vaultCell.date} · ${institution.name}`;
    $('#vault-amount').value=data.vault.balances[vaultCell.date]?.[vaultCell.id]??'';
    $('#vault-error').textContent='';$('#vault-cell-dialog').showModal();$('#vault-amount').focus();
  };
  $('#vault-cell-cancel').onclick=()=>$('#vault-cell-dialog').close();
  $('#vault-cell-form').onsubmit=event=>{
    event.preventDefault();if(!vaultCell)return;
    const raw=$('#vault-amount').value.trim(),value=Number(raw),next=structuredClone(data);
    if(raw && (!validAmount(value)||value<0)){$('#vault-error').textContent='请输入非负金额，最多两位小数';return;}
    if(!next.vault.institutions.some(i=>i.id===vaultCell.id)){$('#vault-error').textContent='该机构已不存在，请关闭后重试';return;}
    const row=next.vault.balances[vaultCell.date]||{};
    if(raw)row[vaultCell.id]=value;else delete row[vaultCell.id];
    if(Object.keys(row).length)next.vault.balances[vaultCell.date]=row;else delete next.vault.balances[vaultCell.date];
    if(commit(next)){render();$('#vault-cell-dialog').close();notify('资产余额已保存');}
  };
  $('#add-institution').onclick=()=>{
    $('#institution-name').value='';$('#institution-error').textContent='';
    $('#institution-icon').innerHTML=Object.entries(vaultIcons).map(([key,name])=>`<option value="${key}">${name}</option>`).join('');
    $('#institution-icon').value='other';$('#institution-dialog').showModal();
  };
  $('#institution-cancel').onclick=()=>$('#institution-dialog').close();
  $('#institution-form').onsubmit=event=>{
    event.preventDefault();const name=$('#institution-name').value.trim(),next=structuredClone(data);
    if(next.vault.institutions.some(i=>i.name===name)){$('#institution-error').textContent='已存在同名机构';return;}
    next.vault.institutions.push({id:uid(),name,icon:$('#institution-icon').value});
    try{const clean=validate(next);if(commit(clean)){render();$('#institution-dialog').close();notify('资产机构已添加');}}catch(error){$('#institution-error').textContent=error.message;}
  };
  // Lots describe existing positions; recording them never books a second purchase.
  let editingLot = null, selectedMaturity = '';
  const monthOffset = (start,n) => {
    const date = new Date(`${start}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth()+n);
    return date.toISOString().slice(0,7);
  };
  function assetMonths() {
    const today=localDate(), start=today.slice(0,7), count=Number($('#asset-horizon').value)||18;
    return Array.from({length:count},(_,i)=>{
      const key=monthOffset(start,i), lots=data.lots.filter(l=>l.status==='holding' && l.buyDate<=today && l.maturityDate>=today && l.maturityDate.startsWith(key));
      const principal=lots.reduce((s,l)=>s+cents(l.amount),0);
      return {key,lots,principal,gap:Math.max(0,cents(data.planning.target)-principal)};
    });
  }
  function renderAssets() {
    const today=localDate(), months=assetMonths(), active=data.lots.filter(l=>l.status==='holding' && l.buyDate<=today);
    const total=active.reduce((s,l)=>s+cents(l.amount),0), fixed=months.reduce((s,m)=>s+m.principal,0);
    const overdue=active.filter(l=>l.maturityDate && l.maturityDate<today), undated=active.filter(l=>!l.maturityDate);
    $('#asset-summary').innerHTML=[['已登记持仓本金',money(total)+' 元'],['窗口内待到期本金',money(fixed)+' 元'],['无到期月份',months.filter(m=>!m.principal).length+' 个月'],['最大单月集中度',fixed?Math.round(Math.max(...months.map(m=>m.principal))/fixed*100)+'%':'—']].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('');
    $('#asset-alert').textContent = `${today} 更新 · 当前月仅统计今天及之后的到期。${overdue.length?` ${overdue.length} 笔已到期未确认到账，请核实后编辑状态。`:''}${undated.length?` ${undated.length} 笔活期 / 未定到期日，未计入月份分布。`:''}${data.lots.some(l=>l.status==='holding' && l.buyDate>today)?' 未来买入记录不计入当前持仓。':''}`;
    const years=[...new Set(months.map(m=>m.key.slice(0,4)))];
    const year=years.includes($('#maturity-year').value)?$('#maturity-year').value:years[0];
    $('#maturity-year').innerHTML=years.map(y=>`<option value="${y}">${y} 年</option>`).join('');
    $('#maturity-year').value=year;
    const visibleMonths=months.filter(m=>m.key.startsWith(year));
    const max=Math.max(cents(data.planning.target),...months.map(m=>m.principal),1);
    if (!visibleMonths.some(m=>m.key===selectedMaturity)) selectedMaturity=(visibleMonths.find(m=>m.gap>0 || !m.principal)||visibleMonths[0]).key;
    const column = m=>`<button class="maturity-column ${!m.principal?'empty-month':''} ${selectedMaturity===m.key?'selected':''}" data-maturity="${m.key}" aria-pressed="${selectedMaturity===m.key}" aria-label="${m.key} 到期本金 ${money(m.principal)} 元，缺口 ${money(m.gap)} 元"><span class="maturity-value">${m.principal?money(m.principal/10000)+' 万':'无到期'}</span><span class="maturity-track"><span class="maturity-bar" style="height:${m.principal/max*100}%"></span>${data.planning.target>0?`<span class="maturity-target" style="bottom:${cents(data.planning.target)/max*100}%"></span>`:''}</span><strong>${m.key.slice(2).replace('-',' / ')}</strong><small>${m.gap?'缺 '+money(m.gap/10000)+' 万':m.principal?'已覆盖':'待安排'}</small></button>`;
    $('#maturity-chart').innerHTML=`<section class="maturity-year"><div class="maturity-year-months">${visibleMonths.map(column).join('')}</div></section>`;
    const selected=months.find(m=>m.key===selectedMaturity);
    $('#maturity-detail').innerHTML=`<h3>${selected.key} · 到期明细</h3><p>本金 ${money(selected.principal)} 元${data.planning.target>0?` · 距月目标还差 ${money(selected.gap)} 元`:''}</p>${selected.lots.length?`<ul>${selected.lots.map(l=>`<li>${esc(data.products.find(p=>p.id===l.productId).name)} · ${l.maturityDate} · 本金 ${money(cents(l.amount))} 元${l.expected!==null?` · 预计本息 ${money(cents(l.expected))} 元`:''}</li>`).join('')}</ul>`:'<p>本月尚无已登记产品到期。</p>'}`;
    $('#asset-lots').innerHTML=data.lots.length?`<table><thead><tr><th>产品 / 批次</th><th>买入日</th><th>本金（元）</th><th>到期日</th><th>预计本息（元）</th><th>状态</th><th>操作</th></tr></thead><tbody>${[...data.lots].sort((a,b)=>(a.maturityDate||'9999').localeCompare(b.maturityDate||'9999')).map(l=>`<tr><th>${esc(data.products.find(p=>p.id===l.productId).name)}</th><td>${l.buyDate}</td><td>${money(cents(l.amount))}</td><td>${l.maturityDate||'活期 / 未定'}</td><td>${l.expected===null?'未填写':money(cents(l.expected))}</td><td>${l.status==='received'?'已到账':l.buyDate>today?'未来买入':l.maturityDate && l.maturityDate<today?'到期待核实':'持有中'}</td><td><button data-edit-lot="${l.id}">编辑</button> <button data-delete-lot="${l.id}">删除</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state"><h3>把每一笔钱的到期日排清楚</h3><p>先添加产品，再登记买入批次；同一产品可有多笔持仓。现有本金和收益不会被重复记账。</p></div>';
  }
  $('#maturity-year').onchange=renderAssets;
  $('#asset-horizon').onchange=renderAssets;
  $('#maturity-chart').onclick=event=>{const button=event.target.closest('[data-maturity]');if(button){selectedMaturity=button.dataset.maturity;renderAssets();}};
  function openLot(id=null) {
    if(!data.products.length){$('#manage').click();notify('请先添加理财产品');return;}
    editingLot=id;const l=data.lots.find(l=>l.id===id);
    $('#lot-product').innerHTML=data.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
    $('#lot-product').value=l?.productId||data.products[0].id;
    $('#lot-buy').value=l?.buyDate||localDate();$('#lot-maturity').value=l?.maturityDate||'';
    $('#lot-amount').value=l?.amount??'';$('#lot-expected').value=l?.expected??'';$('#lot-status').value=l?.status||'holding';
    $('#lot-error').textContent='';$('#lot-dialog').showModal();
  }
  $('#add-lot').onclick=()=>openLot();
  $('#close-lot').onclick=()=>$('#lot-dialog').close();
  $('#lot-form').onsubmit=event=>{
    event.preventDefault();const next=structuredClone(data);
    if(editingLot && !next.lots.some(l=>l.id===editingLot)){$('#lot-error').textContent='该持仓已被删除，请关闭后重试';return;}
    const lot={id:editingLot||uid(),productId:$('#lot-product').value,buyDate:$('#lot-buy').value,maturityDate:$('#lot-maturity').value,amount:Number($('#lot-amount').value),expected:$('#lot-expected').value.trim()===''?null:Number($('#lot-expected').value),status:$('#lot-status').value};
    next.lots=next.lots.filter(l=>l.id!==lot.id);next.lots.push(lot);
    try{if(commit(validate(next))){$('#lot-dialog').close();render();notify('持仓已保存，本金与收益记录未重复记账');}}catch(error){$('#lot-error').textContent=error.message;}
  };
  $('#asset-lots').onclick=event=>{
    const edit=event.target.closest('[data-edit-lot]'), del=event.target.closest('[data-delete-lot]');
    if(edit)openLot(edit.dataset.editLot);
    if(del && confirm('删除这笔持仓明细？不会删除产品，也不会修改本金和收益记录。')){const next=structuredClone(data);next.lots=next.lots.filter(l=>l.id!==del.dataset.deleteLot);if(commit(next))render();}
  };
  try {if(localStorage.getItem('fangcun-ledger-v1')){$('#legacy-backup').hidden=false;$('#legacy-backup').onclick=()=>download(localStorage.getItem('fangcun-ledger-v1'),'application/json',`旧版账本备份-${localDate()}.json`);}}catch{}
  window.addEventListener('storage',event=>{if(event.key===KEY){data=load();render();notify('已同步此浏览器另一窗口的修改');}});
  autoBackup();
  function backupTick() { autoBackup(); setTimeout(backupTick,60000); }
  setTimeout(backupTick,60000);
  window.addEventListener('focus',autoBackup);
  render();
  if (location.hash === '#trends') switchPage('trends');
  if (location.hash === '#vault') switchPage('vault');
  if (location.hash === '#assets') switchPage('assets');
  if (location.hash === '#butler') switchPage('butler');
  // A reset link is explicit user intent; ordinary visits never clear saved records.
  if (new URLSearchParams(location.search).get('reset') === '1') {
    history.replaceState(null,'',location.pathname + location.hash);
    $('#clear-all').click();
  }
  if(storageBroken){$('#save-status').textContent='本地数据读取失败';notify('原始数据已保留，请先导出备份再检查存储。');}
  if('serviceWorker' in navigator && location.protocol !== 'file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
