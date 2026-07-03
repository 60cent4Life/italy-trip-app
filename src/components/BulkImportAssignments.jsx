import { useState } from "react";
import { BG, CARD, BORD, DIM, TXT, RED, GRN, inp, pbtn, Card, Lbl, TopBar, ROOM_TYPES, SLOTS, flattenRooms, ConfirmModal } from "../shared.jsx";
import { claimSlot, clearCityAssignments } from "../lib/db.js";

// Maps the abbreviated room-type text used in an exported hotel sheet
// ("Quin", "Quad", etc.) to the app's full room type names.
function normalizeType(raw){
  const t=(raw||"").trim().toLowerCase();
  if(t.startsWith("quin")) return "Quintuple";
  if(t.startsWith("quad")) return "Quad";
  if(t.startsWith("trip")) return "Triple";
  if(t.startsWith("doub")) return "Double";
  if(t.startsWith("sing")) return "Single";
  return ROOM_TYPES.find(rt=>rt.toLowerCase()===t) || raw;
}

// Parses one city's pasted sheet (tab-separated, copied straight from Excel)
// into a list of {hotelName, gender, type, people[]} room rows. Skips hotel
// header lines and "TOTAL STUDENTS" summary rows — only lines that start
// with a row number are treated as real room rows.
function parseSheet(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  const rows=[];
  for(const line of lines){
    const cells = line.split("\t");
    const rowNum = cells[0]?.trim();
    if(!/^\d+$/.test(rowNum)) continue; // not a data row
    const hotelName = (cells[1]||"").trim();
    const gender = (cells[2]||"").trim().toUpperCase();
    const type = normalizeType(cells[3]);
    if(!hotelName || !gender || !type) continue;
    const people=[];
    for(let i=0;i<5;i++){
      const name = (cells[5+i*3]||"").trim();
      if(name && name!=="—") people.push(name);
    }
    if(people.length) rows.push({hotelName,gender,type,people});
  }
  return rows;
}

// Matches parsed rows to actual configured rooms in this city, in order,
// grouped by hotel+gender+type (first parsed "Hotel X Female Quad" row
// gets the first configured Hotel X Female Quad room, and so on).
function matchRooms(rows, configuredRooms){
  const queues={};
  configuredRooms.forEach(r=>{
    const k=`${r.hotelName.trim().toLowerCase()}|${r.gender}|${r.type}`;
    (queues[k]=queues[k]||[]).push(r);
  });
  return rows.map(row=>{
    const k=`${row.hotelName.trim().toLowerCase()}|${row.gender}|${row.type}`;
    const room = (queues[k]||[]).shift();
    return { ...row, matchedRoom: room||null };
  });
}

