import { useState } from "react";
import { ALL_CITIES, CITY_DATES_DEFAULT, CITY_CLR, BG, DIM, TXT, RED, inp, Card, Lbl, ErrBox, TopBar, NavRow } from "../shared.jsx";
import { createTrip } from "../lib/db.js";

export function CreateTrip({onDone,onBack}){
  const [name,setName]=useState("");
  const [year,setYear]=useState(new Date().getFullYear());
  const [cities,setCities]=useState([...ALL_CITIES]);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const finish=async()=>{
    if(!name.trim()){setErr("Enter a trip name.");return;}
    if(!cities.length){setErr("Select at least one city.");return;}
    setErr(""); setLoading(true);
    try{
      const trip = await createTrip({ name: name.trim(), year, cities });
      onDone(trip);
    }catch(e){ setErr("Could not create trip. " + (e.message||"")); setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif"}}>
      <TopBar title="Create New Trip" onBack={onBack} backLabel="Dashboard"/>
      <div style={{maxWidth:520,margin:"0 auto",padding:"28px 16px"}}>
        <Card>
          <div style={{color:TXT,fontSize:16,marginBottom:20,fontWeight:500}}>Trip Details</div>
          <Lbl>Trip Name</Lbl>
          <input style={{...inp,marginBottom:12}} placeholder="e.g. Italy Summer 2026" value={name} onChange={e=>setName(e.target.value)}/>
          <Lbl>Year</Lbl>
          <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
            {[2025,2026,2027,2028,2029].map(y=>(
              <button key={y} onClick={()=>setYear(y)} style={{padding:"8px 16px",borderRadius:6,border:`1px solid ${year===y?RED:"#30363D"}`,background:year===y?`${RED}33`:"transparent",color:year===y?TXT:DIM,fontSize:14,cursor:"pointer"}}>{y}</button>
            ))}
          </div>
          <Lbl>Destinations</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>
            {ALL_CITIES.map(c=>{ const sel=cities.includes(c); const cp=CITY_CLR[c]; return (
              <button key={c} onClick={()=>setCities(prev=>sel?prev.filter(x=>x!==c):[...prev,c])} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:8,border:`2px solid ${sel?cp:"#30363D"}`,background:sel?`${cp}22`:"transparent",cursor:"pointer",fontFamily:"'Georgia',serif",textAlign:"left"}}>
                <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${sel?cp:"#30363D"}`,background:sel?cp:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>{sel?"✓":""}</div>
                <div style={{color:sel?TXT:DIM,fontSize:15}}>{c}</div>
                <div style={{color:"#4A5568",fontSize:12,marginLeft:"auto"}}>{CITY_DATES_DEFAULT[c]}</div>
              </button>
            );})}
          </div>
          <ErrBox msg={err}/>
          <NavRow onBack={onBack} backLabel="Dashboard" onNext={finish} nextLabel={loading?"Creating…":"Create Trip →"} nextDisabled={loading}/>
        </Card>
      </div>
    </div>
  );
}
