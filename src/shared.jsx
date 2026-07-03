// ============================================================================
// Shared constants, colors, and small UI building-block components.
// These have no storage logic, so they're unchanged from the original app.
// ============================================================================
import { useState } from "react";

export const ALL_CITIES = ["Rome","Sulmona","Chieti","Florence","Venice"];
export const CITY_DATES_DEFAULT = { Rome:"July 04–07", Sulmona:"July 07–15", Chieti:"July 15–19", Florence:"July 19–22", Venice:"July 22–25" };
export const ROOM_TYPES = ["Quintuple","Quad","Triple","Double","Single"];
export const ROOM_SIZES = { Single:1, Double:2, Triple:3, Quad:4, Quintuple:5 };
export const SLOTS = ["A","B","C","D","E"];
export const CITY_CLR = { Rome:"#C0392B", Sulmona:"#2471A3", Chieti:"#1E8449", Florence:"#B7770D", Venice:"#1A6B8A" };
export const GENDER_CLR = { F:"#FF7B72", M:"#42A5F5" };

export const BG="#0D1117",CARD="#161B22",BORD="#21262D",DIM="#8A9BB0",TXT="#F0E6D3",RED="#C0392B",GRN="#3FB950";
export const inp = {width:"100%",boxSizing:"border-box",background:BG,color:TXT,border:`1px solid #30363D`,borderRadius:6,padding:"11px 14px",fontSize:15,fontFamily:"'Georgia',serif",outline:"none"};
export const pbtn = (bg,fg,bd) => ({padding:"10px 18px",borderRadius:7,border:bd?`1px solid ${bd}`:"none",background:bg,color:fg,fontSize:14,cursor:"pointer",fontFamily:"'Georgia',serif",transition:"all 0.15s"});

export function getCityDateLabel(trip, city){
  const d = trip?.cityDates?.[city];
  if(d?.start && d?.end){
    const fmt=(iso)=>{ const dt=new Date(iso+"T00:00:00"); return dt.toLocaleDateString("en-US",{month:"long",day:"2-digit"}); };
    return `${fmt(d.start)} – ${fmt(d.end)}`;
  }
  return CITY_DATES_DEFAULT[city] || "";
}

export function flattenRooms(setupData, cities){
  const out={};
  (cities||ALL_CITIES).forEach(city=>{
    out[city]=[];
    let fDisp=0,mDisp=0;
    (setupData?.[city]?.hotels||[]).forEach((h,hi)=>{
      let fNum=0,mNum=0;
      (h.femaleRooms||[]).forEach(r=>{ fNum++; fDisp++; out[city].push({key:`h${hi}_f${fNum}`,hotelName:h.name,abbr:h.abbr,gender:"F",type:r.type,slots:ROOM_SIZES[r.type],roomNum:fDisp,label:`${h.abbr} - Female ROOM # ${String(fDisp).padStart(2,"0")} / ${r.type}`}); });
      (h.maleRooms||[]).forEach(r=>{ mNum++; mDisp++; out[city].push({key:`h${hi}_m${mNum}`,hotelName:h.name,abbr:h.abbr,gender:"M",type:r.type,slots:ROOM_SIZES[r.type],roomNum:mDisp,label:`${h.abbr} - Male ROOM # ${String(mDisp).padStart(2,"0")} / ${r.type}`}); });
    });
  });
  return out;
}

export function expandRooms(typeCounts){
  const rooms=[];
  ROOM_TYPES.forEach(t=>{ const n=parseInt(typeCounts?.[t])||0; for(let i=0;i<n;i++) rooms.push({type:t}); });
  return rooms;
}

// Build the {city: {roomKey: {slot: studentName}}} occupancy map from the
// flat selections object returned by getSelections() in db.js
export function occupiedMap(selections, cities){
  const m={};
  (cities||ALL_CITIES).forEach(c=>(m[c]={}));
  Object.values(selections||{}).forEach(({cityPicks})=>{
    Object.entries(cityPicks||{}).forEach(([city,pick])=>{
      if(!pick||!pick.key) return;
      const {key,slot,name}=pick;
      if(!m[city]) m[city]={};
      if(!m[city][key]) m[city][key]={};
      m[city][key][slot]=name||"";
    });
  });
  return m;
}

