(() => {
  const $=s=>document.querySelector(s), panel=$('#sprite-chat'), toggle=$('#sprite-toggle'), log=$('#chat-log'), input=$('#chat-input');
  let messages=[],busy=false,apiKey='',testing=false;
  const keyDialog=$('#key-dialog'),keyInput=$('#deepseek-key'),keyState=$('#key-state');
  function validKey(value){return /^[\x21-\x7e]{8,512}$/.test(value);}
  function requireSecure(){
    if(location.protocol!=='https:' && !['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('请通过 HTTPS 打开页面后填写密钥。');
  }
  async function request(messages,key){
    requireSecure();
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,...(key?{apiKey:key}:{})}),signal:AbortSignal.timeout(50000)});
    let result;try{result=await response.json();}catch{throw Error('当前页面尚未部署 AI 接口，填写密钥后仍需配置服务器。');}
    if(!response.ok)throw Error(result.error||'暂时连接不上，请稍后再试');
    if(typeof result.reply!=='string')throw Error('回复格式不正确，请重试');
    return result;
  }
  $('#chat-settings').onclick=()=>{keyInput.value='';keyState.textContent=apiKey?'本次页面已配置密钥；填写新密钥可替换。':'尚未填写，将使用服务器默认配置（如有）。';keyDialog.showModal();};
  $('#key-close').onclick=()=>keyDialog.close();
  keyDialog.addEventListener('close',()=>{keyInput.value='';});
  $('#key-form').onsubmit=e=>{
    e.preventDefault();if(testing)return;
    try{requireSecure();const value=keyInput.value.trim();if(!validKey(value))throw Error('请填写有效的 API Key');apiKey=value;keyInput.value='';keyDialog.close();$('#chat-status').textContent='已应用密钥，仅在本次页面有效。';}catch(error){keyState.textContent=error.message;}
  };
  $('#key-clear').onclick=()=>{if(testing)return;apiKey='';keyInput.value='';keyState.textContent='已清除页面密钥，将使用服务器默认配置（如有）。';};
  $('#key-test').onclick=async()=>{
    if(testing)return;
    const value=keyInput.value.trim()||apiKey;if(!validKey(value)){keyState.textContent='请先填写 API Key';return;}
    testing=true;$('#key-test').disabled=true;$('#key-clear').disabled=true;keyState.textContent='正在测试连接…';
    try{await request([{role:'user',content:'请回复：连接成功'}],value);keyState.textContent='连接成功！点击「应用到本次页面」后用于聊天。';}catch(error){keyState.textContent=error.name==='TimeoutError'?'测试超时，请重试。':error.message;}
    finally{testing=false;$('#key-test').disabled=false;$('#key-clear').disabled=false;}
  };
  function bubble(role,text){const div=document.createElement('div');div.className=`chat-bubble ${role}`;div.textContent=text;log.append(div);log.scrollTop=log.scrollHeight;return div;}
  function open(show){panel.hidden=!show;toggle.setAttribute('aria-expanded',String(show));if(show)input.focus();else toggle.focus();}
  toggle.onclick=()=>open(panel.hidden);$('#chat-close').onclick=()=>open(false);
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')open(false);});
  $('#chat-clear').onclick=()=>{if(busy)return;messages=[];log.replaceChildren();bubble('assistant','你好呀，我是芽芽 🌱 今天也一起把小日子记清楚吧！');};
  $('#chat-form').onsubmit=async e=>{
    e.preventDefault();const text=input.value.trim();if(!text||busy)return;
    if(text.length>4000){$('#chat-status').textContent='每条消息最多 4000 字';return;}
    busy=true;$('#chat-send').disabled=true;$('#chat-clear').disabled=true;
    bubble('user',text);input.value='';$('#chat-status').textContent='芽芽正在想一想…';
    const next=[...messages.slice(-18),{role:'user',content:text}];
    try{
      const result=await request(next,apiKey);
      messages=[...next,{role:'assistant',content:result.reply}];bubble('assistant',result.reply);$('#chat-status').textContent='';
    }catch(error){$('#chat-status').textContent=error.name==='TimeoutError'?'回复超时，请重试。':error.message;if(!input.value)input.value=text;}
    finally{busy=false;$('#chat-send').disabled=false;$('#chat-clear').disabled=false;}
  };
})();