export function BulkImportAssignments({trip,admin,onBack}){
  const [city,setCity]=useState(trip.cities[0]);
  const [pasteText,setPasteText]=useState("");
  const [stage,setStage]=useState("input"); // input | preview | done
  const [matched,setMatched]=useState([]);
  const [importing,setImporting]=useState(false);
  const [results,setResults]=useState(null);
  const [confirmClear,setConfirmClear]=useState(false);
  const [clearing,setClearing]=useState(false);
  const [cleared,setCleared]=useState(false);

  const handleClearCity=async()=>{
    setClearing(true);
    try{ await clearCityAssignments(trip.id, city); setCleared(true); }
    catch(e){ alert(e.message||"Could not clear assignments."); }
    setClearing(false); setConfirmClear(false);
  };

  const handlePreview=()=>{
    const rows = parseSheet(pasteText);
    const configuredRooms = (flattenRooms(trip.setup_data,[city])[city])||[];
    setMatched(matchRooms(rows, configuredRooms));
    setStage("preview");
  };

  const matchedCount = matched.filter(r=>r.matchedRoom).length;
  const unmatchedCount = matched.length - matchedCount;
  const peopleCount = matched.filter(r=>r.matchedRoom).reduce((n,r)=>n+r.people.length,0);

  const handleImport=async()=>{
    setImporting(true);
    let claimed=0, taken=0, failed=0;
    for(const row of matched){
      if(!row.matchedRoom) continue;
      for(let i=0;i<row.people.length;i++){
        try{
          await claimSlot(trip.id, city, row.matchedRoom.key, SLOTS[i], row.people[i]);
          claimed++;
        }catch(e){
          if(e.code==="SLOT_TAKEN") taken++; else failed++;
        }
      }
    }
    setResults({claimed,taken,failed});
    setImporting(false);
    setStage("done");
  };

  if(stage==="done") return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif"}}>
      <TopBar title="Bulk Import Assignments" onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}/>
      <div style={{maxWidth:560,margin:"40px auto",padding:"0 16px"}}>
        <Card>
          <div style={{fontSize:36,marginBottom:10,textAlign:"center"}}>✅</div>
          <div style={{color:TXT,fontSize:18,marginBottom:16,textAlign:"center"}}>Import Complete — {city}</div>
          <div style={{color:GRN,fontSize:14,marginBottom:6}}>✓ {results.claimed} students assigned successfully</div>
          {results.taken>0 && <div style={{color:"#F0B429",fontSize:14,marginBottom:6}}>⚠ {results.taken} skipped — slot was already claimed</div>}
          {results.failed>0 && <div style={{color:"#FF7B72",fontSize:14,marginBottom:6}}>✗ {results.failed} failed due to an unexpected error</div>}
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <button onClick={()=>{setStage("input");setPasteText("");setResults(null);}} style={{flex:1,...pbtn("transparent",DIM,"#30363D"),padding:11}}>Import Another City</button>
            <button onClick={onBack} style={{flex:1,...pbtn(RED,"#fff"),padding:11}}>Done</button>
          </div>
        </Card>
      </div>
    </div>
  );

  if(stage==="preview") return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:60}}>
      <TopBar title="Bulk Import — Preview" sub={city} onBack={()=>setStage("input")} backLabel="Edit Paste" adminName={admin?.username}/>
      <div style={{maxWidth:820,margin:"0 auto",padding:"20px 16px"}}>
        <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          <div style={{background:CARD,borderRadius:8,padding:"10px 16px",border:`1px solid ${GRN}`}}>
            <div style={{color:GRN,fontSize:11,textTransform:"uppercase"}}>Matched Rooms</div>
            <div style={{color:TXT,fontSize:20}}>{matchedCount}</div>
          </div>
          <div style={{background:CARD,borderRadius:8,padding:"10px 16px",border:`1px solid ${BORD}`}}>
            <div style={{color:DIM,fontSize:11,textTransform:"uppercase"}}>Students Ready</div>
            <div style={{color:TXT,fontSize:20}}>{peopleCount}</div>
          </div>
          {unmatchedCount>0 && (
            <div style={{background:CARD,borderRadius:8,padding:"10px 16px",border:"1px solid #FF7B72"}}>
              <div style={{color:"#FF7B72",fontSize:11,textTransform:"uppercase"}}>Unmatched Rows</div>
              <div style={{color:"#FF7B72",fontSize:20}}>{unmatchedCount}</div>
            </div>
          )}
        </div>
        {unmatchedCount>0 && (
          <div style={{background:"#3A1A1A",border:"1px solid #FF7B72",borderRadius:8,padding:14,marginBottom:16,color:"#FF7B72",fontSize:13,lineHeight:1.6}}>
            Some rows couldn't be matched to a configured room — usually means the hotel name, gender, or room type doesn't exactly match what's set up under "Configure Hotels & Rooms" for {city}, or there aren't enough rooms of that type configured. These rows are shown below but won't be imported. Fix the mismatch and re-paste, or configure the missing rooms first.
          </div>
        )}
        <div style={{background:CARD,borderRadius:10,border:`1px solid ${BORD}`,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:BG}}>
              <th style={{padding:"9px 12px",color:"#4A5568",textAlign:"left"}}>Hotel / Type</th>
              <th style={{padding:"9px 12px",color:"#4A5568",textAlign:"left"}}>Matched To</th>
              <th style={{padding:"9px 12px",color:"#4A5568",textAlign:"left"}}>Students</th>
            </tr></thead>
            <tbody>
              {matched.map((row,i)=>(
                <tr key={i} style={{borderTop:`1px solid ${BORD}`}}>
                  <td style={{padding:"8px 12px",color:TXT}}>{row.hotelName} · {row.gender} · {row.type}</td>
                  <td style={{padding:"8px 12px",color:row.matchedRoom?GRN:"#FF7B72"}}>{row.matchedRoom?row.matchedRoom.label:"⚠ No match"}</td>
                  <td style={{padding:"8px 12px",color:DIM}}>{row.people.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={()=>setStage("input")} style={{flex:1,...pbtn("transparent",DIM,"#30363D"),padding:12}}>← Edit Paste</button>
          <button onClick={handleImport} disabled={importing||matchedCount===0} style={{flex:2,...pbtn(GRN,"#0D1117"),padding:12,fontSize:15,opacity:matchedCount===0?0.5:1}}>{importing?"Importing…":`✓ Import ${peopleCount} Students`}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:60}}>
      <TopBar title="Bulk Import Assignments" onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}/>
      <div style={{maxWidth:700,margin:"0 auto",padding:"24px 16px"}}>
        <Card>
          <div style={{color:TXT,fontSize:16,marginBottom:6,fontWeight:600}}>One-time bulk import</div>
          <div style={{color:DIM,fontSize:13,marginBottom:20,lineHeight:1.6}}>
            Use this to pre-load room assignments you already made outside the app (e.g. in Excel), before students start picking their own rooms. Do this once per city. Make sure you've already set up hotels &amp; rooms for this city under "Configure Hotels &amp; Rooms" first — the counts and room types need to match.
          </div>
          <Lbl>City</Lbl>
          <select value={city} onChange={e=>{setCity(e.target.value);setCleared(false);}} style={{...inp,marginBottom:16}}>
            {trip.cities.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{background:cleared?"#162318":"#1C1C1C",border:`1px solid ${cleared?GRN:"#30363D"}`,borderRadius:8,padding:"12px 14px",marginBottom:16}}>
            <div style={{color:cleared?GRN:DIM,fontSize:12,lineHeight:1.5,marginBottom:cleared?0:8}}>
              {cleared ? `✓ All existing ${city} assignments cleared — safe to import fresh.` : `Re-importing a city that already has assignments (e.g. fixing a mistake) can create duplicates unless you clear it first. Only do this if you're sure — it removes every current room assignment for ${city}.`}
            </div>
            {!cleared&&<button onClick={()=>setConfirmClear(true)} style={{...pbtn("transparent","#FF7B72","#FF7B72"),padding:"6px 14px",fontSize:12}}>🗑️ Clear existing {city} assignments</button>}
          </div>
          <Lbl>Paste the sheet for {city}</Lbl>
          <div style={{color:DIM,fontSize:12,marginBottom:8}}>In Excel, select the whole {city} sheet (or just the room rows) and copy (Ctrl+C), then paste here (Ctrl+V).</div>
          <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} rows={10} placeholder="Paste here…" style={{...inp,fontFamily:"monospace",fontSize:12,marginBottom:16,resize:"vertical"}}/>
          <button onClick={handlePreview} disabled={!pasteText.trim()} style={{...pbtn(RED,"#fff"),padding:"12px 24px",width:"100%",fontSize:15,opacity:pasteText.trim()?1:0.5}}>Preview Matches →</button>
        </Card>
      </div>
      {confirmClear&&(
        <ConfirmModal
          title={`Clear ${city}'s Assignments?`}
          message={`This permanently removes every current room assignment for ${city} — including any students who already self-registered and picked a room there. Only do this if you're fixing a bad import. This cannot be undone.`}
          confirmLabel={clearing?"Clearing…":"🗑️ Clear All"}
          confirmColor={RED}
          onConfirm={handleClearCity}
          onCancel={()=>setConfirmClear(false)}
        />
      )}
    </div>
  );
}
