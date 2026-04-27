import { useState, useEffect, useCallback } from "react";
import { supabase } from './supabase.js';

// ══ DATA ══════════════════════════════════════════════════
const TODAY = new Date().toISOString().slice(0,10);
const THIS_M = new Date().getMonth(), THIS_Y = new Date().getFullYear();
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_ES = {Mon:'Lun',Tue:'Mar',Wed:'Mié',Thu:'Jue',Fri:'Vie',Sat:'Sáb',Sun:'Dom'};

const SUCS = [
  {id:'su1',name:'Canal Isuto',      lat:-17.7626056,lng:-63.1919837,color:'#BA7517'},
  {id:'su2',name:'Escuadron Velasco',lat:-17.8092143,lng:-63.2040949,color:'#185FA5'},
];
const SHIFTS = [
  {id:'m',label:'Mañana',name:'Turno Mañana',start:'06:00',end:'14:00',startH:6, endH:14,color:'#BA7517',bg:'#FAEEDA'},
  {id:'t',label:'Tarde', name:'Turno Tarde', start:'14:00',end:'22:00',startH:14,endH:22,color:'#185FA5',bg:'#E6F1FB'},
  {id:'n',label:'Noche', name:'Turno Noche', start:'22:00',end:'06:00',startH:22,endH:30,color:'#534AB7',bg:'#EEEDFE'},
];
const RPT_CATS = ['Tardanza','Conducta inapropiada','Accidente','Incumplimiento','Abandono de puesto','Otro'];
const REQ_T = {
  entry_change:'Cambio hora de entrada',schedule_swap:'Cambio horario con driver',
  dayoff_swap:'Cambio de libre con driver',relief:'Relevo de turno',
  sucursal:'Cambio de sucursal',shift_change:'Cambio de turno',complaint:'Queja',
};
const RL = {admin:'Admin',supervisor:'Supervisor',despacho:'Despacho',aux_despacho:'Aux. Despacho',driver:'Driver'};
const SL = {pending:'Pendiente',approved:'Aprobada',rejected:'Rechazada',target_accepted:'Aceptada (pend. sup.)',target_rejected:'Rechazada por driver'};

const BASE_POS = {
  d1:[-17.764,-63.193],d2:[-17.761,-63.190],d3:[-17.763,-63.196],d4:[-17.810,-63.205],
  d5:[-17.765,-63.192],d6:[-17.808,-63.202],d7:[-17.812,-63.207],d8:[-17.809,-63.200],
};

const INIT_USERS = [
  {id:'a1', name:'Carlos Mendez',  role:'admin',        pin:'0000',sucursalId:'su1',shiftId:null},
  {id:'sv1',name:'Ana García',      role:'supervisor',   pin:'1111',sucursalId:'su1',shiftId:'m'},
  {id:'sv2',name:'Roberto Vega',    role:'supervisor',   pin:'1112',sucursalId:'su2',shiftId:'t'},
  {id:'dp1',name:'María López',     role:'despacho',     pin:'2001',sucursalId:'su1',shiftId:'m'},
  {id:'dp2',name:'Juan Ríos',       role:'despacho',     pin:'2002',sucursalId:'su1',shiftId:'t'},
  {id:'dp3',name:'Pablo Cruz',      role:'despacho',     pin:'2003',sucursalId:'su2',shiftId:'n'},
  {id:'ax1',name:'Lucía Flores',    role:'aux_despacho', pin:'3001',sucursalId:'su1',shiftId:'m'},
  {id:'ax2',name:'Diego Mora',      role:'aux_despacho', pin:'3002',sucursalId:'su2',shiftId:'t'},
  {id:'d1', name:'Miguel Torres',  role:'driver',       pin:'1001',sucursalId:'su1',shiftId:'m'},
  {id:'d2', name:'Luis Ramírez',   role:'driver',       pin:'1002',sucursalId:'su1',shiftId:'m'},
  {id:'d3', name:'Jorge Vargas',   role:'driver',       pin:'1003',sucursalId:'su1',shiftId:'t'},
  {id:'d4', name:'Pedro Alvarado', role:'driver',       pin:'1004',sucursalId:'su2',shiftId:'t'},
  {id:'d5', name:'Roberto Solis',  role:'driver',       pin:'1005',sucursalId:'su1',shiftId:'n'},
  {id:'d6', name:'David Herrera',  role:'driver',       pin:'1006',sucursalId:'su2',shiftId:'n'},
  {id:'d7', name:'Carmen Ruiz',    role:'driver',       pin:'1007',sucursalId:'su2',shiftId:'m'},
  {id:'d8', name:'Sofia Mendez',   role:'driver',       pin:'1008',sucursalId:'su2',shiftId:'t'},
];

// ══ STORAGE ════════════════════════════════════════════════
// ══ MAPPERS: Supabase (snake_case) → App (camelCase) ══════
const mapUser =r=>({id:r.id,name:r.name,role:r.role,pin:r.pin,sucursalId:r.sucursal_id,shiftId:r.shift_id});
const mapAtt  =r=>({id:r.id,userId:r.user_id,date:r.date,sucursalId:r.sucursal_id,clockIn:r.clock_in,clockOut:r.clock_out,late:r.late||false,lateMin:r.late_min||0});
const mapReq  =r=>({id:r.id,type:r.type,fromId:r.from_id,toId:r.to_id,supId:r.sup_id,date:r.date,note:r.note,time:r.time,status:r.status,createdAt:r.created_at});
const mapRep  =r=>({id:r.id,reporterId:r.reporter_id,driverId:r.driver_id,cat:r.cat,detail:r.detail,createdAt:r.created_at});
const mapNotif=r=>({id:r.id,userId:r.user_id,msg:r.msg,read:r.read,createdAt:r.created_at});
const mapDO   =r=>({id:r.id,userId:r.user_id,type:r.type,date:r.date,cfg:r.cfg});
const mapNote =r=>({id:r.id,date:r.date,text:r.text,authorId:r.author_id,createdAt:r.created_at});
const mapAlert=r=>({id:r.id,driverId:r.driver_id,date:r.date,createdAt:r.created_at});
const mapLoc  =r=>({userId:r.user_id,lat:r.lat,lng:r.lng,active:r.active,timestamp:r.updated_at});

