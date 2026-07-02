// ============================================================================
// StudentRoomFlow — THE MOST IMPORTANT COMPONENT.
// This is where students pick rooms, and where the concurrency safety
// actually has to hold up under real pressure (many students at once).
//
// Key behaviors:
// - claimSlot() is atomic at the database level (unique constraint) — two
//   students can never end up with the same slot, even if they tap at the
//   exact same millisecond.
// - subscribeToRoomChanges() means every student's screen updates live when
//   ANYONE claims or releases a slot — no manual refresh needed.
// - If a claim fails because someone beat you to it, the student sees a
//   clear "that slot was just taken" message and the board refreshes.
// ============================================================================
import { useState, useEffect } from "react";
import { SLOTS, CITY_CLR, BG, CARD, BORD, DIM, TXT, RED, GRN, pbtn, TopBar, Spinner, getCityDateLabel } from "../shared.jsx";
import { getSelections, claimSlot, moveStudentToSlot, releaseStudentCityPick, subscribeToRoomChanges } from "../lib/db.js";

export function StudentRoomFlow({student,trip,rooms,onDone}){
  const [step,setStep]=useState("overview");
  const [cityQ,setCityQ]=useState(0);
  const [picks,setPicks]=useState({});       // current confirmed picks for this student, all cities
  const [occ,setOcc]=useState({});           // live occupancy map for the whole trip
  const [loading,setLoading]=useState(true);
  const [pending,setPending]=useState(null); // { key, slot } — tapped but not yet confirmed
  const [err,setErr]=useState("");
  const [saving,setSaving]=useState(false);

  const currentCity = trip.cities[cityQ];
  const col = CITY_CLR[currentCity] || RED;

  // Load all selections once, then subscribe to live changes
  const refreshSelections = async () => {
    const sel = await getSelections(trip.id);
    const myPicks = sel[student.name]?.cityPicks || {};
    setPicks(myPicks);
    // Build occupancy map: { city: { roomKey: { slot: name } } }
    const m = {}; trip.cities.forEach(c=>m[c]={});
    Object.values(sel).forEach(({cityPicks})=>{
      Object.entries(cityPicks||{}).forEach(([city,pick])=>{
        if(!pick?.key) return;
        if(!m[city][pick.key]) m[city][pick.key]={};
        m[city][pick.key][pick.slot]=pick.name;
      });
    });
    setOcc(m);
  };

  useEffect(()=>{
    let unsub;
    (async()=>{
      await refreshSelections();
      setLoading(false);
      // Live updates: whenever ANY row changes in room_selections for this trip,
      // refresh so this student sees other students' picks in near real-time.
      unsub = subscribeToRoomChanges(trip.id, () => { refreshSelections(); });
    })();
    return () => { if(unsub) unsub(); };
  },[trip.id]);

  const allDone = trip.cities.every(c=>picks[c]);

  // ── OVERVIEW ──────────────────────────────────────────────────────────────
  if(step==="overview"){
    if(loading) return <Spinner label="Loading your room selections…"/>;
    return (
      <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:40}}>
        <TopBar title="My Room Selections" sub={student.name} onBack={onDone} backLabel="Sign Out"/>
        <div style={{maxWidth:600,margin:"0 auto",padding:"24px 16px"}}>
          <div style={{background:allDone?"#162318":"#1C1C1C",border:`1px solid ${allDone?GRN:"#4A5568"}`,borderRadius:10,padding:"14px 18px",marginBottom:20}}>
            <div style={{color:allDone?GRN:"#4A5568",fontSize:13,fontWeight:600}}>{allDone?"✅ All rooms selected — you can still edit any selection below.":"⏳ Select a room for each destination below."}</div>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:20}}>
            {trip.cities.map(c=><div key={c} style={{flex:1,height:5,borderRadius:3,background:picks[c]?CITY_CLR[c]:BORD}}/>)}
          </div>
          {trip.cities.map((city,i)=>{
            const p=picks[city];
            const rm=p?(rooms[city]||[]).find(r=>r.key===p.key):null;
            const cp=CITY_CLR[city];
            return (
              <div key={city} style={{background:CARD,borderRadius:10,border:`1px solid ${p?cp:BORD}`,padding:"16px 18px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:p?10:0}}>
                  <div>
                    <div style={{color:cp,fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:2}}>Destination #{i+1} · {getCityDateLabel(trip,city)}</div>
                    <div style={{color:TXT,fontSize:16}}>{city}</div>
                  </div>
                  <button onClick={()=>{setCityQ(i);setPending(null);setErr("");setStep("pick");}} style={{...pbtn(p?`${cp}22`:`${RED}22`,p?cp:RED,p?cp:RED),padding:"6px 14px",fontSize:12}}>{p?"✏️ Edit":"Select Room →"}</button>
                </div>
                {rm&&<div style={{background:BG,borderRadius:6,padding:"10px 12px",border:`1px solid ${BORD}`}}>
                  <div style={{color:TXT,fontSize:13,fontWeight:500}}>{rm.label}</div>
                  <div style={{color:DIM,fontSize:12,marginTop:2}}>{rm.hotelName} · Person {p.slot}</div>
                </div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── PICK ──────────────────────────────────────────────────────────────────
  const cityRooms = (rooms[currentCity]||[]).filter(r=>r.gender===student.gender);
  const cityOcc = occ[currentCity]||{};
  const byH={}; cityRooms.forEach(r=>{ if(!byH[r.hotelName]) byH[r.hotelName]=[]; byH[r.hotelName].push(r); });
  const confirmed = picks[currentCity];

  const handleSlotTap = async (roomKey, slot) => {
    if(confirmed?.key===roomKey && confirmed?.slot===slot){
      // Tapping own confirmed slot → release it immediately
      setSaving(true); setErr("");
      try{
        await releaseStudentCityPick(trip.id, currentCity, student.name);
        await refreshSelections();
        setPending(null);
        setErr("Your room has been released. Tap any available slot to choose a new one.");
      }catch(e){ setErr("Could not release the slot. Please try again."); }
      setSaving(false);
      return;
    }
    if(pending?.key===roomKey && pending?.slot===slot){ setPending(null); setErr(""); return; }
    setPending({key:roomKey, slot}); setErr("");
  };

  const handleConfirm = async () => {
    if(!pending){ setErr("Tap an available slot first."); return; }
    setSaving(true); setErr("");
    try{
      if(confirmed){
        // Atomic move: release old + claim new in one transaction
        await moveStudentToSlot(trip.id, currentCity, student.name, pending.key, pending.slot);
      } else {
        await claimSlot(trip.id, currentCity, pending.key, pending.slot, student.name);
      }
      await refreshSelections();
      setPending(null);
      setStep("overview");
    }catch(e){
      if(e.code==="SLOT_TAKEN"){
        setErr("Sorry — someone else just claimed that slot. Pick another one below.");
        await refreshSelections(); // show the real current state
      } else {
        setErr("Something went wrong saving your selection. Please try again.");
      }
    }
    setSaving(false);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:100}}>
      <TopBar title={`${currentCity} — Select Your Room`} onBack={()=>{setPending(null);setStep("overview");}} backLabel="Overview"/>
      <div style={{maxWidth:860,margin:"0 auto",padding:"16px 16px"}}>
        <div style={{background:`${col}22`,border:`1px solid ${col}44`,borderRadius:10,padding:"12px 16px",marginBottom:16}}>
          <div style={{color:col,fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase"}}>Destination #{cityQ+1} of {trip.cities.length} · {getCityDateLabel(trip,currentCity)}</div>
          <div style={{color:TXT,fontSize:18}}>{currentCity}</div>
        </div>

        {pending&&confirmed&&<div style={{padding:"10px 14px",background:"#2A2200",border:"1px solid #FFD700",borderRadius:8,color:"#FFD700",fontSize:13,marginBottom:14}}>✏️ Switching room — Tap Confirm to save.</div>}
        {pending&&!confirmed&&<div style={{padding:"10px 14px",background:"#2A2200",border:"1px solid #FFD700",borderRadius:8,color:"#FFD700",fontSize:13,marginBottom:14}}>⏳ Tap Confirm below to lock this in.</div>}
        {confirmed&&!pending&&<div style={{padding:"10px 14px",background:"#162318",border:`1px solid ${col}`,borderRadius:8,color:GRN,fontSize:13,marginBottom:14}}>✅ Confirmed — tap a different slot to switch, or tap your name to release.</div>}
        {err&&<div style={{padding:"10px 14px",background:"#3A1A1A",borderRadius:8,color:"#FF7B72",fontSize:13,marginBottom:14}}>{err}</div>}

        {Object.entries(byH).map(([hName,hRooms])=>(
          <div key={hName} style={{marginBottom:24}}>
            <div style={{background:`${col}11`,borderRadius:8,padding:"10px 14px",marginBottom:10,border:`1px solid ${col}33`}}>
              <div style={{color:col,fontSize:12,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>{hName}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {hRooms.map(room=>{
                const rOcc = cityOcc[room.key]||{};
                const filled = Object.keys(rOcc).length;
                const full = filled>=room.slots;
                const isMyRoom = confirmed?.key===room.key;
                return (
                  <div key={room.key} style={{background:CARD,border:`1px solid ${isMyRoom?col:full?"#2A1A1A":BORD}`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",opacity:full&&!isMyRoom?0.55:1}}>
                    <div style={{minWidth:0,flex:"0 0 auto",maxWidth:220}}>
                      <div style={{color:full&&!isMyRoom?"#FF7B72":TXT,fontSize:12,fontWeight:600,lineHeight:1.3}}>{room.label}</div>
                      <div style={{color:DIM,fontSize:11,marginTop:3}}>{room.type} · {filled}/{room.slots} filled</div>
                    </div>
                    <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap"}}>
                      {SLOTS.slice(0,room.slots).map(slot=>{
                        const occupant=rOcc[slot];
                        const isConfirmedMe = confirmed?.key===room.key && confirmed?.slot===slot;
                        const isPendingMe = pending?.key===room.key && pending?.slot===slot;
                        const takenByOther = occupant && occupant!==student.name;
                        let bg,border,color,label,sublabel;
                        if(isConfirmedMe){ bg=`${col}33`; border=col; color=TXT; label=student.name; sublabel=`Person ${slot} · tap to release`; }
                        else if(isPendingMe){ bg="#2A2200"; border="#FFD700"; color="#FFD700"; label=student.name; sublabel=`Person ${slot} · unconfirmed`; }
                        else if(takenByOther){ bg="#1C1010"; border="#3A1A1A"; color="#FF7B72"; label=occupant; sublabel=`Person ${slot} · taken`; }
                        else { bg="#162318"; border=GRN; color=GRN; label="Available"; sublabel=`Person ${slot}`; }
                        return (
                          <button key={slot} disabled={takenByOther||saving} onClick={()=>handleSlotTap(room.key,slot)}
                            style={{flex:"1 1 120px",minWidth:110,maxWidth:180,background:bg,border:`2px solid ${border}`,borderRadius:8,padding:"10px 10px",cursor:takenByOther?"default":"pointer",fontFamily:"'Georgia',serif",textAlign:"center"}}>
                            <div style={{color,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>{sublabel}</div>
                            <div style={{color,fontSize:12,fontWeight:600,wordBreak:"break-word"}}>{label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:CARD,borderTop:`1px solid ${BORD}`,padding:"14px 20px"}}>
        {pending?(
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setPending(null)} disabled={saving} style={{flex:1,...pbtn("transparent",DIM,"#30363D"),padding:13}}>✕ Cancel</button>
            <button onClick={handleConfirm} disabled={saving} style={{flex:2,...pbtn(col,"#fff"),border:"none",padding:13,fontSize:15}}>{saving?"Saving…":`✓ Confirm — Person ${pending.slot}`}</button>
          </div>
        ):(
          <button onClick={()=>{ if(confirmed) setStep("overview"); }} style={{width:"100%",...pbtn(confirmed?col:"#21262D",confirmed?TXT:DIM),border:"none",padding:13,fontSize:15}}>
            {confirmed?"✅ Room confirmed — tap to return to overview":"Tap an available slot above to select it"}
          </button>
        )}
      </div>
    </div>
  );
}
