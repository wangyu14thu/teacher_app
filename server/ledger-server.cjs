// Run with Node.js 22+; credentials stay outside the static web root.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../asset-ledger');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
let pending = 0;
const server = http.createServer(async (req,res) => {
  const json = (status, value) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try {
    const url = new URL(req.url,'http://localhost');
    if (url.pathname === '/api/chat') {
      if (req.method !== 'POST') return json(405,{error:'请使用 POST 请求'});
      const origin=req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return json(403,{error:'不允许跨站请求'});
      if (!req.headers['content-type']?.startsWith('application/json')) return json(415,{error:'请发送 JSON'});
      if (pending>=3) return json(429,{error:'小精灵有点忙，请稍后再试'});
      let body='';
      for await (const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>64000) return json(413,{error:'消息太长，请缩短后重试'});}
      let input;try{input=JSON.parse(body);}catch{return json(400,{error:'消息格式不正确'});}
      if (!input || typeof input !== 'object') return json(400,{error:'消息格式不正确'});
      if (input.apiKey !== undefined && (typeof input.apiKey !== 'string' || !/^[\x21-\x7e]{8,512}$/.test(input.apiKey))) return json(400,{error:'API Key 格式不正确，请检查后重试。'});
      const apiKey=input.apiKey || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) return json(503,{error:'请打开 DeepSeek 设置，填写 API Key。'});
      const messages=input.messages;
      if(!Array.isArray(messages)||!messages.length||messages.length>20||messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>4000)||messages.at(-1).role!=='user') return json(400,{error:'请发送有效消息，每条最多 4000 字'});
      pending++;
      try {
        const upstream=await fetch('https://api.deepseek.com/chat/completions',{
          method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},
          body:JSON.stringify({model:'deepseek-chat',messages:[{role:'system',content:'你是收益记录本里的小精灵「发财芽」，用温柔、简洁的中文帮助用户理解记账和收益。你无法直接读取或修改用户账本，只能根据用户主动提供的内容回答。不要编造账户数据或承诺投资收益。'},...messages],max_tokens:1200}),signal:AbortSignal.timeout(45000)
        });
        if(!upstream.ok) return json(502,{error:upstream.status===401?'DeepSeek 密钥无效，请在设置中更新 API Key。':upstream.status===402?'DeepSeek 账户余额不足，请检查账户。':'DeepSeek 暂时无法响应，请稍后重试。'});
        const result=await upstream.json(),reply=result.choices?.[0]?.message?.content;
        if(typeof reply!=='string'||!reply.trim()) return json(502,{error:'暂时没有收到回复，请重试。'});
        json(200,{reply});
      } catch {json(502,{error:'连接 DeepSeek 超时或失败，请稍后重试。'});} finally{pending--;}
      return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    const relative=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
    if(!file.startsWith(root+path.sep)||relative.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);return res.end();}
    const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);
  }catch{if(!res.headersSent){res.writeHead(404);res.end('Not found');}else res.end();}
});
server.listen(Number(process.env.PORT||4174),'127.0.0.1',()=>console.log('收益记录本：http://127.0.0.1:'+server.address().port));
