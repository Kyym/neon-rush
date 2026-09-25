import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const COLORS = ['#b6ff00','#00e5ff','#ff3d81','#a970ff','#ffb000','#00f59b','#ff5c35','#6c7cff'];
const makeCode = () => { let c; do c = Math.random().toString(36).slice(2, 6).toUpperCase(); while (rooms.has(c)); return c; };
const cleanName = n => String(n || 'Player').trim().slice(0, 16).replace(/[^a-zA-Z0-9 _-]/g,'') || 'Player';
const publicRoom = r => ({code:r.code, phase:r.phase, round:r.round, totalRounds:r.totalRounds, target:r.target, roundStartedAt:r.roundStartedAt, players:[...r.players.values()].map(p=>({id:p.id,name:p.name,score:p.score,color:p.color}))});
function emitRoom(r){ io.to(r.code).emit('state', publicRoom(r)); }
function startRound(r){
  if (r.round > r.totalRounds) { r.phase='finished'; emitRoom(r); return; }
  r.phase='countdown'; r.target=null; r.roundStartedAt=Date.now()+3000; r.clicks=[]; emitRoom(r);
  setTimeout(()=>{
    if (!rooms.has(r.code) || r.phase !== 'countdown') return;
    r.phase='playing'; r.target=Math.floor(Math.random()*8); r.roundStartedAt=Date.now(); emitRoom(r);
  },3000);
}
function nextRound(r){ r.round++; if(r.round > r.totalRounds){r.phase='finished'; emitRoom(r);} else startRound(r); }

io.on('connection', socket => {
  socket.on('create', ({name}) => {
    const code=makeCode(); const room={code,host:socket.id,phase:'lobby',round:0,totalRounds:5,target:null,roundStartedAt:null,clicks:[],players:new Map()};
    room.players.set(socket.id,{id:socket.id,name:cleanName(name),score:0,color:COLORS[0]}); rooms.set(code,room); socket.join(code); socket.data.room=code; emitRoom(room); socket.emit('created',code);
  });
  socket.on('join', ({code,name}) => {
    const r=rooms.get(String(code||'').toUpperCase());
    if(!r) return socket.emit('errorMessage','Room not found. Check the code.');
    if(r.phase!=='lobby') return socket.emit('errorMessage','That game has already started.');
    if(r.players.size>=8) return socket.emit('errorMessage','Room is full.');
    const color=COLORS[r.players.size%COLORS.length]; r.players.set(socket.id,{id:socket.id,name:cleanName(name),score:0,color}); socket.join(r.code); socket.data.room=r.code; emitRoom(r);
  });
  socket.on('start', ()=>{ const r=rooms.get(socket.data.room); if(!r || r.host!==socket.id || r.players.size<2) return; r.round=1; r.players.forEach(p=>p.score=0); startRound(r); });
  socket.on('hit', ()=>{
    const r=rooms.get(socket.data.room); const p=r?.players.get(socket.id);
    if(!r||!p||r.phase!=='playing'||r.clicks.some(x=>x.id===socket.id)) return;
    const elapsed=Math.max(0,Date.now()-r.roundStartedAt); const rank=r.clicks.length; const points=Math.max(100,1000-rank*150-Math.floor(elapsed/10));
    r.clicks.push({id:socket.id,elapsed}); p.score+=points; socket.emit('hitResult',{points,elapsed,rank:rank+1});
    io.to(r.code).emit('roundResult',{id:socket.id,rank:rank+1,points,elapsed});
    if(r.clicks.length===r.players.size){ setTimeout(()=>nextRound(r),1400); }
  });
  socket.on('rematch', ()=>{ const r=rooms.get(socket.data.room); if(!r||r.host!==socket.id) return; r.round=1;r.players.forEach(p=>p.score=0);startRound(r); });
  socket.on('disconnect',()=>{ const code=socket.data.room; const r=rooms.get(code); if(!r)return; r.players.delete(socket.id); if(r.players.size===0){rooms.delete(code);return;} if(r.host===socket.id) r.host=r.players.keys().next().value; if(r.phase==='playing' || r.phase==='countdown') { r.clicks=[]; r.phase='lobby'; r.round=0; } emitRoom(r); });
});

app.get('*', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const PORT=process.env.PORT||3000; server.listen(PORT,()=>console.log(`Neon Rush running on ${PORT}`));
