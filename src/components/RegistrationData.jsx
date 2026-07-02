import { useState } from "react";
import * as XLSX from "xlsx";
import { BG, CARD, BORD, DIM, TXT, RED, GRN, inp, pbtn, Card, TopBar, OkBox, ErrBox, ConfirmModal } from "../shared.jsx";
import { getRegistrationData, saveRegistrationData, clearRegistrationData } from "../lib/db.js";

export function RegistrationData({trip,admin,onBack}){
  const [drag,setDrag]=useState(false);
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");
  const [err,setErr]=useState("");
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState(null);
  const [records,setRecords]=useState(null); // null = not yet loaded
  const [showClearConfirm,setShowClearConfirm]=useState(false);

  useState(()=>{ getRegistrationData(trip.id).then(setRecords); },[]);

  const cleanHeader=(h)=>String(h||"").replace(/\n/g," ").replace(/\s+/g," ").trim();
  const fmtVal=(v)=> v===null||v===undefined||v===""?"—":String(v);

  const parseFile=async(file)=>{
    setLoading(true); setErr(""); setMsg("");
    try{
      const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null,raw:false,dateNF:"yyyy-mm-dd"});
      if(!rows.length) throw new Error("No data found.");
      const rawHeaders=Object.keys(rows[0]);
      const cleaned=rows.map(row=>{ const out={}; rawHeaders.forEach(h=>{ const k=cleanHeader(h); if(!k||k.toLowerCase()==="none") return; out[k]=row[h]; }); return out; })
        .filter(r=>Object.values(r).some(v=>v!==null&&v!==""));
      const withNames=cleaned.map((r,i)=>{
        const keys=Object.keys(r); const fk=keys.find(k=>/first name/i.test(k)); const lk=keys.find(k=>/last name/i.test(k));
        const sk=keys.find(k=>/^student name/i.test(k));
        let displayName = lk&&fk&&r[lk]&&r[fk] ? `${r[lk]}, ${r[fk]}` : (sk&&r[sk] ? r[sk] : `Record ${i+1}`);
        return { _displayName:displayName, _fileName:file.name, ...r };
      });
      await saveRegistrationData(trip.id, withNames);
      setRecords(withNames);
      setMsg(`✓ Imported ${withNames.length} registration records.`);
    }catch(e){ setErr("Error reading file: "+e.message); }
    setLoading(false);
  };

  const handleClear = async () => {
    await clearRegistrationData(trip.id);
    setRecords([]); setSelected(null); setShowClearConfirm(false); setMsg("✓ Registration data cleared.");
  };

  if(records===null) return <div style={{minHeight:"100vh",background:BG}}><TopBar title="Registration Data" onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}/></div>;

  const filtered = records.filter(r=>!search||r._displayName.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a._displayName.localeCompare(b._displayName));

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:40}}>
      <TopBar title="Registration Data" sub={trip.name} onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}/>
      {records.length===0 ? (
        <div style={{maxWidth:600,margin:"0 auto",padding:"28px 16px"}}>
          <Card>
            <div style={{color:TXT,fontSize:16,marginBottom:4,fontWeight:500}}>Upload Registration Data</div>
            <div style={{color:DIM,fontSize:13,marginBottom:18}}>Upload the organizer's application spreadsheet. Reference only — not connected to room assignments.</div>
            <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)parseFile(f);}}
              onClick={()=>document.getElementById("regFile").click()}
              style={{border:`2px dashed ${drag?RED:"#30363D"}`,borderRadius:8,padding:"32px 24px",textAlign:"center",cursor:"pointer",marginBottom:14}}>
              <div style={{fontSize:30,marginBottom:8}}>📋</div>
              <div style={{color:TXT,fontSize:14}}>{loading?"Reading…":"Drop spreadsheet here or click to browse"}</div>
              <input id="regFile" type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files[0])parseFile(e.target.files[0]);}}/>
            </div>
            {msg&&<OkBox msg={msg}/>}<ErrBox msg={err}/>
          </Card>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:0,height:"calc(100vh - 60px)"}}>
          <div style={{borderRight:`1px solid ${BORD}`,overflowY:"auto",background:CARD}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${BORD}`}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{...inp,fontSize:13,padding:"8px 12px"}}/>
              <div style={{display:"flex",gap:6,marginTop:8}}>
                <button onClick={()=>document.getElementById("regReupload").click()} style={{...pbtn("transparent","#79C0FF","#79C0FF"),padding:"5px 10px",fontSize:11,flex:1}}>↻ Re-upload</button>
                <button onClick={()=>setShowClearConfirm(true)} style={{...pbtn("transparent","#FF7B72","#FF7B72"),padding:"5px 10px",fontSize:11,flex:1}}>🗑 Clear</button>
                <input id="regReupload" type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files[0])parseFile(e.target.files[0]);}}/>
              </div>
            </div>
            {filtered.map((r,i)=>(
              <button key={i} onClick={()=>setSelected(r)} style={{width:"100%",textAlign:"left",padding:"10px 14px",background:selected?._displayName===r._displayName?`${RED}22`:"transparent",border:"none",borderBottom:`1px solid ${BORD}`,cursor:"pointer",fontFamily:"'Georgia',serif"}}>
                <div style={{color:TXT,fontSize:13}}>{r._displayName}</div>
              </button>
            ))}
          </div>
          <div style={{overflowY:"auto",padding:"20px 24px"}}>
            {!selected ? <div style={{color:DIM,textAlign:"center",paddingTop:60}}>Select a record to view details</div> : (
              <div>
                <div style={{color:TXT,fontSize:20,fontWeight:600,marginBottom:16}}>{selected._displayName}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
                  {Object.keys(selected).filter(k=>!k.startsWith("_")).map(f=>(
                    <div key={f} style={{background:CARD,borderRadius:6,padding:"8px 12px",border:`1px solid ${BORD}`}}>
                      <div style={{color:DIM,fontSize:10}}>{f}</div>
                      <div style={{color:TXT,fontSize:12}}>{fmtVal(selected[f])}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showClearConfirm&&<ConfirmModal title="Clear Registration Data?" message="This removes all uploaded registration records. Room assignments are not affected." confirmLabel="🗑 Clear Data" confirmColor={RED} onConfirm={handleClear} onCancel={()=>setShowClearConfirm(false)}/>}
    </div>
  );
}