export function Card({children,style}){ return <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORD}`,padding:24,...style}}>{children}</div>; }
export function Lbl({children}){ return <div style={{fontSize:10,letterSpacing:"0.18em",color:DIM,textTransform:"uppercase",marginBottom:6}}>{children}</div>; }
export function ErrBox({msg}){ return msg?<div style={{padding:"10px 14px",background:"#3A1A1A",borderRadius:6,color:"#FF7B72",fontSize:13,marginTop:10}}>{msg}</div>:null; }
export function OkBox({msg}){ return msg?<div style={{padding:"10px 14px",background:"#162318",borderRadius:6,color:GRN,fontSize:13,marginTop:10}}>{msg}</div>:null; }
export function Dot({label,active,accent}){ return <div style={{width:20,height:20,borderRadius:"50%",background:active?accent:"#21262D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:active?"#fff":DIM,flexShrink:0}}>{label}</div>; }

export function ConfirmModal({title,message,confirmLabel,confirmColor,onConfirm,onCancel}){
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:24,fontFamily:"'Georgia',serif"}}>
      <div style={{background:"#1C2128",border:"1px solid #30363D",borderRadius:12,padding:28,maxWidth:420,width:"100%",boxShadow:"0 24px 48px rgba(0,0,0,0.5)"}}>
        <div style={{color:TXT,fontSize:17,fontWeight:600,marginBottom:8}}>{title}</div>
        <div style={{color:DIM,fontSize:14,lineHeight:1.6,marginBottom:24,whiteSpace:"pre-line"}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,...pbtn("transparent",DIM,"#30363D"),padding:11}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:2,...pbtn(confirmColor||RED,"#fff"),border:"none",padding:11,fontSize:15}}>{confirmLabel||"Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

export function STitle({children,color}){ return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><div style={{width:3,height:20,background:color||RED,borderRadius:2}}/><span style={{color:color||RED,fontSize:13,letterSpacing:"0.12em",textTransform:"uppercase"}}>{children}</span></div>; }

export function TopBar({title,sub,onBack,backLabel,right,adminName}){
  return (
    <div style={{background:CARD,borderBottom:`1px solid ${BORD}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
      {onBack&&<button onClick={onBack} style={{...pbtn("transparent",DIM,"#30363D"),padding:"5px 12px",fontSize:13,flexShrink:0}}>← {backLabel||"Back"}</button>}
      <div style={{flex:1}}>
        <div style={{fontSize:10,letterSpacing:"0.2em",color:DIM,textTransform:"uppercase"}}>NCDSB · Hamilton Dante · Italy Trip</div>
        <div style={{fontSize:17,color:TXT}}>{title}{sub&&<span style={{color:DIM,fontSize:13,marginLeft:8}}>{sub}</span>}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        {adminName&&<span style={{color:DIM,fontSize:13}}>{adminName}</span>}
        {right}
      </div>
    </div>
  );
}

export function NavRow({onBack,backLabel,onNext,nextLabel,nextDisabled,nextColor}){
  const nc=nextColor||RED;
  return (
    <div style={{display:"flex",gap:10,marginTop:22}}>
      {onBack&&<button onClick={onBack} style={{flex:1,...pbtn("transparent",DIM,"#30363D")}}>← {backLabel||"Back"}</button>}
      {onNext&&<button onClick={onNext} disabled={!!nextDisabled} style={{flex:2,...pbtn(nextDisabled?"#21262D":nc,nextDisabled?DIM:"#fff"),cursor:nextDisabled?"not-allowed":"pointer"}}>{nextLabel||"Next →"}</button>}
    </div>
  );
}

export function NumPicker({value,onChange,max=50,accent}){
  return (
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
      {[0,...Array.from({length:max},(_,i)=>i+1)].map(n=>(
        <button key={n} onClick={()=>onChange(n)} style={{padding:"5px 9px",borderRadius:5,border:`1px solid ${value===n?(accent||RED):"#30363D"}`,background:value===n?`${(accent||RED)}33`:"transparent",color:value===n?TXT:DIM,fontSize:12,cursor:"pointer"}}>{n}</button>
      ))}
    </div>
  );
}

export function CityProg({cities,cityIdx,isCityDone,onJump}){
  return (
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
      {cities.map((c,i)=>{ const done=isCityDone(c); const active=i===cityIdx; const cp=CITY_CLR[c];
        return <button key={c} onClick={()=>onJump(i)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${active?cp:done?cp:"#30363D"}`,background:active?`${cp}22`:done?`${cp}11`:"transparent",color:done||active?cp:DIM,fontSize:12,cursor:"pointer",fontFamily:"'Georgia',serif"}}>{done?"✓ ":""}{c}</button>; })}
    </div>
  );
}

// Loading spinner — used everywhere we await a database call
export function Spinner({label}){
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",color:DIM}}>
      <div style={{width:32,height:32,border:`3px solid ${BORD}`,borderTopColor:RED,borderRadius:"50%",animation:"spin 0.8s linear infinite",marginBottom:12}}/>
      <div style={{fontSize:13}}>{label||"Loading…"}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
