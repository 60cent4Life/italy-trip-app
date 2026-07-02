// ============================================================================
// SetupWizard — roster upload, travel-app prompt step removed (per app history),
// and the multi-step hotel/room configuration flow.
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { ROOM_TYPES, ROOM_SIZES, SLOTS, CITY_CLR, BG, CARD, BORD, DIM, TXT, RED, GRN, inp, pbtn,
  Card, Lbl, ErrBox, OkBox, TopBar, NavRow, NumPicker, CityProg, getCityDateLabel, expandRooms } from "../shared.jsx";
import { upsertRoster, getRoster, updateTripSetupData, updateTripCityDates } from "../lib/db.js";
import { parsePastedRoster } from "../lib/parsePastedRoster.js";

export function SetupWizard({trip,admin,onDone,onBack,onUpdateTrip}){
  const [roster,setRoster]=useState([]);
  const [setupData,setSetupData]=useState(trip.setup_data||{});
  const [cityDates,setCityDates]=useState(trip.cityDates||trip.city_dates||{});
  const [step,setStep]=useState("loading");
  const [cityIdx,setCityIdx]=useState(0);
  const [hotelIdx,setHotelIdx]=useState(0);
  const [hotelCount,setHotelCount]=useState(1);
  const [drag,setDrag]=useState(false);
  const [pasteMode,setPasteMode]=useState(false);
  const [pasteText,setPasteText]=useState("");
  const [rLoad,setRL]=useState(false);
  const [err,setErr]=useState("");
  const [expF,setExpF]=useState("");
  const [expM,setExpM]=useState("");
  const [editMode,setEditMode]=useState(false);
  const [evictedList,setEvictedList]=useState([]);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    getRoster(trip.id).then(r=>{ setRoster(r); setStep(r.length?"city_select":"roster"); });
  },[trip.id]);

  const city = trip.cities[cityIdx];
  const col = city?CITY_CLR[city]:"#888";
  const hotels = setupData[city]?.hotels||[];
  const hotel = hotels[hotelIdx];

  // Persist setup_data to Supabase
  const persist = async (ns) => {
    setSaving(true);
    try{ await updateTripSetupData(trip.id, ns||setupData); }catch(e){ console.error(e); }
    setSaving(false);
  };

  const updHotel = (ci,hi,patch) => {
    setSetupData(prev=>{ const h=[...(prev[ci]?.hotels||[])]; h[hi]={...h[hi],...patch}; return {...prev,[ci]:{...(prev[ci]||{}),hotels:h}}; });
  };

  const isCityDone = useCallback((c)=>{
    const hs=setupData[c]?.hotels||[];
    return hs.length>0 && hs.every(h=>h.name&&h.abbr&&h.gender&&h._done);
  },[setupData]);

  const allCitiesDone = trip.cities.every(isCityDone);

  // ── ROSTER PARSING (file upload) ──────────────────────────────────────────
  const parseRoster = async (file) => {
    setRL(true); setErr("");
    try{
      const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});
      const sn=wb.SheetNames.find(n=>/student|roster|name/i.test(n))||wb.SheetNames[0];
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:""});
      const students=rows.map(row=>{
        const ks=Object.keys(row);
        const lk=ks.find(k=>/last.?name/i.test(k))||ks.find(k=>/^last$/i.test(k));
        const fk=ks.find(k=>/first.?name/i.test(k))||ks.find(k=>/^first$/i.test(k));
        const nk=ks.find(k=>/student.?list/i.test(k))||ks.find(k=>/^name$/i.test(k))||ks.find(k=>/name/i.test(k));
        const gk=ks.find(k=>/gender|sex/i.test(k)); const ek=ks.find(k=>/email/i.test(k));
        const pk=ks.find(k=>/passport/i.test(k)); const ak=ks.find(k=>/allerg/i.test(k));
        const dk=ks.find(k=>/birth|dob/i.test(k));
        let name="";
        if(lk&&fk){ const l=String(row[lk]||"").trim(),f=String(row[fk]||"").trim(); if(l&&f) name=`${l}, ${f}`; }
        if(!name&&nk) name=String(row[nk]||"").trim();
        if(!name) return null;
        const gv=gk?String(row[gk]||"").trim():"";
        return {name,gender:(gv||"M").toUpperCase()[0]==="F"?"F":"M",email:ek?String(row[ek]||"").trim():"",
          passport:pk?String(row[pk]||"").trim():"",allergies:ak?String(row[ak]||"").trim():"",dob:dk?String(row[dk]||"").trim():""};
      }).filter(Boolean);
      if(!students.length) throw new Error("No students found.");
      await upsertRoster(trip.id, students);
      setRoster(students); setStep("city_select");
    }catch(e){ setErr(e.message); }
    setRL(false);
  };

  const handlePasteImport = async () => {
    setErr("");
    const result = parsePastedRoster(pasteText);
    if(result.error){ setErr(result.error); return; }
    await upsertRoster(trip.id, result.students);
    setRoster(result.students);
    setStep("city_select");
  };

  const afterRoomCounts = () => {
    if(hotelIdx+1<hotels.length){ setHotelIdx(hotelIdx+1); setStep("hotel_name"); }
    else setStep("city_summary");
  };

  const afterSummary = async () => {
    await persist(setupData);
    if(cityIdx+1<trip.cities.length){ setCityIdx(cityIdx+1); setHotelIdx(0); setStep("city_select"); }
    else { await persist(setupData); onDone(); }
  };

  const citySummaryData = () => {
    const hs=setupData[city]?.hotels||[];
    let totalF=0,totalM=0; const byType={};
    hs.forEach(h=>{
      (h.femaleRooms||[]).forEach(r=>{totalF+=ROOM_SIZES[r.type];byType[r.type]=(byType[r.type]||0)+1;});
      (h.maleRooms||[]).forEach(r=>{totalM+=ROOM_SIZES[r.type];byType[r.type]=(byType[r.type]||0)+1;});
    });
    return {hotels:hs,totalF,totalM,byType};
  };

  if(step==="loading") return <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",color:DIM,fontFamily:"'Georgia',serif"}}>Loading…</div>;

  // ── ROSTER STEP ────────────────────────────────────────────────────────────
  if(step==="roster") return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif"}}>
      <TopBar title="Setup — Roster" onBack={onBack} backLabel="Trip" adminName={admin?.username}/>
      <div style={{maxWidth:520,margin:"0 auto",padding:"28px 16px"}}>
        <Card>
          <div style={{color:TXT,fontSize:16,marginBottom:4,fontWeight:500}}>Upload Student Roster</div>
          <div style={{color:DIM,fontSize:13,marginBottom:12,lineHeight:1.6}}>
            <strong style={{color:TXT}}>Minimum required:</strong> Two columns — <strong style={{color:TXT}}>LAST</strong> and <strong style={{color:TXT}}>FIRST</strong>.
          </div>
          <div style={{background:"#1C2128",borderRadius:7,padding:"10px 14px",marginBottom:16,fontSize:12,color:DIM,lineHeight:1.7}}>
            <strong style={{color:TXT}}>Optional extra columns:</strong> Gender · Date of Birth · Passport # · Allergies · Email
          </div>
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            <button onClick={()=>setPasteMode(false)} style={{flex:1,padding:"8px",borderRadius:7,border:`1px solid ${!pasteMode?RED:"#30363D"}`,background:!pasteMode?`${RED}22`:"transparent",color:!pasteMode?TXT:DIM,fontSize:13,cursor:"pointer",fontFamily:"'Georgia',serif"}}>📂 Upload File</button>
            <button onClick={()=>setPasteMode(true)} style={{flex:1,padding:"8px",borderRadius:7,border:`1px solid ${pasteMode?RED:"#30363D"}`,background:pasteMode?`${RED}22`:"transparent",color:pasteMode?TXT:DIM,fontSize:13,cursor:"pointer",fontFamily:"'Georgia',serif"}}>📋 Paste from Excel</button>
          </div>
          {!pasteMode ? (
            <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)parseRoster(f);}}
              onClick={()=>document.getElementById("rfw").click()}
              style={{border:`2px dashed ${drag?RED:"#30363D"}`,borderRadius:8,padding:"28px 24px",textAlign:"center",cursor:"pointer",background:drag?"#1C2128":"transparent",marginBottom:14}}>
              <div style={{fontSize:26,marginBottom:6}}>📂</div>
              <div style={{color:TXT,fontSize:14}}>{rLoad?"Reading…":"Drop .xlsx here or click to browse"}</div>
              <input id="rfw" type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files[0])parseRoster(e.target.files[0]);}}/>
            </div>
          ) : (
            <div style={{marginBottom:14}}>
              <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder={"Paste here — e.g.:\nAgresta\tSophia\nAgro\tChiara"}
                style={{...inp,minHeight:160,fontFamily:"monospace",fontSize:12,resize:"vertical"}}/>
              <button onClick={handlePasteImport} disabled={!pasteText.trim()} style={{...pbtn(pasteText.trim()?RED:"#21262D",pasteText.trim()?"#fff":DIM),width:"100%",marginTop:10,padding:12,fontSize:14}}>✓ Import Pasted Roster</button>
            </div>
          )}
          {roster.length>0&&<OkBox msg={`✓ ${roster.length} students loaded`}/>}
          <ErrBox msg={err}/>
          <NavRow onBack={onBack} backLabel="Trip" onNext={()=>{if(!roster.length){setErr("Upload a roster first.");return;}setStep("city_select");}} nextDisabled={!roster.length}/>
        </Card>
      </div>
    </div>
  );

  // ── CITY SELECT ────────────────────────────────────────────────────────────
  if(step==="city_select") return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif"}}>
      <TopBar title={`Setup — ${city}`} onBack={()=>setStep("roster")} backLabel="Roster" adminName={admin?.username}/>
      <div style={{maxWidth:560,margin:"0 auto",padding:"28px 16px"}}>
        <CityProg cities={trip.cities} cityIdx={cityIdx} isCityDone={isCityDone} onJump={i=>{setCityIdx(i);setHotelIdx(0);setStep("city_select");}}/>
        <Card style={{border:`1px solid ${col}44`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:3,height:20,background:col,borderRadius:2}}/>
            <span style={{color:col,fontSize:13,letterSpacing:"0.12em",textTransform:"uppercase"}}>{city} · {getCityDateLabel({...trip,cityDates},city)}</span>
          </div>
          {isCityDone(city)?(
            <div>
              <OkBox msg={`✓ ${city} fully configured.`}/>
              <div style={{marginTop:12}}>
                {hotels.map((h,hi)=>{
                  const fRooms=h.femaleRooms||[]; const mRooms=h.maleRooms||[];
                  return (
                    <div key={hi} style={{background:BG,borderRadius:8,padding:"12px 14px",border:`1px solid ${BORD}`,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{color:TXT,fontSize:13,fontWeight:600}}>{h.name} <span style={{color:DIM,fontSize:12}}>({h.abbr})</span></div>
                          <div style={{color:DIM,fontSize:12,marginTop:3}}>{h.gender==="F"?"Female only":h.gender==="M"?"Male only":"Both"} · {fRooms.length}F + {mRooms.length}M rooms</div>
                        </div>
                        <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                          <button onClick={()=>{setHotelIdx(hi);setEditMode(true);setStep("hotel_name");}} style={{...pbtn("transparent","#79C0FF","#79C0FF"),padding:"5px 11px",fontSize:11}}>✏️ Edit Name</button>
                          <button onClick={()=>{setHotelIdx(hi);setEditMode(true);setStep("room_counts");}} style={{...pbtn("#1C2B3A","#79C0FF","#79C0FF"),padding:"5px 11px",fontSize:11}}>🏨 Edit Rooms</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={()=>{setSetupData(prev=>({...prev,[city]:{hotels:[]}}));setHotelIdx(0);}} style={{...pbtn("transparent","#FF7B72","#FF7B72"),fontSize:12,padding:"6px 12px",marginTop:8}}>🗑 Start {city} Over</button>
              <NavRow onBack={()=>{if(cityIdx>0){setCityIdx(cityIdx-1);setStep("city_summary");}else setStep("roster");}} backLabel={cityIdx>0?trip.cities[cityIdx-1]:"Roster"}
                onNext={()=>{if(cityIdx+1<trip.cities.length){setCityIdx(cityIdx+1);setHotelIdx(0);setStep("city_select");}else onDone();}}
                nextLabel={cityIdx+1<trip.cities.length?`Next: ${trip.cities[cityIdx+1]} →`:"Finish Setup ✓"} nextColor={col}/>
            </div>
          ):(
            <div>
              <Lbl>When are you in {city}? <span style={{textTransform:"none",letterSpacing:0,color:"#4A5568"}}>(optional)</span></Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div>
                  <div style={{color:"#4A5568",fontSize:11,marginBottom:4}}>Arrival</div>
                  <input type="date" style={inp} value={cityDates?.[city]?.start||""} onChange={async e=>{
                    const nd={...cityDates,[city]:{...(cityDates?.[city]||{}),start:e.target.value}};
                    setCityDates(nd); await updateTripCityDates(trip.id, nd); if(onUpdateTrip) onUpdateTrip({...trip,cityDates:nd});
                  }}/>
                </div>
                <div>
                  <div style={{color:"#4A5568",fontSize:11,marginBottom:4}}>Departure</div>
                  <input type="date" style={inp} value={cityDates?.[city]?.end||""} min={cityDates?.[city]?.start} onChange={async e=>{
                    const nd={...cityDates,[city]:{...(cityDates?.[city]||{}),end:e.target.value}};
                    setCityDates(nd); await updateTripCityDates(trip.id, nd); if(onUpdateTrip) onUpdateTrip({...trip,cityDates:nd});
                  }}/>
                </div>
              </div>
              <p style={{color:DIM,fontSize:15,marginTop:0}}>How many hotels in <strong style={{color:TXT}}>{city}</strong>?</p>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:4}}>
                {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setHotelCount(n)} style={{padding:"12px 22px",borderRadius:8,border:`1px solid ${hotelCount===n?col:"#30363D"}`,background:hotelCount===n?`${col}33`:"transparent",color:hotelCount===n?TXT:DIM,fontSize:16,cursor:"pointer"}}>{n}</button>)}
              </div>
              <NavRow onBack={()=>{if(cityIdx>0){setCityIdx(cityIdx-1);setHotelIdx(0);setStep("city_select");}else setStep("roster");}}
                onNext={()=>{
                  setSetupData(prev=>({...prev,[city]:{hotels:Array.from({length:hotelCount},(_,i)=>prev[city]?.hotels?.[i]||{name:"",abbr:"",gender:"B",femaleTypeCounts:{},maleTypeCounts:{},femaleRooms:[],maleRooms:[],_done:false})}}));
                  setHotelIdx(0);setStep("hotel_name");
                }} nextLabel={`Configure ${hotelCount} ${hotelCount===1?"hotel":"hotels"} →`} nextColor={col}/>
            </div>
          )}
        </Card>
        {allCitiesDone&&<button onClick={onDone} style={{...pbtn(GRN,"#fff"),width:"100%",marginTop:16,padding:14,fontSize:16}}>✓ All Cities Done — Save Setup</button>}
      </div>
    </div>
  );

  // ── HOTEL NAME ─────────────────────────────────────────────────────────────
  if(step==="hotel_name") return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif"}}>
      <TopBar title={`${city} — Hotel ${hotelIdx+1}`} onBack={()=>{if(hotelIdx>0){setHotelIdx(hotelIdx-1);setStep("hotel_gender");}else setStep("city_select");}} backLabel={hotelIdx>0?`Hotel ${hotelIdx}`:"City"} adminName={admin?.username}/>
      <div style={{maxWidth:520,margin:"0 auto",padding:"28px 16px"}}>
        <CityProg cities={trip.cities} cityIdx={cityIdx} isCityDone={isCityDone} onJump={i=>{setCityIdx(i);setHotelIdx(0);setStep("city_select");}}/>
        <Card style={{border:`1px solid ${col}44`}}>
          <Lbl>Hotel Name</Lbl>
          <input autoFocus style={{...inp,marginBottom:12}} placeholder="e.g. Hotel Torino" value={hotel?.name||""} onChange={e=>updHotel(city,hotelIdx,{name:e.target.value})}/>
          <Lbl>Abbreviation</Lbl>
          <input style={{...inp,marginBottom:12}} placeholder="e.g. HT" maxLength={6} value={hotel?.abbr||""} onChange={e=>updHotel(city,hotelIdx,{abbr:e.target.value.toUpperCase()})}/>
          <ErrBox msg={err}/>
          <NavRow onBack={()=>{ if(editMode){setEditMode(false);setStep("city_select");}else if(hotelIdx>0){setHotelIdx(hotelIdx-1);setStep("hotel_gender");}else setStep("city_select"); }} backLabel={editMode?"Cancel":"Back"}
            onNext={async()=>{
              if(!hotel?.name?.trim()||!hotel?.abbr?.trim()){setErr("Enter both name and abbreviation.");return;}
              setErr("");
              if(editMode){ await persist(setupData); setEditMode(false); setStep("city_select"); }
              else setStep("hotel_gender");
            }} nextLabel={editMode?"✓ Save Name":"Next →"} nextColor={col}/>
        </Card>
      </div>
    </div>
  );

  // ── HOTEL GENDER ───────────────────────────────────────────────────────────
  if(step==="hotel_gender") return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif"}}>
      <TopBar title={`${city} — ${hotel?.name}`} onBack={()=>setStep("hotel_name")} backLabel="Hotel Name" adminName={admin?.username}/>
      <div style={{maxWidth:520,margin:"0 auto",padding:"28px 16px"}}>
        <CityProg cities={trip.cities} cityIdx={cityIdx} isCityDone={isCityDone} onJump={i=>{setCityIdx(i);setHotelIdx(0);setStep("city_select");}}/>
        <Card style={{border:`1px solid ${col}44`}}>
          <p style={{color:DIM,fontSize:15,marginTop:0}}>Does <strong style={{color:TXT}}>{hotel?.name}</strong> have…</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[["F","Female rooms only","👩"],["M","Male rooms only","👨"],["B","Both male & female","👫"]].map(([g,l,ic])=>(
              <button key={g} onClick={()=>updHotel(city,hotelIdx,{gender:g})} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderRadius:10,border:`2px solid ${hotel?.gender===g?col:"#30363D"}`,background:hotel?.gender===g?`${col}22`:"transparent",cursor:"pointer",fontFamily:"'Georgia',serif"}}>
                <span style={{fontSize:22}}>{ic}</span><span style={{color:hotel?.gender===g?TXT:DIM,fontSize:15}}>{l}</span>
                {hotel?.gender===g&&<span style={{marginLeft:"auto",color:col}}>✓</span>}
              </button>
            ))}
          </div>
          <NavRow onBack={()=>setStep("hotel_name")} onNext={()=>{if(!hotel?.gender){setErr("Select a gender option.");return;}setErr("");setStep("room_counts");}} nextColor={col}/>
          <ErrBox msg={err}/>
        </Card>
      </div>
    </div>
  );

  // ── ROOM COUNTS ────────────────────────────────────────────────────────────
  if(step==="room_counts"&&hotel){
    const needF=hotel.gender==="F"||hotel.gender==="B";
    const needM=hotel.gender==="M"||hotel.gender==="B";
    const ftc=hotel.femaleTypeCounts||{}; const mtc=hotel.maleTypeCounts||{};
    const fStudents=ROOM_TYPES.reduce((n,t)=>n+(parseInt(ftc[t])||0)*ROOM_SIZES[t],0);
    const mStudents=ROOM_TYPES.reduce((n,t)=>n+(parseInt(mtc[t])||0)*ROOM_SIZES[t],0);
    const fRoomTotal=ROOM_TYPES.reduce((n,t)=>n+(parseInt(ftc[t])||0),0);
    const mRoomTotal=ROOM_TYPES.reduce((n,t)=>n+(parseInt(mtc[t])||0),0);
    return (
      <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:40}}>
        <TopBar title={`${city} — ${hotel.name} Rooms`} onBack={()=>setStep("hotel_gender")} backLabel="Gender" adminName={admin?.username}/>
        <div style={{maxWidth:620,margin:"0 auto",padding:"24px 16px"}}>
          <CityProg cities={trip.cities} cityIdx={cityIdx} isCityDone={isCityDone} onJump={i=>{setCityIdx(i);setHotelIdx(0);setStep("city_select");}}/>
          <Card style={{border:`1px solid ${col}44`}}>
            {needF&&(
              <div style={{marginBottom:24}}>
                <div style={{color:"#EC407A",fontSize:14,fontWeight:600,marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${BORD}`}}>👩 Female Rooms {fRoomTotal>0&&<span style={{float:"right",color:col,fontSize:13}}>{fRoomTotal} rooms · {fStudents} students</span>}</div>
                {ROOM_TYPES.map(t=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                    <div style={{minWidth:96}}><div style={{color:TXT,fontSize:14}}>{t}</div></div>
                    <div style={{flex:1}}><NumPicker value={parseInt(ftc[t])||0} onChange={n=>updHotel(city,hotelIdx,{femaleTypeCounts:{...ftc,[t]:n}})} accent={col}/></div>
                  </div>
                ))}
              </div>
            )}
            {needM&&(
              <div style={{marginBottom:8}}>
                <div style={{color:"#42A5F5",fontSize:14,fontWeight:600,marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${BORD}`}}>👨 Male Rooms {mRoomTotal>0&&<span style={{float:"right",color:col,fontSize:13}}>{mRoomTotal} rooms · {mStudents} students</span>}</div>
                {ROOM_TYPES.map(t=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                    <div style={{minWidth:96}}><div style={{color:TXT,fontSize:14}}>{t}</div></div>
                    <div style={{flex:1}}><NumPicker value={parseInt(mtc[t])||0} onChange={n=>updHotel(city,hotelIdx,{maleTypeCounts:{...mtc,[t]:n}})} accent={col}/></div>
                  </div>
                ))}
              </div>
            )}
            <ErrBox msg={err}/>
            <NavRow onBack={()=>setStep(editMode?"city_select":"hotel_gender")} backLabel={editMode?"Back to City":"Gender"}
              onNext={async()=>{
                if(needF&&fRoomTotal===0&&needM&&mRoomTotal===0){setErr("Enter at least one room.");return;}
                setErr("");
                const femaleRooms=needF?expandRooms(ftc):[];
                const maleRooms=needM?expandRooms(mtc):[];
                const freshHotels=(setupData[city]?.hotels||[]).map((h,i)=>i===hotelIdx?{...h,femaleRooms,maleRooms,_done:true}:h);
                const freshSetup={...setupData,[city]:{...(setupData[city]||{}),hotels:freshHotels}};
                setSetupData(freshSetup);
                if(editMode){
                  await updateTripSetupData(trip.id, freshSetup);
                  setEditMode(false); setStep("city_select");
                  // NOTE: cascade eviction (removing students whose slot no longer
                  // exists after a room-count edit) is handled server-side via the
                  // unique constraint naturally preventing impossible states, but
                  // explicit cleanup of orphaned room_selections rows pointing at
                  // now-deleted room_keys should be added as a follow-up RPC call
                  // similar to move_student_slot — flagged for the testing pass.
                } else {
                  setTimeout(()=>afterRoomCounts(),0);
                }
              }} nextLabel={editMode?"✓ Save Changes":(hotelIdx+1<hotels.length?"Next Hotel →":"View City Summary →")} nextColor={col}/>
          </Card>
        </div>
      </div>
    );
  }

  // ── CITY SUMMARY ───────────────────────────────────────────────────────────
  if(step==="city_summary"){
    const {hotels:hs,totalF,totalM,byType}=citySummaryData();
    const eF=parseInt(expF)||0; const eM=parseInt(expM)||0;
    const fOk=eF===0||totalF===eF; const mOk=eM===0||totalM===eM;
    return (
      <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:40}}>
        <TopBar title={`${city} — Summary`} onBack={()=>{setHotelIdx(hs.length-1);setStep("room_counts");}} backLabel="Last Hotel" adminName={admin?.username}/>
        <div style={{maxWidth:640,margin:"0 auto",padding:"24px 16px"}}>
          <CityProg cities={trip.cities} cityIdx={cityIdx} isCityDone={isCityDone} onJump={i=>{setCityIdx(i);setHotelIdx(0);setStep("city_select");}}/>
          <Card style={{border:`1px solid ${col}44`}}>
            <div style={{color:TXT,fontSize:16,marginBottom:14}}>{city} — {totalF} female · {totalM} male</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div><Lbl>Expected Female</Lbl><input style={{...inp,fontSize:14,padding:"8px 10px"}} type="number" value={expF} onChange={e=>setExpF(e.target.value)}/>{eF>0&&<div style={{fontSize:12,marginTop:4,color:fOk?GRN:"#FF7B72"}}>{fOk?"✓ Matches":`✗ Expected ${eF}, got ${totalF}`}</div>}</div>
              <div><Lbl>Expected Male</Lbl><input style={{...inp,fontSize:14,padding:"8px 10px"}} type="number" value={expM} onChange={e=>setExpM(e.target.value)}/>{eM>0&&<div style={{fontSize:12,marginTop:4,color:mOk?GRN:"#FF7B72"}}>{mOk?"✓ Matches":`✗ Expected ${eM}, got ${totalM}`}</div>}</div>
            </div>
            <ErrBox msg={err}/>
            <NavRow onBack={()=>{setHotelIdx(hs.length-1);setStep("room_counts");}} backLabel="Edit Rooms"
              onNext={()=>{
                if(eF>0&&!fOk){setErr(`Female mismatch: expected ${eF}, configured ${totalF}.`);return;}
                if(eM>0&&!mOk){setErr(`Male mismatch: expected ${eM}, configured ${totalM}.`);return;}
                setErr(""); afterSummary();
              }} nextLabel={cityIdx+1<trip.cities.length?`✓ Continue →`:"✓ Finish Setup"} nextColor={col}/>
          </Card>
        </div>
      </div>
    );
  }
  return null;
}
