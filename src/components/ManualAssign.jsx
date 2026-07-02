import { useState, useEffect } from "react";
import { SLOTS, CITY_CLR, GENDER_CLR, BG, CARD, BORD, DIM, TXT, RED, GRN, inp, pbtn, TopBar, Spinner, flattenRooms, occupiedMap } from "../shared.jsx";
import { getRoster, getSelections, claimSlot, moveStudentToSlot, releaseStudentCityPick, subscribeToRoomChanges } from "../lib/db.js";

export function ManualAssign({trip,admin,onBack,onSaved}){
  const [roster,setRoster]=useState([]);
  const [selections,setSelections]=useState({});
  const [loading,setLoading]=useState(true);
  const [cityQ,setCityQ]=useState(trip.cities[0]);
  const [selStudent,setSS]=useState("");
  const [selRoom,setSR]=useState(null);
  const [msg,setMsg]=useState("");
  const [err,setErr]=useState("");

  const refresh = async () => {
    const [r,s] = await Promise.all([getRoster(trip.id), getSelections(trip.id)]);
    setRoster(r); setSelections(s); setLoading(false);
  };

  useEffect(()=>{
    let unsub;
    (async()=>{ await refresh(); unsub = subscribeToRoomChanges(trip.id, refresh); })();
    return () => { if(unsub) unsub(); };
  },[trip.id]);

  if(loading) return <div style={{minHeight:"100vh",background:BG}}><TopBar title="Manual Room Assignment" onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}/><Spinner label="Loading…"/></div>;

  const rooms = flattenRooms(trip.setup_data, trip.cities);
  const occ = occupiedMap(selections, trip.cities);
  const col = CITY_CLR[cityQ]||RED;
  const currentPick = selections[selStudent]?.cityPicks?.[cityQ]||null;
  const cityRooms = rooms[cityQ]||[];
  const byH={}; cityRooms.forEach(r=>{ if(!byH[r.hotelName]) byH[r.hotelName]=[]; byH[r.hotelName].push(r); });

  const assignedInCity = new Set(Object.values(selections).filter(s=>s.cityPicks?.[cityQ]).map(s=>s.name));
  const unassigned = roster.filter(s=>!assignedInCity.has(s.name));
  const allDone = unassigned.length===0;

  const handleSlotClick = (roomKey, slot) => {
    if(!selStudent){ setErr("Select a student first."); return; }
    const rOcc = (occ[cityQ]||{})[roomKey]||{};
    const occupant = rOcc[slot];
    if(occupant && occupant!==selStudent){ setErr(`Person ${slot} is already taken by ${occupant}.`); return; }
    setSR({key:roomKey,slot}); setErr("");
  };

  const handleSave = async () => {
    if(!selStudent||!selRoom) return;
    try{
      if(currentPick) await moveStudentToSlot(trip.id, cityQ, selStudent, selRoom.key, selRoom.slot);
      else await claimSlot(trip.id, cityQ, selRoom.key, selRoom.slot, selStudent);
      await refresh();
      setMsg(`✓ ${selStudent} placed in ${(rooms[cityQ]||[]).find(r=>r.key===selRoom.key)?.label} · Person ${selRoom.slot}`);
      setSR(null); setErr(""); onSaved?.();
    }catch(e){
      if(e.code==="SLOT_TAKEN"){ setErr("Someone just claimed that slot — pick another."); await refresh(); }
      else setErr("Could not save. Please try again.");
    }
  };

  const handleRemove = async () => {
    if(!selStudent||!currentPick) return;
    await releaseStudentCityPick(trip.id, cityQ, selStudent);
    await refresh();
    setMsg(`✓ ${selStudent} removed from ${cityQ} room.`);
    setSR(null); setErr(""); onSaved?.();
  };

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",display:"flex",flexDirection:"column"}}>
      <TopBar title="Manual Room Assignment" sub={trip.name} onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}/>
      <div style={{position:"sticky",top:0,zIndex:100,background:BG,borderBottom:`1px solid ${BORD}`}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"10px 20px"}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap",marginBottom:8}}>
            <div style={{flex:"0 0 auto",background:selStudent?`${col}22`:CARD,border:`1px solid ${selStudent?col:BORD}`,borderRadius:8,padding:"7px 14px",minWidth:200}}>
              {selStudent ? <><span style={{color:col,fontSize:13,fontWeight:600}}>{selStudent}</span><button onClick={()=>{setSS("");setSR(null);}} style={{background:"transparent",border:"none",color:DIM,cursor:"pointer",marginLeft:8}}>✕</button></>
                : <span style={{color:"#4A5568",fontSize:13}}>👤 Click a student name to select</span>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1}}>
              {trip.cities.map(c=>{ const cp=CITY_CLR[c]; return <button key={c} onClick={()=>{setCityQ(c);setSR(null);}} style={{padding:"7px 14px",borderRadius:20,border:`1px solid ${cityQ===c?cp:"#30363D"}`,background:cityQ===c?`${cp}22`:"transparent",color:cityQ===c?cp:DIM,fontSize:12,cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>; })}
            </div>
            {currentPick&&<button onClick={handleRemove} style={{...pbtn("#3A1A1A","#FF7B72","#FF7B72"),padding:"5px 12px",fontSize:11}}>✕ Remove</button>}
          </div>
          {selRoom&&(
            <div style={{background:"#1C2B3A",border:`1px solid ${col}`,borderRadius:8,overflow:"hidden",marginBottom:4,display:"flex"}}>
              <div style={{padding:"10px 16px",flex:1,color:TXT,fontSize:13}}>Move <strong>{selStudent}</strong> → <strong style={{color:col}}>{(rooms[cityQ]||[]).find(r=>r.key===selRoom.key)?.label}</strong> · Person {selRoom.slot}</div>
              <button onClick={()=>setSR(null)} style={{padding:"10px 20px",background:"transparent",border:"none",color:DIM,fontSize:13,cursor:"pointer"}}>✕ Keep Current</button>
              <button onClick={handleSave} style={{padding:"10px 24px",background:col,border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Confirm Move</button>
            </div>
          )}
          {msg&&<div style={{padding:"7px 12px",background:"#162318",borderRadius:6,color:GRN,fontSize:12,marginBottom:4}}>{msg}</div>}
          {err&&<div style={{padding:"7px 12px",background:"#3A1A1A",borderRadius:6,color:"#FF7B72",fontSize:12,marginBottom:4}}>{err}</div>}
          <div style={{borderRadius:8,border:`1px solid ${allDone?GRN:col}44`,overflow:"hidden",marginTop:4}}>
            <div style={{background:allDone?"#162318":`${col}11`,padding:"6px 14px",display:"flex",justifyContent:"space-between"}}>
              <span style={{color:allDone?GRN:col,fontSize:12,fontWeight:600}}>{allDone?`✅ All ${roster.length} assigned in ${cityQ}`:`⏳ ${unassigned.length} unassigned in ${cityQ}`}</span>
            </div>
            {!allDone&&<div style={{padding:"6px 14px",background:BG,display:"flex",flexWrap:"wrap",gap:5}}>
              {unassigned.map(s=><button key={s.name} onClick={()=>{setSS(s.name);setSR(null);}} style={{padding:"3px 10px",borderRadius:20,border:`1px solid ${selStudent===s.name?col:"#30363D"}`,background:selStudent===s.name?`${col}22`:"transparent",color:selStudent===s.name?col:DIM,fontSize:11,cursor:"pointer"}}>{s.name}</button>)}
            </div>}
          </div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"16px 20px 60px"}}>
          {Object.entries(byH).map(([hName,hRooms])=>(
            <div key={hName} style={{marginBottom:18}}>
              <div style={{background:`${col}11`,borderRadius:7,padding:"8px 12px",marginBottom:8,border:`1px solid ${col}33`}}><span style={{color:col,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>{hName}</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {hRooms.map(room=>{
                  const rOcc=(occ[cityQ]||{})[room.key]||{}; const filled=Object.keys(rOcc).length; const full=filled>=room.slots;
                  const isTargetRoom=selRoom?.key===room.key;
                  return (
                    <div key={room.key} style={{background:CARD,border:`2px solid ${isTargetRoom?col:full?GENDER_CLR[room.gender]||"#FF7B72":"#21262D"}`,borderRadius:9,padding:"8px 12px",display:"flex",alignItems:"stretch"}}>
                      <div style={{flex:"0 0 200px",padding:"6px 12px 6px 0",borderRight:`1px solid ${BORD}`,marginRight:10}}>
                        <div style={{color:full?GENDER_CLR[room.gender]||"#FF7B72":TXT,fontSize:11,fontWeight:600}}>{room.label}</div>
                        <div style={{color:DIM,fontSize:10,marginTop:3}}>{room.type} · <span style={{color:full?GENDER_CLR[room.gender]||"#FF7B72":GRN}}>{filled}/{room.slots} filled</span></div>
                      </div>
                      <div style={{display:"flex",gap:6,flex:1}}>
                        {SLOTS.slice(0,room.slots).map(slot=>{
                          const occupant=rOcc[slot]; const isMyTarget=selRoom?.key===room.key&&selRoom?.slot===slot;
                          const isCurrentStudentHere=occupant===selStudent; const takenByOther=occupant&&occupant!==selStudent;
                          const occupantColor=GENDER_CLR[roster.find(s=>s.name===occupant)?.gender]||"#FF7B72";
                          let bg,border,color,label,sublabel;
                          if(isMyTarget&&!occupant){bg="#1C2B3A";border=col;color=col;label=selStudent;sublabel=`P${slot}`;}
                          else if(isCurrentStudentHere){bg=`${col}22`;border=col;color=TXT;label=occupant;sublabel=`P${slot}`;}
                          else if(takenByOther){bg="#1C1010";border=`${occupantColor}66`;color=occupantColor;label=occupant;sublabel=`P${slot}`;}
                          else {bg="#0D1F12";border=GRN;color=GRN;label="Available";sublabel=`P${slot}`;}
                          return <button key={slot} onClick={()=>takenByOther?(setSS(occupant),setSR(null)):handleSlotClick(room.key,slot)}
                            style={{flex:1,background:bg,border:`2px solid ${border}`,borderRadius:6,padding:"6px 4px",cursor:"pointer"}}>
                            <div style={{color,fontSize:9}}>{sublabel}</div><div style={{color,fontSize:10,fontWeight:600}}>{label}</div>
                          </button>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
