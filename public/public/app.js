const socket=io();let state=null;let myId=null;const $=id=>document.getElementById(id);const screens=['home','lobby','game','finished'];
function show(id){screens.forEach(x=>$(x).classList.toggle('active',x===id));}
socket.on('connect',()=>{myId=socket.id;$('connection').textContent='● CONNECTED';$('connection').classList.add('ok')});
socket.on('disconnect',()=>{$('connection').textContent='● OFFLINE';$('connection').classList.remove('ok')});
socket.on('errorMessage',m=>$('error').textContent=m);
$('create').onclick=()=>socket.emit('create',{name:$('name').value});$('join').onclick=()=>socket.emit('join',{name:$('name').value,code:$('code').value});$('code').oninput=e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
socket.on('created',code=>{history.replaceState({},'',`?room=${code}`)});
$('copy').onclick=async()=>{await navigator.clipboard.writeText(location.href);$('copy').textContent='Copied ✓';setTimeout(()=>$('copy').textContent='Copy link',1500)};
$('start').onclick=()=>socket.emit('start');$('again').onclick=()=>socket.emit('rematch');$('back').onclick=()=>location.href=location.pathname;
function render(s){state=s;$('roomCode').textContent=s.code;$('count').textContent=`${s.players.length}/8`;$('players').innerHTML=s.players.map((p,i)=>`<div class="player"><span class="dot" style="background:${p.color}"></span><span>${esc(p.name)}${p.id===s.host?' 👑':''}</span><small>${p.score}</small></div>`).join('');$('start').disabled=!(s.players.length>=2 && s.phase==='lobby' && s.host===myId);$('startHint').textContent=s.host===myId?(s.players.length<2?'Need at least 2 players.':'Everyone ready? Start the game.'):'Waiting for the host to start…';
 if(s.phase==='lobby'){show('lobby');return} if(s.phase==='finished'){finish(s);return} show('game');$('round').textContent=`${Math.min(s.round,s.totalRounds)}/${s.totalRounds}`;renderScores(s); if(s.phase==='countdown'){ $('target').classList.add('hidden'); $('status').textContent='Get ready…'; tick(s.roundStartedAt); } else if(s.phase==='playing'){ $('status').textContent='TAP THE TARGET!'; $('countdown').textContent=''; $('target').classList.remove('hidden'); $('target').style.left=`${20+Math.random()*60}%`;$('target').style.top=`${20+Math.random()*55}%`; $('message').textContent='First click gets the most points'; }}
function tick(until){let n=Math.max(0,Math.ceil((until-Date.now())/1000));$('countdown').textContent=n||'';if(n)setTimeout(()=>tick(until),100);}
$('target').onclick=()=>{socket.emit('hit');$('target').classList.add('hidden');$('message').textContent='Locked in! Waiting for the others…'};
socket.on('hitResult',r=>{$('message').textContent=`+${r.points} points • ${r.elapsed}ms • #${r.rank}`});socket.on('roundResult',()=>{});
function renderScores(s){$('scoreboard').innerHTML=s.players.sort((a,b)=>b.score-a.score).map(p=>`<div class="score ${p.id===myId?'me':''}">${esc(p.name)} <b>${p.score}</b></div>`).join('')}
function finish(s){show('finished');let sorted=[...s.players].sort((a,b)=>b.score-a.score);$('winner').textContent=`🏆 ${sorted[0]?.name||'Winner'} wins!`;$('finalScores').innerHTML=sorted.map((p,i)=>`<div class="final"><span>${i+1}. ${esc(p.name)}</span><b>${p.score}</b></div>`).join('');}
function esc(x){return String(x).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
socket.on('state',render);
const params=new URLSearchParams(location.search);if(params.get('room')){$('code').value=params.get('room').toUpperCase();}