// ══ UTILS ══════════════════════════════════════════════════
const nowISO = ()=>new Date().toISOString();
const uid    = ()=>`${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
const ini    = n=>n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
const fmtT   = t=>t?new Date(t).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}):'--:--';
const fmtD   = d=>new Date(d+'T12:00:00').toLocaleDateString('es',{day:'2-digit',month:'2-digit'});
const fmtDL  = d=>new Date(d+'T12:00:00').toLocaleDateString('es',{weekday:'short',day:'numeric',month:'short'});
const rnd    = (a,b)=>a+Math.random()*(b-a);

function getMon(d){const dt=new Date(d);const day=dt.getDay();dt.setDate(dt.getDate()-day+(day===0?-6:1));dt.setHours(0,0,0,0);return dt;}
function getWeekDates(mon){return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(d.getDate()+i);return d.toISOString().slice(0,10);});}
function dowOf(ds){const d=new Date(ds+'T12:00:00');return DAYS[d.getDay()===0?6:d.getDay()-1];}

function getRotDayOff(cfg,ds){
  if(!cfg)return null;
  const pool=['Mon','Tue','Wed','Thu','Fri',...(cfg.inclSat?['Sat']:[]),...(cfg.inclSun?['Sun']:[])];
  const si=pool.indexOf(cfg.startDay);if(si<0)return null;
  const sm=getMon(new Date(cfg.startDate+'T12:00:00'));
  const tm=getMon(new Date(ds+'T12:00:00'));
  const wk=Math.round((tm-sm)/(7*864e5));
  return pool[((si+wk)%pool.length+pool.length)%pool.length];
}
function isOff(userId,ds,daysOff){
  const dow=dowOf(ds);
  return daysOff.some(d=>{
    if(d.userId!==userId)return false;
    if(d.type==='single')return d.date===ds;
    if(d.type==='rotating')return getRotDayOff(d.cfg,ds)===dow;
    return false;
  });
}
function calcHours(ci,co){if(!ci||!co)return 0;return Math.round((new Date(co)-new Date(ci))/36000)/100;}
function calcLate(ciISO,shiftId){
  if(!ciISO||!shiftId)return{late:false,min:0};
  const sh=SHIFTS.find(s=>s.id===shiftId);if(!sh)return{late:false,min:0};
  const ci=new Date(ciISO);const[h,m]=sh.start.split(':').map(Number);
  const start=new Date(ci);start.setHours(h,m,0,0);
  const diff=Math.floor((ci-start)/60000);
  return{late:diff>5,min:Math.max(0,diff)};
}
function getMonthStats(userId,attendance){
  const ma=attendance.filter(a=>{
    if(a.userId!==userId)return false;
    const d=new Date(a.date+'T12:00:00');
    return d.getMonth()===THIS_M&&d.getFullYear()===THIS_Y;
  });
  return{
    worked:ma.filter(a=>a.clockIn).length,
    late:ma.filter(a=>a.late).length,
    totalH:parseFloat(ma.filter(a=>a.clockIn&&a.clockOut).reduce((s,a)=>s+calcHours(a.clockIn,a.clockOut),0).toFixed(1)),
  };
}
function exportCSV(attendance,users){
  const hdr='Fecha,Nombre,Rol,Sucursal,Turno,Entrada,Salida,Horas,Tarde\n';
  const rows=attendance.map(a=>{
    const u=users.find(x=>x.id===a.userId);
    const sh=SHIFTS.find(s=>s.id===u?.shiftId);
    const suc=SUCS.find(s=>s.id===a.sucursalId);
    const hrs=a.clockIn&&a.clockOut?calcHours(a.clockIn,a.clockOut).toFixed(1):'-';
    return[a.date,u?.name||'?',RL[u?.role]||'?',suc?.name||'?',sh?.label||'?',
      fmtT(a.clockIn),fmtT(a.clockOut),hrs,a.late?`${a.lateMin}min`:'No'].join(',');
  }).join('\n');
  const blob=new Blob([hdr+rows],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const el=document.createElement('a');el.href=url;el.download=`asistencia_${TODAY}.csv`;el.click();URL.revokeObjectURL(url);
}

// ══ THEME ══════════════════════════════════════════════════
const C={
  bg0:'var(--color-background-tertiary)',bg1:'var(--color-background-secondary)',bg2:'var(--color-background-primary)',
  tx:'var(--color-text-primary)',mt:'var(--color-text-secondary)',ht:'var(--color-text-tertiary)',
  br:'var(--color-border-tertiary)',bm:'var(--color-border-secondary)',
  amber:'#BA7517',amberBg:'#FAEEDA',green:'#3B6D11',greenBg:'#EAF3DE',
  red:'#A32D2D',redBg:'#FCEBEB',blue:'#185FA5',blueBg:'#E6F1FB',
  purple:'#534AB7',purpleBg:'#EEEDFE',gray:'#5F5E5A',grayBg:'#F1EFE8',
};
const PC={
  pending:[C.amberBg,C.amber],approved:[C.greenBg,C.green],rejected:[C.redBg,C.red],
  target_accepted:[C.blueBg,C.blue],target_rejected:[C.redBg,C.red],
  working:[C.greenBg,C.green],done:[C.blueBg,C.blue],absent:[C.redBg,C.red],late:[C.redBg,C.red],
  admin:[C.blueBg,C.blue],supervisor:[C.purpleBg,C.purple],
  despacho:[C.amberBg,C.amber],aux_despacho:[C.greenBg,C.green],driver:[C.grayBg,C.gray],
  m:[C.amberBg,C.amber],t:[C.blueBg,C.blue],n:[C.purpleBg,C.purple],dayoff:[C.grayBg,C.gray],
};

// ══ SHARED COMPONENTS ══════════════════════════════════════
function Pill({s,label}){const[bg,fg]=PC[s]||[C.bg1,C.mt];return <span style={{background:bg,color:fg,border:`0.5px solid ${fg}40`,borderRadius:99,padding:'2px 10px',fontSize:11,fontWeight:500,whiteSpace:'nowrap'}}>{label}</span>;}
function Card({children,onClick,style={}}){return <div onClick={onClick} style={{background:C.bg2,border:`0.5px solid ${C.br}`,borderRadius:12,padding:16,...style,cursor:onClick?'pointer':'default'}}>{children}</div>;}
function Av({name,size=38,color=C.amber}){return <div style={{width:size,height:size,borderRadius:'50%',background:C.amberBg,border:`0.5px solid ${color}50`,display:'flex',alignItems:'center',justifyContent:'center',color,fontSize:size*.36,fontWeight:500,flexShrink:0,fontFamily:'var(--font-mono)'}}>{ini(name)}</div>;}
function Btn({children,onClick,v='outline',disabled,full,size='md',style={}}){
  const vs={primary:{background:C.amber,color:'#fff',border:`1px solid ${C.amber}`},outline:{background:'transparent',color:C.tx,border:`0.5px solid ${C.bm}`},ghost:{background:'transparent',color:C.mt,border:'none'},danger:{background:'transparent',color:C.red,border:`0.5px solid ${C.red}60`},success:{background:C.green,color:'#fff',border:`1px solid ${C.green}`}};
  return <button disabled={disabled} onClick={onClick} style={{...vs[v],padding:size==='sm'?'4px 10px':'9px 18px',fontSize:size==='sm'?12:14,fontWeight:500,borderRadius:8,cursor:disabled?'not-allowed':'pointer',opacity:disabled?.4:1,width:full?'100%':undefined,fontFamily:'var(--font-sans)',...style}}>{children}</button>;
}
function Tabs({items,active,onChange}){return <div style={{display:'flex',gap:2,padding:4,background:C.bg1,borderRadius:10,border:`0.5px solid ${C.br}`,marginBottom:20,overflowX:'auto',flexShrink:0}}>{items.map(t=><button key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,minWidth:'max-content',padding:'6px 11px',borderRadius:8,border:'none',fontSize:12,fontWeight:500,background:active===t.id?C.bg2:'transparent',color:active===t.id?C.tx:C.mt,boxShadow:active===t.id?`0 0 0 0.5px ${C.bm}`:'none',cursor:'pointer',whiteSpace:'nowrap'}}>{t.label}</button>)}</div>;}
function Fld({label,value,onChange,type='text',placeholder,options,rows}){
  const base={width:'100%',padding:'9px 12px',fontSize:14,border:`0.5px solid ${C.bm}`,borderRadius:8,background:C.bg1,color:C.tx,boxSizing:'border-box',fontFamily:'var(--font-sans)',outline:'none'};
  return <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:12,color:C.mt,marginBottom:5,fontWeight:500}}>{label}</div>}
    {rows?<textarea rows={rows} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...base,resize:'vertical'}}/>
    :options?<select value={value} onChange={e=>onChange(e.target.value)} style={base}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
    :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>}
  </div>;
}
function Modal({open,onClose,title,children,width=460}){
  if(!open)return null;
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}} onClick={onClose}>
    <div style={{background:C.bg2,border:`0.5px solid ${C.bm}`,borderRadius:14,padding:24,width,maxWidth:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:18}}>
        <span style={{fontSize:16,fontWeight:500,color:C.tx}}>{title}</span>
        <button onClick={onClose} style={{background:'none',border:'none',color:C.mt,cursor:'pointer',fontSize:20,lineHeight:1}}>x</button>
      </div>{children}
    </div>
  </div>;
}
function Stat({label,value,v='neutral',sub}){
  const m={neutral:[C.bg1,C.tx],amber:[C.amberBg,C.amber],green:[C.greenBg,C.green],red:[C.redBg,C.red],blue:[C.blueBg,C.blue],purple:[C.purpleBg,C.purple],gray:[C.grayBg,C.gray]};
  const[bg,fg]=m[v]||m.neutral;
  return <div style={{background:bg,borderRadius:8,padding:'12px 16px',border:`0.5px solid ${C.br}`}}>
    <div style={{fontSize:12,color:fg,fontWeight:500,marginBottom:4}}>{label}</div>
    <div style={{fontSize:22,fontWeight:500,color:fg}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:fg,opacity:.7,marginTop:2}}>{sub}</div>}
  </div>;
}
function Bell({notifs,userId,onClick}){
  const count=notifs.filter(n=>n.userId===userId&&!n.read).length;
  return <button onClick={onClick} style={{position:'relative',background:'none',border:`0.5px solid ${C.br}`,borderRadius:8,cursor:'pointer',padding:'6px 10px',color:C.mt,fontSize:16,display:'flex',alignItems:'center'}}>
    🔔{count>0&&<span style={{marginLeft:4,background:C.red,color:'#fff',borderRadius:99,fontSize:10,fontWeight:700,padding:'0 5px',minWidth:16,textAlign:'center'}}>{count>9?'9+':count}</span>}
  </button>;
}
function Divider(){return <div style={{height:1,background:C.br,margin:'16px 0'}}/>;}
function Hdr({children,style={}}){return <div style={{fontSize:11,color:C.ht,fontWeight:500,letterSpacing:.5,textTransform:'uppercase',marginBottom:8,...style}}>{children}</div>;}
function Alert({msg}){return <div style={{background:C.redBg,border:`0.5px solid ${C.red}40`,borderRadius:8,padding:'10px 14px',marginBottom:8,display:'flex',gap:10,alignItems:'center'}}><span style={{fontSize:14}}>⚠️</span><span style={{fontSize:13,color:C.red,flex:1}}>{msg}</span></div>;}

function PinModal({open,onClose,user,onSave}){
  const[cur,setCur]=useState('');const[nx,setNx]=useState('');const[cf,setCf]=useState('');const[err,setErr]=useState('');
  function save(){
    if(cur!==user.pin){setErr('PIN actual incorrecto');return;}
    if(nx.length<4){setErr('Mínimo 4 dígitos');return;}
    if(nx!==cf){setErr('Los PINs no coinciden');return;}
    onSave(nx);onClose();setCur('');setNx('');setCf('');setErr('');
  }
  if(!open)return null;
  return <Modal open title="Cambiar PIN" onClose={()=>{onClose();setCur('');setNx('');setCf('');setErr('');}}>
    <Fld label="PIN actual" type="password" value={cur} onChange={setCur} placeholder="••••"/>
    <Fld label="Nuevo PIN" type="password" value={nx} onChange={setNx} placeholder="Min. 4 dígitos"/>
    <Fld label="Confirmar nuevo PIN" type="password" value={cf} onChange={setCf} placeholder="••••"/>
    {err&&<div style={{color:C.red,fontSize:13,marginBottom:12}}>{err}</div>}
    <div style={{display:'flex',gap:10}}>
      <Btn onClick={onClose} v="outline">Cancelar</Btn>
      <Btn onClick={save} v="primary" full disabled={!cur||!nx||!cf}>Guardar PIN</Btn>
    </div>
  </Modal>;
}

// ══ GANTT ══════════════════════════════════════════════════
function GanttView({users,daysOff,attendance,singleUser}){
  const[view,setView]=useState('day');
  const drivers=singleUser?[singleUser]:users.filter(u=>u.role==='driver');
  const mon=getMon(new Date(TODAY+'T12:00:00'));
  const weekDates=getWeekDates(mon);
  const now=new Date();const curH=now.getHours()+now.getMinutes()/60;
  const DAY0=4,DAY1=32,SPAN=DAY1-DAY0;
  const getAtt=(uid,d)=>attendance.find(a=>a.userId===uid&&a.date===d);
  const ticks=[4,6,8,10,12,14,16,18,20,22,0,2,4,6];

  return <div>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
      <span style={{flex:1,fontSize:13,fontWeight:500,color:C.tx}}>
        {view==='week'?`Semana ${fmtD(weekDates[0])} - ${fmtD(weekDates[6])}`:new Date(TODAY+'T12:00:00').toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'})}
      </span>
      <Btn v={view==='day'?'primary':'outline'} size='sm' onClick={()=>setView('day')}>Dia</Btn>
      <Btn v={view==='week'?'primary':'outline'} size='sm' onClick={()=>setView('week')}>Semana</Btn>
    </div>

    {view==='day'&&<div>
      <div style={{display:'flex',marginLeft:132,marginBottom:4,borderBottom:`0.5px solid ${C.br}`,paddingBottom:3}}>
        {ticks.map((h,i)=><div key={i} style={{flex:1,textAlign:'center',fontSize:10,color:C.ht}}>{String(h).padStart(2,'0')}h</div>)}
      </div>
      {drivers.map(u=>{
        const sh=SHIFTS.find(s=>s.id===u.shiftId);if(!sh)return null;
        const off=isOff(u.id,TODAY,daysOff);
        const att=getAtt(u.id,TODAY);
        const active=att?.clockIn&&!att?.clockOut;const done=att?.clockIn&&att?.clockOut;
        const lPct=((sh.startH-DAY0)/SPAN)*100;
        const wPct=((sh.endH-sh.startH)/SPAN)*100;
        const curPct=((curH-DAY0)/SPAN)*100;
        const suc=SUCS.find(s=>s.id===u.sucursalId);
        const late=att?.late;
        return <div key={u.id} style={{display:'flex',alignItems:'center',marginBottom:5,height:32}}>
          <div style={{width:132,flexShrink:0,display:'flex',alignItems:'center',gap:6,paddingRight:8}}>
            <Av name={u.name} size={23}/>
            <div style={{overflow:'hidden'}}>
              <div style={{fontSize:12,fontWeight:500,color:C.tx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.name.split(' ')[0]}</div>
              {!singleUser&&<div style={{fontSize:10,color:C.ht,whiteSpace:'nowrap'}}>{suc?.name.split(' ')[0]}</div>}
            </div>
          </div>
          <div style={{flex:1,position:'relative',height:24,background:C.bg1,borderRadius:4}}>
            {off
              ?<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:C.grayBg,borderRadius:4}}>
                <span style={{fontSize:11,color:C.gray}}>Dia libre</span>
              </div>
              :<div style={{position:'absolute',left:`${Math.max(0,lPct)}%`,width:`${wPct}%`,top:0,bottom:0,background:sh.bg,border:`1px solid ${sh.color}60`,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                <span style={{fontSize:10,color:sh.color,fontWeight:500,whiteSpace:'nowrap'}}>{sh.start}-{sh.end}</span>
              </div>
            }
            {att?.clockIn&&!off&&(()=>{
              const ch=new Date(att.clockIn).getHours()+new Date(att.clockIn).getMinutes()/60;
              const p=((ch-DAY0)/SPAN)*100;
              return <div style={{position:'absolute',left:`${p}%`,top:-2,bottom:-2,width:2,background:late?C.red:active?C.green:C.blue,zIndex:2,borderRadius:1}}/>;
            })()}
            {!off&&curH>=DAY0&&curH<=DAY1&&<div style={{position:'absolute',left:`${curPct}%`,top:-3,bottom:-3,width:1,background:C.red,opacity:.7,zIndex:3}}/>}
          </div>
          <div style={{width:22,textAlign:'center',flexShrink:0,fontSize:13}}>
            {late&&!done&&<span style={{color:C.red}}>!</span>}
            {active&&!late&&<span style={{color:C.green}}>●</span>}
            {done&&<span style={{color:C.blue,fontSize:11}}>✓</span>}
          </div>
        </div>;
      })}
      <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
        {SHIFTS.map(s=><div key={s.id} style={{display:'flex',alignItems:'center',gap:4}}>
          <div style={{width:10,height:10,borderRadius:2,background:s.bg,border:`1px solid ${s.color}`}}/>
          <span style={{fontSize:11,color:C.mt}}>{s.label}</span>
        </div>)}
        <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:2,height:12,background:C.red,borderRadius:1}}/><span style={{fontSize:11,color:C.mt}}>Tarde</span></div>
        <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:1,height:12,background:C.red}}/><span style={{fontSize:11,color:C.mt}}>Ahora</span></div>
      </div>
    </div>}

    {view==='week'&&<div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
        <thead><tr>
          <th style={{padding:'7px 10px',textAlign:'left',color:C.mt,fontWeight:500,borderBottom:`0.5px solid ${C.br}`,minWidth:120,background:C.bg2,position:'sticky',left:0,zIndex:2}}>Driver</th>
          {weekDates.map(d=>{const dow=dowOf(d);const isT=d===TODAY;return(
            <th key={d} style={{padding:'5px 8px',textAlign:'center',color:isT?C.amber:C.mt,fontWeight:isT?600:500,borderBottom:`0.5px solid ${C.br}`,background:isT?C.amberBg:C.bg2,minWidth:62,borderLeft:`0.5px solid ${C.br}`}}>
              <div>{DAYS_ES[dow]}</div><div style={{fontSize:10,opacity:.7}}>{fmtD(d)}</div>
            </th>
          );})}
        </tr></thead>
        <tbody>
          {drivers.map(u=>{
            const sh=SHIFTS.find(s=>s.id===u.shiftId);
            return <tr key={u.id}>
              <td style={{padding:'5px 10px',borderBottom:`0.5px solid ${C.br}`,background:C.bg2,position:'sticky',left:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <Av name={u.name} size={24}/>
                  <div><div style={{fontWeight:500,color:C.tx}}>{u.name.split(' ')[0]}</div>{sh&&<div style={{fontSize:10,color:sh.color}}>{sh.label}</div>}</div>
                </div>
              </td>
              {weekDates.map(d=>{
                const off=isOff(u.id,d,daysOff);const att=getAtt(u.id,d);
                const active=att?.clockIn&&!att?.clockOut;const done=att?.clockIn&&att?.clockOut;const isT=d===TODAY;
                return <td key={d} style={{padding:'4px 5px',borderBottom:`0.5px solid ${C.br}`,borderLeft:`0.5px solid ${C.br}`,textAlign:'center',background:isT?C.amberBg+'60':'transparent'}}>
                  {off?<span style={{fontSize:10,color:C.gray,background:C.grayBg,padding:'1px 5px',borderRadius:99}}>Libre</span>
                  :sh?<div>
                    <div style={{fontSize:10,color:sh.color,background:sh.bg,padding:'1px 4px',borderRadius:99,display:'inline-block',whiteSpace:'nowrap'}}>{sh.start}</div>
                    {att?.late&&<div style={{fontSize:9,color:C.red}}>tarde</div>}
                    {active&&!att?.late&&<div style={{fontSize:9,color:C.green}}>activo</div>}
                    {done&&<div style={{fontSize:9,color:C.blue}}>salio</div>}
                  </div>:<span style={{color:C.ht}}>-</span>}
                </td>;
              })}
            </tr>;
          })}
        </tbody>
      </table>
    </div>}
  </div>;
}

// ══ MAP ════════════════════════════════════════════════════
function MapView({users,locations,attendance,highlightId}){
  const W=520,H=340,minLat=-17.830,maxLat=-17.750,minLng=-63.225,maxLng=-63.165;
  const xy=(lat,lng)=>({x:((lng-minLng)/(maxLng-minLng))*W,y:((maxLat-lat)/(maxLat-minLat))*H});
  const drivers=users.filter(u=>u.role==='driver');
  const now=new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});

  return <div style={{border:`0.5px solid ${C.br}`,borderRadius:12,overflow:'hidden',background:C.bg1}}>
    <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${C.br}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:13,fontWeight:500,color:C.tx}}>Rastreo GPS en vivo</span>
      <span style={{fontSize:11,color:C.ht}}>Actualiza c/5 min · {now}</span>
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
      {/* Grid */}
      {[0,1,2,3,4,5].map(i=><line key={`h${i}`} x1={0} y1={i*H/5} x2={W} y2={i*H/5} stroke={C.br} strokeWidth={0.5}/>)}
      {[0,1,2,3,4,5,6].map(i=><line key={`v${i}`} x1={i*W/6} y1={0} x2={i*W/6} y2={H} stroke={C.br} strokeWidth={0.5}/>)}
      {/* Sucursales */}
      {SUCS.map(s=>{const{x,y}=xy(s.lat,s.lng);return <g key={s.id}>
        <circle cx={x} cy={y} r={22} fill={s.color+'20'} stroke={s.color} strokeWidth={1.5} strokeDasharray="4,2"/>
        <text x={x} y={y-2} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={s.color} fontWeight={700}>{s.name.split(' ').map(w=>w[0]).join('')}</text>
        <text x={x} y={y+30} textAnchor="middle" fontSize={10} fill={s.color} fontWeight={500}>{s.name}</text>
      </g>;})}
      {/* Drivers */}
      {drivers.map(u=>{
        const loc=locations.find(l=>l.userId===u.id);if(!loc)return null;
        const{x,y}=xy(loc.lat,loc.lng);
        const sh=SHIFTS.find(s=>s.id===u.shiftId);const color=sh?.color||C.mt;
        const isMe=u.id===highlightId;const active=loc.active;
        const att=attendance.find(a=>a.userId===u.id&&a.date===TODAY);
        return <g key={u.id}>
          {isMe&&<circle cx={x} cy={y} r={16} fill={color+'25'}><animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite"/></circle>}
          <circle cx={x} cy={y} r={7} fill={active?color:C.bg2} stroke={color} strokeWidth={1.5} opacity={active?1:.5}/>
          {att?.late&&<circle cx={x+6} cy={y-6} r={4} fill={C.red}/>}
          <text x={x} y={y+17} textAnchor="middle" fontSize={10} fill={color} opacity={active?1:.6}>{u.name.split(' ')[0]}</text>
        </g>;
      })}
    </svg>
    <div style={{padding:'8px 16px',borderTop:`0.5px solid ${C.br}`,display:'flex',gap:14,flexWrap:'wrap'}}>
      {SHIFTS.map(s=><div key={s.id} style={{display:'flex',alignItems:'center',gap:4}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:s.color}}/>
        <span style={{fontSize:11,color:C.mt}}>{s.label}</span>
      </div>)}
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:C.bg2,border:`1.5px solid ${C.mt}`}}/>
        <span style={{fontSize:11,color:C.mt}}>Sin entrada</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:C.red}}/>
        <span style={{fontSize:11,color:C.mt}}>Con tardanza</span>
      </div>
    </div>
  </div>;
}

// ══ HISTORY VIEW ══════════════════════════════════════════
function HistoryView({users,attendance,daysOff,onExport}){
  const[date,setDate]=useState(TODAY);
  const drivers=users.filter(u=>u.role==='driver');
  const dayAtt=attendance.filter(a=>a.date===date);

  return <div>
    <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'flex-end'}}>
      <div style={{flex:1}}><Fld label="Fecha" type="date" value={date} onChange={setDate}/></div>
      {onExport&&<Btn v="outline" size="sm" onClick={onExport} style={{marginBottom:14}}>Exportar CSV</Btn>}
    </div>
    <div style={{fontSize:12,color:C.ht,marginBottom:10}}>
      {new Date(date+'T12:00:00').toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
    </div>
    {drivers.map(u=>{
      const att=dayAtt.find(x=>x.userId===u.id);
      const off=isOff(u.id,date,daysOff);
      const sh=SHIFTS.find(s=>s.id===u.shiftId);
      const suc=SUCS.find(s=>s.id===u.sucursalId);
      const hrs=att?.clockIn&&att?.clockOut?calcHours(att.clockIn,att.clockOut).toFixed(1):null;
      return <Card key={u.id} style={{marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
        <Av name={u.name} size={36}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:500,color:C.tx}}>{u.name}</div>
          <div style={{fontSize:12,color:C.mt}}>{suc?.name} · {sh?.label}</div>
        </div>
        <div style={{textAlign:'right'}}>
          {off&&<Pill s="dayoff" label="Libre"/>}
          {!off&&att?.clockIn&&!att?.clockOut&&<><Pill s="working" label="Trabajando"/><div style={{fontSize:11,color:C.mt,marginTop:2}}>Desde {fmtT(att.clockIn)}</div></>}
          {!off&&att?.clockIn&&att?.clockOut&&<div>
            <div style={{fontSize:12,color:C.blue,fontWeight:500}}>{fmtT(att.clockIn)} - {fmtT(att.clockOut)}</div>
            <div style={{fontSize:11,color:C.mt,marginTop:1}}>{hrs}h{att.late?<span style={{color:C.red}}> · Tarde {att.lateMin}min</span>:''}</div>
          </div>}
          {!off&&!att?.clockIn&&<Pill s="absent" label="Ausente"/>}
        </div>
      </Card>;
    })}
  </div>;
}

// ══ HOURS SUMMARY ══════════════════════════════════════════
function HoursSummary({users,attendance}){
  const drivers=users.filter(u=>u.role==='driver');
  const mon=getMon(new Date(TODAY+'T12:00:00'));
  const weekDates=getWeekDates(mon);
  const monthName=new Date().toLocaleDateString('es',{month:'long'});

  return <div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:500,color:C.mt}}>Semana actual</div>
      <div style={{fontSize:13,fontWeight:500,color:C.mt,textAlign:'right',textTransform:'capitalize'}}>{monthName}</div>
    </div>
    {drivers.map(u=>{
      const weekH=attendance.filter(a=>a.userId===u.id&&weekDates.includes(a.date)&&a.clockIn&&a.clockOut).reduce((s,a)=>s+calcHours(a.clockIn,a.clockOut),0);
      const stats=getMonthStats(u.id,attendance);
      const sh=SHIFTS.find(s=>s.id===u.shiftId);
      const suc=SUCS.find(s=>s.id===u.sucursalId);
      return <Card key={u.id} style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <Av name={u.name} size={32}/>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:500,color:C.tx}}>{u.name}</div>
            <div style={{fontSize:12,color:C.mt}}>{suc?.name} · <span style={{color:sh?.color}}>{sh?.label}</span></div>
          </div>
          {stats.late>0&&<Pill s="rejected" label={`${stats.late} tardanzas`}/>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <Stat label="Hrs semana" value={weekH.toFixed(1)+'h'} v="blue"/>
          <Stat label="Hrs mes" value={stats.totalH+'h'} v="green"/>
          <Stat label="Dias trabajados" value={stats.worked} v="neutral"/>
        </div>
      </Card>;
    })}
  </div>;
}

// ══ DAY NOTES ══════════════════════════════════════════════
function DayNotes({notes,users,me,onAdd,onDelete}){
  const[text,setText]=useState('');
  const today=notes.filter(n=>n.date===TODAY);
  return <div>
    <Hdr>Notas del turno — {new Date(TODAY+'T12:00:00').toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'})}</Hdr>
    {today.length===0&&<div style={{fontSize:13,color:C.ht,marginBottom:12}}>Sin notas hoy</div>}
    {today.map(n=>{const author=users.find(u=>u.id===n.authorId);return <Card key={n.id} style={{marginBottom:8,borderLeft:`3px solid ${C.amber}`}}>
      <div style={{fontSize:13,color:C.tx,marginBottom:6}}>{n.text}</div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:11,color:C.ht}}>{author?.name} · {fmtT(n.createdAt)}</span>
        {n.authorId===me.id&&<Btn v="ghost" size="sm" onClick={()=>onDelete(n.id)}>Eliminar</Btn>}
      </div>
    </Card>;})}
    <div style={{display:'flex',gap:8,marginTop:8}}>
      <input value={text} onChange={e=>setText(e.target.value)}
        onKeyDown={e=>e.key==='Enter'&&text.trim()&&(onAdd({date:TODAY,text,authorId:me.id}),setText(''))}
        placeholder="Agregar nota del turno..." style={{flex:1,padding:'8px 12px',fontSize:13,border:`0.5px solid ${C.bm}`,borderRadius:8,background:C.bg1,color:C.tx,outline:'none'}}/>
      <Btn v="primary" onClick={()=>{if(text.trim()){onAdd({date:TODAY,text,authorId:me.id});setText('');}}} disabled={!text.trim()}>+</Btn>
    </div>
  </div>;
}

// ══ LOGIN ══════════════════════════════════════════════════
function LoginView({users,onLogin}){
  const[sel,setSel]=useState(null);const[pin,setPin]=useState('');const[err,setErr]=useState('');
  const groups=[{label:'Administración / Supervisión',roles:['admin','supervisor']},{label:'Despacho',roles:['despacho','aux_despacho']},{label:'Drivers',roles:['driver']}];
  function tryLogin(){if(pin===sel.pin)onLogin(sel);else{setErr('PIN incorrecto');setPin('');}}
  return <div style={{minHeight:'100vh',background:C.bg0,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
    <div style={{width:'100%',maxWidth:500}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{fontSize:22,fontWeight:500,color:C.tx,marginBottom:4}}>Sistema de Flota</div>
        <div style={{fontSize:13,color:C.mt}}>Canal Isuto · Escuadron Velasco</div>
      </div>
      {!sel?<div>
        {groups.map(({label,roles},gi)=>{
          const us=users.filter(u=>roles.includes(u.role));if(!us.length)return null;
          return <div key={gi} style={{marginBottom:20}}>
            <Hdr>{label}</Hdr>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {us.map(u=><Card key={u.id} onClick={()=>{setSel(u);setPin('');setErr('');}} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
                <Av name={u.name} size={36}/>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:C.tx}}>{u.name}</div><div style={{fontSize:12,color:C.mt,fontFamily:'var(--font-mono)'}}>PIN: {u.pin}</div></div>
                <Pill s={u.role} label={RL[u.role]}/>
              </Card>)}
            </div>
          </div>;
        })}
      </div>:<Card>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <Av name={sel.name} size={44}/>
          <div><div style={{fontSize:16,fontWeight:500,color:C.tx,marginBottom:4}}>{sel.name}</div><Pill s={sel.role} label={RL[sel.role]}/></div>
        </div>
        <Fld label="PIN" type="password" value={pin} onChange={setPin} placeholder="••••"/>
        {err&&<div style={{color:C.red,fontSize:13,marginBottom:12}}>{err}</div>}
        <div style={{display:'flex',gap:10}}>
          <Btn onClick={()=>{setSel(null);setErr('');}} v="outline">Volver</Btn>
          <Btn onClick={tryLogin} v="primary" full disabled={!pin}>Ingresar</Btn>
        </div>
      </Card>}
    </div>
  </div>;
}

// ══ SHARED PANELS ══════════════════════════════════════════
function NotifPanel({notifs,userId,onMarkRead}){
  const mine=notifs.filter(n=>n.userId===userId).reverse();
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
      <Hdr style={{marginBottom:0}}>Notificaciones</Hdr>
      {mine.some(n=>!n.read)&&<Btn v="ghost" size="sm" onClick={()=>onMarkRead(userId)}>Marcar leidas</Btn>}
    </div>
    {mine.length===0?<Card><div style={{color:C.ht}}>Sin notificaciones</div></Card>
    :mine.map(n=><Card key={n.id} style={{marginBottom:8,opacity:n.read?.6:1,borderLeft:`3px solid ${n.read?C.br:C.amber}`}}>
      <div style={{fontSize:13,color:C.tx,marginBottom:4}}>{n.msg}</div>
      <div style={{fontSize:11,color:C.ht}}>{new Date(n.createdAt).toLocaleString('es',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
    </Card>)}
  </div>;
}

function ReqCard({r,users,canApprove,canAcceptTarget,myId,onApprove,onAccept}){
  const from=users.find(u=>u.id===r.fromId);const to=r.toId?users.find(u=>u.id===r.toId):null;
  const isTarget=r.toId===myId&&r.status==='pending'&&canAcceptTarget;
  const showApprove=canApprove&&(r.status==='pending'||r.status==='target_accepted')&&r.fromId!==myId&&!isTarget;
  return <Card style={{marginBottom:10}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
      <div style={{fontSize:14,fontWeight:500,color:C.tx}}>{REQ_T[r.type]}</div>
      <Pill s={r.status} label={SL[r.status]||r.status}/>
    </div>
    <div style={{fontSize:12,color:C.mt,marginBottom:r.note?8:0}}>{from?.name}{to?` → ${to.name}`:''} · {r.date}</div>
    {r.time&&<div style={{fontSize:12,color:C.mt,marginBottom:4}}>Hora solicitada: {r.time}</div>}
    {r.note&&<div style={{fontSize:13,color:C.tx,padding:'8px 10px',background:C.bg1,borderRadius:8,marginBottom:8}}>{r.note}</div>}
    {isTarget&&<div style={{display:'flex',gap:8,marginTop:8}}>
      <Btn v="danger" size="sm" onClick={()=>onAccept(r.id,'target_rejected')}>Rechazar</Btn>
      <Btn v="success" size="sm" onClick={()=>onAccept(r.id,'target_accepted')}>Aceptar</Btn>
    </div>}
    {showApprove&&<div style={{display:'flex',gap:8,marginTop:8}}>
      <Btn v="danger" size="sm" onClick={()=>onApprove(r.id,'rejected')}>Rechazar</Btn>
      <Btn v="success" size="sm" onClick={()=>onApprove(r.id,'approved')}>Aprobar</Btn>
    </div>}
  </Card>;
}

// ══ DRIVER VIEW ════════════════════════════════════════════
function DriverView({me,users,daysOff,attendance,requests,notifications,locations,onClock,onAddReq,onAccept,onMarkRead,onChangePin,onLogout}){
  const[tab,setTab]=useState('home');
  const[modal,setModal]=useState(null);
  const[pinModal,setPinModal]=useState(false);
  const[rf,setRf]=useState({type:'entry_change',note:'',time:'',date:TODAY,targetId:''});
  const myAtt=attendance.find(a=>a.userId===me.id&&a.date===TODAY);
  const isW=myAtt?.clockIn&&!myAtt?.clockOut;const isDone=myAtt?.clockIn&&myAtt?.clockOut;
  const sh=SHIFTS.find(s=>s.id===me.shiftId);const suc=SUCS.find(s=>s.id===me.sucursalId);
  const myOff=isOff(me.id,TODAY,daysOff);
  const drivers=users.filter(u=>u.role==='driver'&&u.id!==me.id);
  const incomingP=requests.filter(r=>r.toId===me.id&&r.status==='pending');
  const unread=notifications.filter(n=>n.userId===me.id&&!n.read).length;
  const needTarget=['schedule_swap','dayoff_swap','relief'].includes(rf.type);
  const supervisors=users.filter(u=>u.role==='supervisor');
  const myHistory=attendance.filter(a=>a.userId===me.id).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,21);
  const myStats=getMonthStats(me.id,attendance);

  function submit(){
    const supId=supervisors.find(s=>s.sucursalId===me.sucursalId)?.id||supervisors[0]?.id;
    onAddReq({type:rf.type,fromId:me.id,toId:rf.targetId||null,supId,date:rf.date||TODAY,note:rf.note,time:rf.time});
    setModal(null);setRf({type:'entry_change',note:'',time:'',date:TODAY,targetId:''});
  }

  const tabItems=[{id:'home',label:'Inicio'},{id:'semana',label:'Mi semana'},{id:'historial',label:'Mi historial'},{id:'mapa',label:'Mapa'},{id:'requests',label:`Solicitudes${incomingP.length?` (${incomingP.length})`:''}`},{id:'notifs',label:`Notif.${unread?` (${unread})`:''}`}];

  return <div style={{maxWidth:540,margin:'0 auto',padding:20,minHeight:'100vh',background:C.bg0}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <Av name={me.name} size={40}/>
        <div><div style={{fontSize:16,fontWeight:500,color:C.tx}}>{me.name}</div>
          <div style={{fontSize:12,color:C.mt}}>{suc?.name} · {sh?.label}</div></div>
      </div>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        <Bell notifs={notifications} userId={me.id} onClick={()=>setTab('notifs')}/>
        <Btn v="outline" size="sm" onClick={()=>setPinModal(true)}>PIN</Btn>
        <Btn v="ghost" size="sm" onClick={onLogout}>Salir</Btn>
      </div>
    </div>
    <Tabs items={tabItems} active={tab} onChange={setTab}/>

    {tab==='home'&&<div>
      {myOff&&<Card style={{textAlign:'center',padding:24,marginBottom:16,background:C.grayBg}}>
        <div style={{fontSize:16,fontWeight:500,color:C.gray}}>Hoy es tu dia libre</div>
        <div style={{fontSize:13,color:C.gray,marginTop:4}}>Descansa bien!</div>
      </Card>}
      {!myOff&&<Card style={{textAlign:'center',padding:28,marginBottom:16}}>
        <div style={{fontSize:13,color:C.mt,marginBottom:4}}>{new Date().toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'})}</div>
        {sh&&<div style={{marginBottom:16}}><Pill s={me.shiftId} label={`${sh.start} - ${sh.end}`}/></div>}
        {myAtt?.late&&<div style={{marginBottom:12}}><Alert msg={`Llegaste ${myAtt.lateMin} minutos tarde`}/></div>}
        {myAtt&&<div style={{display:'flex',gap:24,justifyContent:'center',marginBottom:20}}>
          <div><div style={{fontSize:11,color:C.ht}}>Entrada</div><div style={{fontSize:20,fontWeight:500,color:myAtt.late?C.red:C.green}}>{fmtT(myAtt.clockIn)}</div></div>
          {myAtt.clockOut&&<div><div style={{fontSize:11,color:C.ht}}>Salida</div><div style={{fontSize:20,fontWeight:500,color:C.blue}}>{fmtT(myAtt.clockOut)}</div></div>}
          {myAtt.clockIn&&myAtt.clockOut&&<div><div style={{fontSize:11,color:C.ht}}>Horas</div><div style={{fontSize:20,fontWeight:500,color:C.tx}}>{calcHours(myAtt.clockIn,myAtt.clockOut).toFixed(1)}h</div></div>}
        </div>}
        <button onClick={()=>{if(!isDone){isW?onClock('out',me.id):onClock('in',me.id,me.sucursalId);}}} disabled={isDone}
          style={{width:130,height:130,borderRadius:'50%',background:isDone?C.bg1:isW?C.redBg:C.greenBg,border:`2px solid ${isDone?C.br:isW?C.red:C.green}`,cursor:isDone?'default':'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',margin:'0 auto',transition:'all .2s'}}>
          <div style={{fontSize:26,marginBottom:4}}>{isDone?'✓':isW?'◼':'▶'}</div>
          <div style={{fontSize:12,fontWeight:500,color:isDone?C.mt:isW?C.red:C.green}}>{isDone?'Completado':isW?'Marcar salida':'Marcar entrada'}</div>
        </button>
      </Card>}
      {/* Este mes */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12}}>
        <Stat label="Dias trabajados" value={myStats.worked} v="blue"/>
        <Stat label="Tardanzas mes" value={myStats.late} v={myStats.late>0?'red':'neutral'}/>
        <Stat label="Horas mes" value={myStats.totalH+'h'} v="green"/>
      </div>
      <Card style={{padding:'12px 16px'}}><div style={{fontSize:13,fontWeight:500,color:C.tx}}>Sucursal: {suc?.name}</div><div style={{fontSize:12,color:C.mt,marginTop:3}}>{sh?.name} · {sh?.start} - {sh?.end}</div></Card>
    </div>}

    {tab==='semana'&&<Card><GanttView users={users} daysOff={daysOff} attendance={attendance} singleUser={me}/></Card>}

    {tab==='historial'&&<div>
      <Hdr>Mis ultimos 21 dias</Hdr>
      {myHistory.length===0?<Card><div style={{color:C.ht}}>Sin registros</div></Card>
      :myHistory.map(a=>{
        const hrs=a.clockIn&&a.clockOut?calcHours(a.clockIn,a.clockOut).toFixed(1):null;
        const off=isOff(me.id,a.date,daysOff);
        return <Card key={a.id} style={{marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:48,textAlign:'center'}}>
            <div style={{fontSize:11,color:C.ht}}>{DAYS_ES[dowOf(a.date)]}</div>
            <div style={{fontSize:13,fontWeight:500,color:a.date===TODAY?C.amber:C.tx}}>{fmtD(a.date)}</div>
          </div>
          <div style={{flex:1}}>
            {a.clockIn&&<div style={{fontSize:13,color:C.tx}}>{fmtT(a.clockIn)}{a.clockOut?` - ${fmtT(a.clockOut)}`:' → activo'}</div>}
            {a.clockIn&&a.clockOut&&<div style={{fontSize:11,color:C.mt}}>{hrs} horas{a.late?` · Tarde ${a.lateMin}min`:''}</div>}
          </div>
          <div>
            {a.late&&<Pill s="late" label={`Tarde ${a.lateMin}min`}/>}
            {!a.late&&a.clockIn&&a.clockOut&&<Pill s="done" label="Completo"/>}
            {a.clockIn&&!a.clockOut&&<Pill s="working" label="Activo"/>}
          </div>
        </Card>;
      })}
    </div>}

    {tab==='mapa'&&<MapView users={users} locations={locations} attendance={attendance} highlightId={me.id}/>}

    {tab==='requests'&&<div>
      <Btn onClick={()=>setModal('req')} v="primary" full style={{marginBottom:16}}>Nueva solicitud</Btn>
      {incomingP.length>0&&<div style={{marginBottom:16}}>
        <Hdr>Solicitudes recibidas</Hdr>
        {incomingP.map(r=><ReqCard key={r.id} r={r} users={users} canAcceptTarget myId={me.id} onAccept={onAccept}/>)}
        <Divider/>
      </div>}
      <Hdr>Mis solicitudes</Hdr>
      {requests.filter(r=>r.fromId===me.id).length===0?<Card><div style={{color:C.ht}}>Sin solicitudes</div></Card>
      :requests.filter(r=>r.fromId===me.id).reverse().map(r=><ReqCard key={r.id} r={r} users={users} myId={me.id}/>)}
    </div>}

    {tab==='notifs'&&<NotifPanel notifs={notifications} userId={me.id} onMarkRead={onMarkRead}/>}

    <Modal open={modal==='req'} onClose={()=>setModal(null)} title="Nueva solicitud">
      <Fld label="Tipo" value={rf.type} onChange={v=>setRf(f=>({...f,type:v,targetId:'',note:'',time:''}))} options={Object.entries(REQ_T).map(([v,l])=>({v,l}))}/>
      <Fld label="Fecha" type="date" value={rf.date} onChange={v=>setRf(f=>({...f,date:v}))}/>
      {rf.type==='entry_change'&&<Fld label="Nueva hora de entrada" value={rf.time} onChange={v=>setRf(f=>({...f,time:v}))} placeholder="ej: 08:00"/>}
      {needTarget&&<Fld label="Driver" value={rf.targetId} onChange={v=>setRf(f=>({...f,targetId:v}))} options={[{v:'',l:'-- Seleccionar --'},...drivers.map(u=>({v:u.id,l:u.name}))]}/>}
      <Fld label="Motivo" value={rf.note} onChange={v=>setRf(f=>({...f,note:v}))} placeholder="Explica el motivo..." rows={3}/>
      <div style={{display:'flex',gap:10}}>
        <Btn onClick={()=>setModal(null)} v="outline">Cancelar</Btn>
        <Btn onClick={submit} v="primary" full disabled={needTarget&&!rf.targetId}>Enviar</Btn>
      </div>
    </Modal>
    <PinModal open={pinModal} onClose={()=>setPinModal(false)} user={me} onSave={pin=>onChangePin(me.id,pin)}/>
  </div>;
}

// ══ DESPACHO VIEW ══════════════════════════════════════════
function DespachoView({me,users,daysOff,attendance,requests,reports,notifications,locations,notes,alerts,onApprove,onAddReport,onAddNote,onDeleteNote,onMarkRead,onChangePin,onLogout}){
  const[tab,setTab]=useState('dashboard');
  const[pinModal,setPinModal]=useState(false);
  const[rpModal,setRpModal]=useState(false);
  const[rpForm,setRpForm]=useState({driverId:'',cat:RPT_CATS[0],detail:''});
  const drivers=users.filter(u=>u.role==='driver');
  const getAtt=id=>attendance.find(a=>a.userId===id&&a.date===TODAY);
  const working=drivers.filter(u=>{const a=getAtt(u.id);return a?.clockIn&&!a?.clockOut;});
  const done=drivers.filter(u=>{const a=getAtt(u.id);return a?.clockIn&&a?.clockOut;});
  const offs=drivers.filter(u=>isOff(u.id,TODAY,daysOff));
  const absent=drivers.filter(u=>!getAtt(u.id)?.clockIn&&!isOff(u.id,TODAY,daysOff));
  const lateToday=attendance.filter(a=>a.date===TODAY&&a.late);
  const pendingReqs=requests.filter(r=>r.status==='pending'&&['entry_change','shift_change'].includes(r.type));
  const unread=notifications.filter(n=>n.userId===me.id&&!n.read).length;
  const suc=SUCS.find(s=>s.id===me.sucursalId);

  function submitReport(){onAddReport({...rpForm,reporterId:me.id});setRpModal(false);setRpForm({driverId:'',cat:RPT_CATS[0],detail:''});}

  const tabItems=[{id:'dashboard',label:'Dashboard'},{id:'planner',label:'Planificador'},{id:'mapa',label:'Mapa'},{id:'historial',label:'Historial'},{id:'requests',label:`Aprobar${pendingReqs.length?` (${pendingReqs.length})`:''}`},{id:'notifs',label:`Notif.${unread?` (${unread})`:''}`}];

  return <div style={{maxWidth:700,margin:'0 auto',padding:20,minHeight:'100vh',background:C.bg0}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
      <div><div style={{fontSize:18,fontWeight:500,color:C.tx}}>{me.name}</div>
        <div style={{fontSize:13,color:C.mt}}>Despacho · {suc?.name} · {SHIFTS.find(s=>s.id===me.shiftId)?.label}</div></div>
      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
        <Bell notifs={notifications} userId={me.id} onClick={()=>setTab('notifs')}/>
        <Btn v="danger" size="sm" onClick={()=>setRpModal(true)}>Reportar driver</Btn>
        <Btn v="outline" size="sm" onClick={()=>setPinModal(true)}>PIN</Btn>
        <Btn v="ghost" size="sm" onClick={onLogout}>Salir</Btn>
      </div>
    </div>
    <Tabs items={tabItems} active={tab} onChange={setTab}/>

    {tab==='dashboard'&&<div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:16}}>
        <Stat label="Trabajando ahora" value={working.length} v="green"/>
        <Stat label="Dias libres hoy" value={offs.length} v="gray"/>
        <Stat label="Faltas" value={absent.length} v="red"/>
        <Stat label="Terminaron" value={done.length} v="blue"/>
      </div>
      {/* Alertas tardanza */}
      {lateToday.length>0&&<div style={{marginBottom:16}}>
        <Hdr>Tardanzas de hoy</Hdr>
        {lateToday.map(a=>{const u=users.find(x=>x.id===a.userId);return <Alert key={a.id} msg={`${u?.name} - llegó ${a.lateMin} minutos tarde (${fmtT(a.clockIn)})`}/>;}) }
      </div>}
      {/* No-show alerts */}
      {alerts.filter(a=>a.date===TODAY).map(a=>{const u=users.find(x=>x.id===a.driverId);return <Alert key={a.id} msg={`Sin presentarse: ${u?.name} - lleva más de 30 min sin marcar entrada`}/>;}).slice(0,5)}
      <Hdr style={{marginTop:8}}>Personal activo</Hdr>
      {working.length===0?<Card style={{marginBottom:12}}><div style={{color:C.ht}}>Nadie activo en este momento</div></Card>
      :working.map(u=>{const a=getAtt(u.id);const sh=SHIFTS.find(s=>s.id===u.shiftId);const suc=SUCS.find(s=>s.id===u.sucursalId);
        return <Card key={u.id} style={{marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:C.green,flexShrink:0}}/>
          <Av name={u.name} size={32}/>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:C.tx}}>{u.name}</div><div style={{fontSize:12,color:C.mt}}>{suc?.name} · {sh?.label}</div></div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:12,color:C.green}}>Desde {fmtT(a?.clockIn)}</div>
            {a?.late&&<Pill s="late" label={`Tarde ${a.lateMin}min`}/>}
          </div>
        </Card>;
      })}
      {absent.length>0&&<><Hdr style={{marginTop:12}}>Faltas</Hdr>
        {absent.map(u=>{const sh=SHIFTS.find(s=>s.id===u.shiftId);return <Card key={u.id} style={{marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
          <Av name={u.name} size={32}/>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:C.tx}}>{u.name}</div><div style={{fontSize:12,color:C.mt}}>{sh?.label}</div></div>
          <Pill s="absent" label="Ausente"/>
        </Card>;})}
      </>}
      <Divider/>
      <DayNotes notes={notes} users={users} me={me} onAdd={onAddNote} onDelete={onDeleteNote}/>
    </div>}

    {tab==='planner'&&<Card><GanttView users={users} daysOff={daysOff} attendance={attendance}/></Card>}
    {tab==='mapa'&&<MapView users={users} locations={locations} attendance={attendance}/>}
    {tab==='historial'&&<HistoryView users={users} attendance={attendance} daysOff={daysOff} onExport={()=>exportCSV(attendance,users)}/>}

    {tab==='requests'&&<div>
      {pendingReqs.length===0?<Card style={{marginBottom:12}}><div style={{color:C.ht}}>Sin solicitudes pendientes</div></Card>
      :pendingReqs.map(r=><ReqCard key={r.id} r={r} users={users} canApprove myId={me.id} onApprove={onApprove}/>)}
      {requests.filter(r=>['entry_change','shift_change'].includes(r.type)&&r.status!=='pending').length>0&&<>
        <Divider/><Hdr>Historial</Hdr>
        {requests.filter(r=>['entry_change','shift_change'].includes(r.type)&&r.status!=='pending').reverse().map(r=><ReqCard key={r.id} r={r} users={users} myId={me.id}/>)}
      </>}
    </div>}

    {tab==='notifs'&&<NotifPanel notifs={notifications} userId={me.id} onMarkRead={onMarkRead}/>}

    <Modal open={rpModal} onClose={()=>setRpModal(false)} title="Reportar driver">
      <Fld label="Driver" value={rpForm.driverId} onChange={v=>setRpForm(f=>({...f,driverId:v}))} options={[{v:'',l:'-- Seleccionar --'},...drivers.map(u=>({v:u.id,l:u.name}))]}/>
      <Fld label="Categoria" value={rpForm.cat} onChange={v=>setRpForm(f=>({...f,cat:v}))} options={RPT_CATS.map(c=>({v:c,l:c}))}/>
      <Fld label="Detalle" value={rpForm.detail} onChange={v=>setRpForm(f=>({...f,detail:v}))} placeholder="Describe el incidente..." rows={4}/>
      <div style={{display:'flex',gap:10}}>
        <Btn onClick={()=>setRpModal(false)} v="outline">Cancelar</Btn>
        <Btn onClick={submitReport} v="danger" full disabled={!rpForm.driverId||!rpForm.detail}>Enviar reporte</Btn>
      </div>
    </Modal>
    <PinModal open={pinModal} onClose={()=>setPinModal(false)} user={me} onSave={pin=>onChangePin(me.id,pin)}/>
  </div>;
}

// ══ SUPERVISOR VIEW ════════════════════════════════════════
function SupervisorView({me,users,daysOff,setDaysOff,attendance,requests,reports,notifications,locations,notes,alerts,onApprove,onAccept,onAddNote,onDeleteNote,onMarkRead,onChangePin,onLogout}){
  const[tab,setTab]=useState('dashboard');
  const[pinModal,setPinModal]=useState(false);
  const[doModal,setDoModal]=useState(false);
  const[doForm,setDoForm]=useState({userId:'',type:'single',date:TODAY,startDate:TODAY,startDay:'Mon',inclSat:false,inclSun:false});
  const drivers=users.filter(u=>u.role==='driver');
  const getAtt=id=>attendance.find(a=>a.userId===id&&a.date===TODAY);
  const working=drivers.filter(u=>{const a=getAtt(u.id);return a?.clockIn&&!a?.clockOut;});
  const offs=drivers.filter(u=>isOff(u.id,TODAY,daysOff));
  const absent=drivers.filter(u=>!getAtt(u.id)?.clockIn&&!isOff(u.id,TODAY,daysOff));
  const lateToday=attendance.filter(a=>a.date===TODAY&&a.late);
  const noShowAlerts=alerts.filter(a=>a.date===TODAY);
  const allPending=requests.filter(r=>r.status==='pending'||r.status==='target_accepted');
  const complaints=requests.filter(r=>r.type==='complaint');
  const unread=notifications.filter(n=>n.userId===me.id&&!n.read).length;
  const mon=getMon(new Date(TODAY+'T12:00:00'));const weekDates=getWeekDates(mon);

  function addDayOff(){
    const e=doForm.type==='single'
      ?{id:uid(),userId:doForm.userId,type:'single',date:doForm.date}
      :{id:uid(),userId:doForm.userId,type:'rotating',cfg:{startDate:doForm.startDate,startDay:doForm.startDay,inclSat:doForm.inclSat,inclSun:doForm.inclSun}};
    setDaysOff(p=>[...p,e]);setDoModal(false);
  }

  const tabItems=[{id:'dashboard',label:'Dashboard'},{id:'planner',label:'Planificador'},{id:'mapa',label:'Mapa'},{id:'historial',label:'Historial'},{id:'horas',label:'Horas'},{id:'requests',label:`Solicitudes${allPending.length?` (${allPending.length})`:''}`},{id:'daysoff',label:'Libres'},{id:'reportes',label:`Reportes${reports.length+complaints.length>0?` (${reports.length+complaints.length})`:''}`},{id:'notifs',label:`Notif.${unread?` (${unread})`:''}`}];

  return <div style={{maxWidth:720,margin:'0 auto',padding:20,minHeight:'100vh',background:C.bg0}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
      <div><div style={{fontSize:18,fontWeight:500,color:C.tx}}>{me.name}</div><div style={{fontSize:13,color:C.mt}}>Supervisor</div></div>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        <Bell notifs={notifications} userId={me.id} onClick={()=>setTab('notifs')}/>
        <Btn v="outline" size="sm" onClick={()=>setPinModal(true)}>PIN</Btn>
        <Btn v="ghost" size="sm" onClick={onLogout}>Salir</Btn>
      </div>
    </div>
    <Tabs items={tabItems} active={tab} onChange={setTab}/>

    {tab==='dashboard'&&<div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:16}}>
        <Stat label="Trabajando ahora" value={working.length} v="green"/>
        <Stat label="Dias libres hoy" value={offs.length} v="gray"/>
        <Stat label="Faltas" value={absent.length} v="red"/>
        <Stat label="Solicitudes pend." value={allPending.length} v="amber"/>
      </div>
      {(lateToday.length>0||noShowAlerts.length>0)&&<div style={{marginBottom:16}}>
        <Hdr>Alertas</Hdr>
        {noShowAlerts.map(a=>{const u=users.find(x=>x.id===a.driverId);return <Alert key={a.id} msg={`Sin presentarse: ${u?.name} - más de 30 min sin marcar entrada`}/>;}) }
        {lateToday.map(a=>{const u=users.find(x=>x.id===a.userId);return <Alert key={a.id} msg={`${u?.name} llegó ${a.lateMin} minutos tarde hoy`}/>;}) }
      </div>}
      <Hdr>Personal hoy</Hdr>
      {drivers.map(u=>{
        const a=getAtt(u.id);const isW=a?.clockIn&&!a?.clockOut;const isD=a?.clockIn&&a?.clockOut;
        const off=isOff(u.id,TODAY,daysOff);const sh=SHIFTS.find(s=>s.id===u.shiftId);const suc=SUCS.find(s=>s.id===u.sucursalId);
        return <Card key={u.id} style={{marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
          <Av name={u.name} size={36}/>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:C.tx}}>{u.name}</div><div style={{fontSize:12,color:C.mt}}>{suc?.name} · {sh?.label}</div></div>
          <div style={{textAlign:'right'}}>
            {off&&<Pill s="dayoff" label="Libre"/>}
            {!off&&isW&&<><Pill s="working" label="Trabajando"/>{a?.late&&<div style={{marginTop:2}}><Pill s="late" label={`Tarde ${a.lateMin}min`}/></div>}<div style={{fontSize:11,color:C.mt,marginTop:2}}>Desde {fmtT(a.clockIn)}</div></>}
            {!off&&isD&&<><Pill s="done" label="Termino"/><div style={{fontSize:11,color:C.mt,marginTop:2}}>{fmtT(a.clockIn)}-{fmtT(a.clockOut)}</div><div style={{fontSize:11,color:C.mt}}>{calcHours(a.clockIn,a.clockOut).toFixed(1)}h{a.late?` · tarde ${a.lateMin}min`:''}</div></>}
            {!off&&!a?.clockIn&&<Pill s="absent" label="Ausente"/>}
          </div>
        </Card>;
      })}
      <Divider/>
      <DayNotes notes={notes} users={users} me={me} onAdd={onAddNote} onDelete={onDeleteNote}/>
    </div>}

    {tab==='planner'&&<Card><GanttView users={users} daysOff={daysOff} attendance={attendance}/></Card>}
    {tab==='mapa'&&<MapView users={users} locations={locations} attendance={attendance}/>}
    {tab==='historial'&&<HistoryView users={users} attendance={attendance} daysOff={daysOff} onExport={()=>exportCSV(attendance,users)}/>}
    {tab==='horas'&&<HoursSummary users={users} attendance={attendance}/>}

    {tab==='requests'&&<div>
      {allPending.length===0?<Card style={{marginBottom:12}}><div style={{color:C.ht}}>Sin solicitudes pendientes</div></Card>
      :allPending.map(r=><ReqCard key={r.id} r={r} users={users} canApprove myId={me.id} onApprove={onApprove} onAccept={onAccept}/>)}
      <Divider/><Hdr>Historial</Hdr>
      {requests.filter(r=>['approved','rejected','target_rejected'].includes(r.status)).reverse().map(r=><ReqCard key={r.id} r={r} users={users} myId={me.id}/>)}
    </div>}

    {tab==='daysoff'&&<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <Hdr style={{marginBottom:0}}>Dias libres</Hdr>
        <Btn v="primary" size="sm" onClick={()=>setDoModal(true)}>+ Agregar</Btn>
      </div>
      {daysOff.map(d=>{const u=users.find(x=>x.id===d.userId);return <Card key={d.id} style={{marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
        <Av name={u?.name||'?'} size={34}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:500,color:C.tx}}>{u?.name}</div>
          {d.type==='single'?<div style={{fontSize:12,color:C.mt}}>Dia libre: {fmtDL(d.date)}</div>
          :<div style={{fontSize:12,color:C.mt}}>Rotativo desde {fmtD(d.cfg.startDate)} · inicio {DAYS_ES[d.cfg.startDay]}{d.cfg.inclSat?' + Sab':''}{d.cfg.inclSun?' + Dom':''}</div>}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <Pill s={d.type==='single'?'done':'working'} label={d.type==='single'?'Puntual':'Rotativo'}/>
          <Btn v="danger" size="sm" onClick={()=>setDaysOff(p=>p.filter(x=>x.id!==d.id))}>x</Btn>
        </div>
      </Card>;})}
      <Divider/><Hdr>Libres esta semana</Hdr>
      {weekDates.map(d=>{
        const offDs=drivers.filter(u=>isOff(u.id,d,daysOff));
        return <div key={d} style={{marginBottom:8,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div style={{width:72,fontSize:12,color:d===TODAY?C.amber:C.mt,fontWeight:d===TODAY?600:400,flexShrink:0}}>{DAYS_ES[dowOf(d)]} {fmtD(d)}</div>
          {offDs.length===0?<span style={{fontSize:12,color:C.ht}}>Sin libres</span>:offDs.map(u=><Pill key={u.id} s="dayoff" label={u.name.split(' ')[0]}/>)}
        </div>;
      })}
    </div>}

    {tab==='reportes'&&<div>
      <Hdr>Reportes de drivers</Hdr>
      {reports.length===0?<Card style={{marginBottom:16}}><div style={{color:C.ht}}>Sin reportes</div></Card>
      :[...reports].reverse().map(r=>{const drv=users.find(u=>u.id===r.driverId);const rep=users.find(u=>u.id===r.reporterId);
        return <Card key={r.id} style={{marginBottom:10,borderLeft:`3px solid ${C.red}`}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><div style={{fontSize:14,fontWeight:500,color:C.tx}}>{drv?.name}</div><Pill s="rejected" label={r.cat}/></div>
          <div style={{fontSize:12,color:C.mt,marginBottom:r.detail?6:0}}>Por: {rep?.name} · {new Date(r.createdAt).toLocaleDateString('es')}</div>
          {r.detail&&<div style={{fontSize:13,color:C.tx,background:C.bg1,padding:'8px 10px',borderRadius:8}}>{r.detail}</div>}
        </Card>;})}
      <Divider/>
      <Hdr>Quejas de drivers</Hdr>
      {complaints.length===0?<Card><div style={{color:C.ht}}>Sin quejas</div></Card>
      :complaints.reverse().map(r=>{const from=users.find(u=>u.id===r.fromId);return <Card key={r.id} style={{marginBottom:10,borderLeft:`3px solid ${C.amber}`}}>
        <div style={{fontSize:13,fontWeight:500,color:C.tx,marginBottom:4}}>{from?.name}</div>
        <div style={{fontSize:12,color:C.mt,marginBottom:6}}>{r.date}</div>
        <div style={{fontSize:13,color:C.tx,background:C.bg1,padding:'8px 10px',borderRadius:8}}>{r.note}</div>
      </Card>;})}
    </div>}

    {tab==='notifs'&&<NotifPanel notifs={notifications} userId={me.id} onMarkRead={onMarkRead}/>}

    <Modal open={doModal} onClose={()=>setDoModal(false)} title="Configurar dia libre">
      <Fld label="Driver" value={doForm.userId} onChange={v=>setDoForm(f=>({...f,userId:v}))} options={[{v:'',l:'-- Seleccionar driver --'},...drivers.map(u=>({v:u.id,l:u.name}))]}/>
      <Fld label="Tipo" value={doForm.type} onChange={v=>setDoForm(f=>({...f,type:v}))} options={[{v:'single',l:'Dia puntual'},{v:'rotating',l:'Rotativo (semanal)'}]}/>
      {doForm.type==='single'&&<Fld label="Fecha" type="date" value={doForm.date} onChange={v=>setDoForm(f=>({...f,date:v}))}/>}
      {doForm.type==='rotating'&&<>
        <Fld label="Inicio del ciclo" type="date" value={doForm.startDate} onChange={v=>setDoForm(f=>({...f,startDate:v}))}/>
        <Fld label="Primer dia libre de la rotacion" value={doForm.startDay} onChange={v=>setDoForm(f=>({...f,startDay:v}))} options={DAYS.map(d=>({v:d,l:DAYS_ES[d]||d}))}/>
        <div style={{display:'flex',gap:16,marginBottom:14}}>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:14,color:C.tx}}><input type="checkbox" checked={doForm.inclSat} onChange={e=>setDoForm(f=>({...f,inclSat:e.target.checked}))}/> Incluir sabados</label>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:14,color:C.tx}}><input type="checkbox" checked={doForm.inclSun} onChange={e=>setDoForm(f=>({...f,inclSun:e.target.checked}))}/> Incluir domingos</label>
        </div>
      </>}
      <div style={{display:'flex',gap:10}}><Btn onClick={()=>setDoModal(false)} v="outline">Cancelar</Btn><Btn onClick={addDayOff} v="primary" full disabled={!doForm.userId}>Guardar</Btn></div>
    </Modal>
    <PinModal open={pinModal} onClose={()=>setPinModal(false)} user={me} onSave={pin=>onChangePin(me.id,pin)}/>
  </div>;
}

// ══ ADMIN VIEW ═════════════════════════════════════════════
function AdminView({me,users,updateUsers,daysOff,attendance,requests,reports,notifications,onMarkRead,onChangePin,onLogout}){
  const[tab,setTab]=useState('overview');
  const[pinModal,setPinModal]=useState(false);
  const[modal,setModal]=useState(null);
  const[eu,setEu]=useState(null);const[form,setForm]=useState({});
  const drivers=users.filter(u=>u.role==='driver');
  const getAtt=id=>attendance.find(a=>a.userId===id&&a.date===TODAY);
  const working=drivers.filter(u=>{const a=getAtt(u.id);return a?.clockIn&&!a?.clockOut;});
  const absent=drivers.filter(u=>!getAtt(u.id)?.clockIn&&!isOff(u.id,TODAY,daysOff));
  const unread=notifications.filter(n=>n.userId===me.id&&!n.read).length;

  function saveUser(){if(eu)updateUsers(p=>p.map(u=>u.id===eu.id?{...u,...form}:u));else updateUsers(p=>[...p,{id:uid(),role:'driver',pin:'1234',sucursalId:SUCS[0].id,shiftId:'m',...form}]);setModal(null);setEu(null);setForm({});}
  function openEdit(u){setEu(u);setForm({name:u.name,pin:u.pin,role:u.role,sucursalId:u.sucursalId,shiftId:u.shiftId});setModal('user');}
  function openNew(){setEu(null);setForm({name:'',pin:'1234',role:'driver',sucursalId:SUCS[0].id,shiftId:'m'});setModal('user');}

  return <div style={{maxWidth:700,margin:'0 auto',padding:20,minHeight:'100vh',background:C.bg0}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
      <div><div style={{fontSize:18,fontWeight:500,color:C.tx}}>Administracion</div><div style={{fontSize:13,color:C.mt}}>{me.name}</div></div>
      <div style={{display:'flex',gap:6}}>
        <Bell notifs={notifications} userId={me.id} onClick={()=>setTab('notifs')}/>
        <Btn v="outline" size="sm" onClick={()=>setPinModal(true)}>PIN</Btn>
        <Btn v="ghost" size="sm" onClick={onLogout}>Salir</Btn>
      </div>
    </div>
    <Tabs items={[{id:'overview',label:'Resumen'},{id:'users',label:'Usuarios'},{id:'horas',label:'Horas'},{id:'data',label:'Datos'},{id:'notifs',label:`Notif.${unread?` (${unread})`:''}`}]} active={tab} onChange={setTab}/>

    {tab==='overview'&&<div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:20}}>
        <Stat label="Trabajando ahora" value={working.length} v="green"/>
        <Stat label="Faltas hoy" value={absent.length} v="red"/>
        <Stat label="Solicitudes pend." value={requests.filter(r=>r.status==='pending').length} v="amber"/>
        <Stat label="Reportes" value={reports.length} v="red"/>
      </div>
      <Hdr>Sucursales hoy</Hdr>
      {SUCS.map(s=>{
        const cnt=drivers.filter(u=>u.sucursalId===s.id).length;
        const act=working.filter(u=>u.sucursalId===s.id).length;
        return <Card key={s.id} style={{marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:500,color:C.tx,marginBottom:8}}>{s.name}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            <Stat label="Total drivers" value={cnt}/>
            <Stat label="Activos" value={act} v="green"/>
            <Stat label="Faltas" value={cnt-act} v={cnt-act>0?'red':'neutral'}/>
          </div>
        </Card>;
      })}
      <Btn v="outline" size="sm" onClick={()=>exportCSV(attendance,users)} style={{marginTop:8}}>Exportar asistencia CSV</Btn>
    </div>}

    {tab==='users'&&<div>
      <Btn onClick={openNew} v="primary" style={{marginBottom:16}}>+ Agregar usuario</Btn>
      {Object.keys(RL).map(role=>{const us=users.filter(u=>u.role===role);if(!us.length)return null;
        return <div key={role} style={{marginBottom:20}}>
          <Hdr>{RL[role]}</Hdr>
          {us.map(u=>{const suc=SUCS.find(s=>s.id===u.sucursalId);const sh=SHIFTS.find(s=>s.id===u.shiftId);
            return <Card key={u.id} style={{marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
              <Av name={u.name} size={36}/>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:C.tx}}>{u.name}</div>
                <div style={{fontSize:12,color:C.mt,fontFamily:'var(--font-mono)'}}>PIN:{u.pin}{suc?` · ${suc.name.split(' ')[0]}`:''}{sh?` · ${sh.label}`:''}</div></div>
              <div style={{display:'flex',gap:8}}>
                <Btn v="outline" size="sm" onClick={()=>openEdit(u)}>Editar</Btn>
                {u.id!==me.id&&<Btn v="danger" size="sm" onClick={()=>updateUsers(p=>p.filter(x=>x.id!==u.id))}>x</Btn>}
              </div>
            </Card>;
          })}
        </div>;
      })}
    </div>}

    {tab==='horas'&&<HoursSummary users={users} attendance={attendance}/>}

    {tab==='data'&&<div>
      <Hdr>Solicitudes ({requests.length})</Hdr>
      {[...requests].reverse().slice(0,20).map(r=>{const f=users.find(u=>u.id===r.fromId);const t=r.toId?users.find(u=>u.id===r.toId):null;
        return <Card key={r.id} style={{marginBottom:6}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:13,fontWeight:500,color:C.tx}}>{REQ_T[r.type]}</span><Pill s={r.status} label={SL[r.status]||r.status}/></div>
          <div style={{fontSize:11,color:C.mt}}>{f?.name}{t?` → ${t.name}`:''} · {r.date}</div>
        </Card>;})}
      <Divider/>
      <Hdr>Reportes ({reports.length})</Hdr>
      {[...reports].reverse().map(r=>{const d=users.find(u=>u.id===r.driverId);const rep=users.find(u=>u.id===r.reporterId);
        return <Card key={r.id} style={{marginBottom:8,borderLeft:`3px solid ${C.red}`}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:13,fontWeight:500,color:C.tx}}>{d?.name}</span><Pill s="rejected" label={r.cat}/></div>
          <div style={{fontSize:11,color:C.mt}}>Por: {rep?.name} · {new Date(r.createdAt).toLocaleDateString('es')}</div>
          {r.detail&&<div style={{fontSize:12,color:C.tx,marginTop:4}}>{r.detail}</div>}
        </Card>;})}
    </div>}

    {tab==='notifs'&&<NotifPanel notifs={notifications} userId={me.id} onMarkRead={onMarkRead}/>}

    <Modal open={modal==='user'} onClose={()=>{setModal(null);setEu(null);setForm({});}} title={eu?'Editar usuario':'Nuevo usuario'}>
      <Fld label="Nombre" value={form.name||''} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Nombre Apellido"/>
      <Fld label="PIN" value={form.pin||''} onChange={v=>setForm(f=>({...f,pin:v}))} placeholder="0000"/>
      <Fld label="Rol" value={form.role||'driver'} onChange={v=>setForm(f=>({...f,role:v}))} options={Object.entries(RL).map(([v,l])=>({v,l}))}/>
      <Fld label="Sucursal" value={form.sucursalId||''} onChange={v=>setForm(f=>({...f,sucursalId:v}))} options={[{v:'',l:'Sin sucursal'},...SUCS.map(s=>({v:s.id,l:s.name}))]}/>
      <div style={{fontSize:12,color:C.ht,marginTop:-8,marginBottom:14}}>El turno lo asigna el Supervisor</div>
      <div style={{display:'flex',gap:10}}><Btn onClick={()=>setModal(null)} v="outline">Cancelar</Btn><Btn onClick={saveUser} v="primary" full disabled={!form.name}>Guardar</Btn></div>
    </Modal>
    <PinModal open={pinModal} onClose={()=>setPinModal(false)} user={me} onSave={pin=>onChangePin(me.id,pin)}/>
  </div>;
}

// ══ APP ══════════════════════════════════════════════════
export default function App(){
  const[ready,setReady]=useState(false);
  const[loadError,setLoadError]=useState(false);
  const[users,setUsers]=useState([]);
  const[daysOff,setDaysOffLocal]=useState([]);
  const[attendance,setAttLocal]=useState([]);
  const[requests,setReqLocal]=useState([]);
  const[reports,setRepLocal]=useState([]);
  const[notifs,setNotifLocal]=useState([]);
  const[notes,setNotesLocal]=useState([]);
  const[alerts,setAlertsLocal]=useState([]);
  const[locations,setLoc]=useState([]);
  const[me,setMe]=useState(null);

  // ── Load all data from Supabase ─────────────────────────
  useEffect(()=>{
    async function loadAll(){
      try{
        const[u,att,req,rep,notif,dof,nt,al,loc]=await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('attendance').select('*'),
          supabase.from('requests').select('*').order('created_at',{ascending:false}),
          supabase.from('reports').select('*').order('created_at',{ascending:false}),
          supabase.from('notifications').select('*').order('created_at',{ascending:false}),
          supabase.from('days_off').select('*'),
          supabase.from('notes').select('*').order('created_at',{ascending:false}),
          supabase.from('alerts').select('*'),
          supabase.from('locations').select('*'),
        ]);
        if(u.error)throw u.error;
        setUsers((u.data||[]).map(mapUser));
        setAttLocal((att.data||[]).map(mapAtt));
        setReqLocal((req.data||[]).map(mapReq));
        setRepLocal((rep.data||[]).map(mapRep));
        setNotifLocal((notif.data||[]).map(mapNotif));
        setDaysOffLocal((dof.data||[]).map(mapDO));
        setNotesLocal((nt.data||[]).map(mapNote));
        setAlertsLocal((al.data||[]).map(mapAlert));
        const dbLocs=(loc.data||[]).map(mapLoc);
        const locs=INIT_USERS.filter(u=>u.role==='driver').map(u=>{
          const ex=dbLocs.find(l=>l.userId===u.id);if(ex)return ex;
          const b=BASE_POS[u.id]||[-17.790,-63.190];
          return{userId:u.id,lat:b[0]+rnd(-0.003,0.003),lng:b[1]+rnd(-0.003,0.003),active:false};
        });
        setLoc(locs);
        setReady(true);
      }catch(e){console.error('Error cargando datos:',e);setLoadError(true);}
    }
    loadAll();
  },[]);

  // ── Real-time subscriptions ─────────────────────────────
  useEffect(()=>{
    if(!ready)return;
    const ch=supabase.channel('fleet-rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'attendance'},({new:n})=>
        setAttLocal(p=>[...p.filter(a=>a.id!==n.id),mapAtt(n)]))
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'attendance'},({new:n})=>
        setAttLocal(p=>p.map(a=>a.id===n.id?mapAtt(n):a)))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'requests'},({new:n})=>
        setReqLocal(p=>[mapReq(n),...p.filter(r=>r.id!==n.id)]))
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'requests'},({new:n})=>
        setReqLocal(p=>p.map(r=>r.id===n.id?mapReq(n):r)))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},({new:n})=>
        setNotifLocal(p=>[mapNotif(n),...p.filter(x=>x.id!==n.id)]))
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications'},({new:n})=>
        setNotifLocal(p=>p.map(x=>x.id===n.id?mapNotif(n):x)))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'reports'},({new:n})=>
        setRepLocal(p=>[mapRep(n),...p]))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'days_off'},({new:n})=>
        setDaysOffLocal(p=>[...p,mapDO(n)]))
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'days_off'},({old:o})=>
        setDaysOffLocal(p=>p.filter(d=>d.id!==o.id)))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notes'},({new:n})=>
        setNotesLocal(p=>[mapNote(n),...p]))
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'notes'},({old:o})=>
        setNotesLocal(p=>p.filter(n=>n.id!==o.id)))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'alerts'},({new:n})=>
        setAlertsLocal(p=>[...p,mapAlert(n)]))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'users'},({new:n})=>
        setUsers(p=>[...p.filter(u=>u.id!==n.id),mapUser(n)]))
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'users'},({new:n})=>{
        setUsers(p=>p.map(u=>u.id===n.id?mapUser(n):u));
        setMe(m=>m&&m.id===n.id?{...m,...mapUser(n)}:m);
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'users'},({old:o})=>
        setUsers(p=>p.filter(u=>u.id!==o.id)))
      .on('postgres_changes',{event:'UPSERT',schema:'public',table:'locations'},({new:n})=>
        setLoc(p=>p.map(l=>l.userId===n.user_id?mapLoc(n):l)))
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[ready]);

  // ── GPS tracking (driver only, real device) ─────────────
  useEffect(()=>{
    if(!ready||!me||me.role!=='driver')return;
    if(!navigator.geolocation)return;
    let last=0;
    const wid=navigator.geolocation.watchPosition(
      async pos=>{
        const now=Date.now();if(now-last<290000)return; // Max c/5 min
        last=now;
        const{latitude:lat,longitude:lng}=pos.coords;
        await supabase.from('locations').upsert({user_id:me.id,lat,lng,active:true,updated_at:nowISO()},{onConflict:'user_id'});
        setLoc(p=>p.map(l=>l.userId===me.id?{...l,lat,lng,timestamp:nowISO()}:l));
      },()=>{},{enableHighAccuracy:false,maximumAge:300000,timeout:60000}
    );
    return()=>navigator.geolocation.clearWatch(wid);
  },[ready,me]);

  // ── Simulate movement for demo (30s) ───────────────────
  useEffect(()=>{
    if(!ready)return;
    const iv=setInterval(()=>{
      setLoc(p=>p.map(l=>{
        if(!l.active)return l;
        const b=BASE_POS[l.userId];if(!b)return l;
        return{...l,lat:b[0]+rnd(-0.004,0.004),lng:b[1]+rnd(-0.004,0.004)};
      }));
    },30000);
    return()=>clearInterval(iv);
  },[ready]);

  // ── No-show alert check every 60s ───────────────────────
  useEffect(()=>{
    if(!ready)return;
    async function check(){
      const now=new Date();const curH=now.getHours()+now.getMinutes()/60;
      for(const u of users.filter(x=>x.role==='driver')){
        if(!u.shiftId||isOff(u.id,TODAY,daysOff))continue;
        const sh=SHIFTS.find(s=>s.id===u.shiftId);if(!sh)continue;
        const[h,m]=sh.start.split(':').map(Number);
        if(curH<h+(m+30)/60)continue;
        const hasClocked=attendance.some(a=>a.userId===u.id&&a.date===TODAY&&a.clockIn);
        const alerted=alerts.some(a=>a.driverId===u.id&&a.date===TODAY);
        if(!hasClocked&&!alerted){
          await supabase.from('alerts').insert({id:uid(),driver_id:u.id,date:TODAY});
          const notifyUsers=users.filter(x=>['despacho','aux_despacho','supervisor'].includes(x.role));
          await Promise.all(notifyUsers.map(x=>supabase.from('notifications').insert({
            id:uid(),user_id:x.id,msg:`Sin presentarse: ${u.name} - mas de 30min sin marcar entrada`,read:false
          })));
        }
      }
    }
    check();
    const iv=setInterval(check,60000);
    return()=>clearInterval(iv);
  },[ready,users,attendance,daysOff,alerts]);

  // ── Helpers ─────────────────────────────────────────────
  async function addNotif(userId,msg){
    await supabase.from('notifications').insert({id:uid(),user_id:userId,msg,read:false});
  }

  // ── Actions ─────────────────────────────────────────────
  async function handleClock(type,userId,sucursalId){
    if(type==='in'){
      if(attendance.find(a=>a.userId===userId&&a.date===TODAY))return;
      const user=users.find(u=>u.id===userId);
      const{late,min}=calcLate(nowISO(),user?.shiftId);
      await supabase.from('attendance').insert({
        id:uid(),user_id:userId,date:TODAY,sucursal_id:sucursalId,clock_in:nowISO(),late,late_min:min
      });
      await supabase.from('locations').upsert({user_id:userId,active:true,updated_at:nowISO()},{onConflict:'user_id'});
      setLoc(p=>p.map(l=>l.userId===userId?{...l,active:true}:l));
      if(late){
        const ns=users.filter(u=>['despacho','aux_despacho','supervisor'].includes(u.role));
        await Promise.all(ns.map(u=>addNotif(u.id,`${user?.name} marco entrada con ${min} min de tardanza`)));
      }
    }else{
      await supabase.from('attendance').update({clock_out:nowISO()}).eq('user_id',userId).eq('date',TODAY).is('clock_out',null);
      await supabase.from('locations').upsert({user_id:userId,active:false,updated_at:nowISO()},{onConflict:'user_id'});
      setLoc(p=>p.map(l=>l.userId===userId?{...l,active:false}:l));
    }
  }

  async function handleAddReq(req){
    await supabase.from('requests').insert({id:uid(),type:req.type,from_id:req.fromId,to_id:req.toId||null,sup_id:req.supId||null,date:req.date,note:req.note,time:req.time,status:'pending'});
    if(req.toId)await addNotif(req.toId,`${users.find(u=>u.id===req.fromId)?.name} te envio: ${REQ_T[req.type]}`);
    else if(req.supId)await addNotif(req.supId,`Nueva solicitud de ${users.find(u=>u.id===req.fromId)?.name}: ${REQ_T[req.type]}`);
    if(req.type==='relief'){
      await Promise.all(users.filter(u=>['despacho','aux_despacho','supervisor'].includes(u.role)).map(u=>
        addNotif(u.id,`Relevo solicitado por ${users.find(x=>x.id===req.fromId)?.name}`)
      ));
    }
  }

  async function handleApprove(id,status){
    await supabase.from('requests').update({status}).eq('id',id);
    const r=requests.find(x=>x.id===id);
    if(r)await addNotif(r.fromId,`Tu solicitud "${REQ_T[r.type]}" fue ${status==='approved'?'aprobada':'rechazada'}`);
  }

  async function handleAccept(id,status){
    await supabase.from('requests').update({status}).eq('id',id);
    const r=requests.find(x=>x.id===id);if(!r)return;
    const who=users.find(u=>u.id===me?.id);
    if(status==='target_accepted'){
      await addNotif(r.fromId,`${who?.name} acepto tu solicitud. Pendiente de supervisor.`);
      if(r.supId)await addNotif(r.supId,`Solicitud "${REQ_T[r.type]}" lista para aprobar.`);
    }else{
      await addNotif(r.fromId,`${who?.name} rechazo tu solicitud de "${REQ_T[r.type]}".`);
    }
  }

  async function handleAddReport(rp){
    await supabase.from('reports').insert({id:uid(),reporter_id:rp.reporterId,driver_id:rp.driverId,cat:rp.cat,detail:rp.detail});
    await Promise.all(users.filter(u=>u.role==='supervisor').map(u=>
      addNotif(u.id,`Reporte: ${users.find(x=>x.id===rp.driverId)?.name} - ${rp.cat}`)
    ));
  }

  async function handleMarkRead(userId){
    await supabase.from('notifications').update({read:true}).eq('user_id',userId).eq('read',false);
  }

  async function handleChangePin(userId,newPin){
    await supabase.from('users').update({pin:newPin}).eq('id',userId);
  }

  async function handleAddNote(note){
    await supabase.from('notes').insert({id:uid(),date:note.date,text:note.text,author_id:note.authorId});
  }

  async function handleDeleteNote(id){
    await supabase.from('notes').delete().eq('id',id);
  }

  const updateUsers=async(updater)=>{
    const next=typeof updater==='function'?updater(users):updater;
    const added=next.filter(u=>!users.find(p=>p.id===u.id));
    const deleted=users.filter(u=>!next.find(n=>n.id===u.id));
    const modified=next.filter(u=>{const p=users.find(p=>p.id===u.id);return p&&JSON.stringify(u)!==JSON.stringify(p);});
    for(const u of added)await supabase.from('users').insert({id:u.id,name:u.name,role:u.role,pin:u.pin,sucursal_id:u.sucursalId,shift_id:u.shiftId});
    for(const u of modified)await supabase.from('users').update({name:u.name,role:u.role,pin:u.pin,sucursal_id:u.sucursalId,shift_id:u.shiftId}).eq('id',u.id);
    for(const u of deleted)await supabase.from('users').delete().eq('id',u.id);
  };

  const setDaysOff=async(updater)=>{
    const next=typeof updater==='function'?updater(daysOff):updater;
    const added=next.filter(d=>!daysOff.find(p=>p.id===d.id));
    const deleted=daysOff.filter(d=>!next.find(n=>n.id===d.id));
    for(const d of added)await supabase.from('days_off').insert({id:d.id,user_id:d.userId,type:d.type,date:d.date||null,cfg:d.cfg||null});
    for(const d of deleted)await supabase.from('days_off').delete().eq('id',d.id);
  };

  // ── Render ───────────────────────────────────────────────
  if(loadError)return <div style={{minHeight:'100vh',background:C.bg0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:24}}>
    <div style={{fontSize:18,fontWeight:500,color:C.red}}>Error de conexion</div>
    <div style={{fontSize:14,color:C.mt,textAlign:'center',lineHeight:1.6}}>No se puede conectar con la base de datos.<br/>Verifica las credenciales en src/supabase.js</div>
    <Btn v="primary" onClick={()=>window.location.reload()}>Reintentar</Btn>
  </div>;

  if(!ready)return <div style={{minHeight:'100vh',background:C.bg0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10}}>
    <div style={{width:32,height:32,border:`3px solid ${C.amberBg}`,borderTopColor:C.amber,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    <div style={{fontSize:14,color:C.mt}}>Conectando al sistema...</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;

  if(!me)return <LoginView users={users} onLogin={setMe}/>;

  const shared={me,users,daysOff,attendance,requests,reports,notifications:notifs,locations,notes,alerts,
    onMarkRead:handleMarkRead,onChangePin:handleChangePin,onLogout:()=>setMe(null)};

  if(me.role==='admin')return <AdminView {...shared} updateUsers={updateUsers}/>;
  if(me.role==='supervisor')return <SupervisorView {...shared} setDaysOff={setDaysOff} onApprove={handleApprove} onAccept={handleAccept} onAddNote={handleAddNote} onDeleteNote={handleDeleteNote}/>;
  if(me.role==='despacho'||me.role==='aux_despacho')return <DespachoView {...shared} onApprove={handleApprove} onAddReport={handleAddReport} onAddNote={handleAddNote} onDeleteNote={handleDeleteNote}/>;
  return <DriverView {...shared} onClock={handleClock} onAddReq={handleAddReq} onAccept={handleAccept}/>;
}
