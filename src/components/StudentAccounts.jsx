import { useState, useEffect } from "react";
import { BG, CARD, BORD, DIM, TXT, RED, GRN, inp, pbtn, Lbl, TopBar, Spinner, ConfirmModal } from "../shared.jsx";
import { simpleHash, getRoster, getAllStudentAccounts, resetStudentPassword, getSelections } from "../lib/db.js";

export function StudentAccounts({trip,onBack}){
  const [roster,setRoster]=useState([]);
  const [accounts,setAccounts]=useState([]);
  const [selections,setSelections]=useState({});
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [resetTarget,setRT]=useState(null);
  const [newPass,setNewPass]=useState("");
  const [resetMsg,setResetMsg]=useState("");
  const [resetErr,setResetErr]=useState("");

  useEffect(()=>{
    Promise.all([getRoster(trip.id), getAllStudentAccounts(trip.id), getSelections(trip.id)])
      .then(([r,a,s])=>{ setRoster(r); setAccounts(a); setSelections(s); setLoading(false); });
  },[trip.id]);

  if(loading) return <div style={{minHeight:"100vh",background:BG}}><TopBar title="Student Accounts" onBack={onBack} backLabel="Trip Dashboard"/><Spinner label="Loading…"/></div>;

  const enriched = roster.map(s=>{
    const acct = accounts.find(a=>a.name===s.name);
    const sel = selections[s.name];
    return { ...s, registered: !!acct, email: acct?.email||"", acctId: acct?.id, citiesDone: Object.keys(sel?.cityPicks||{}).length, totalCities: trip.cities.length };
  });

  const filtered = enriched.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase()));

  const handleResetPassword = async () => {
    if(newPass.length<6){ setResetErr("Password must be at least 6 characters."); return; }
    if(!resetTarget?.acctId){ setResetErr("Cannot find account."); return; }
    await resetStudentPassword(resetTarget.acctId, simpleHash(newPass));
    setResetMsg(`✓ Password reset for ${resetTarget.name}. Temporary password: "${newPass}"`);
    setNewPass(""); setResetErr(""); setRT(null);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:60}}>
      <TopBar title="Student Accounts" sub={trip.name} onBack={onBack} backLabel="Trip Dashboard"/>
      <div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name…" style={{...inp,marginBottom:16,fontSize:14,padding:"9px 13px"}}/>
        {resetMsg&&<div style={{padding:"12px 16px",background:"#162318",border:`1px solid ${GRN}`,borderRadius:8,color:GRN,fontSize:13,marginBottom:16}}>{resetMsg}</div>}
        <div style={{background:CARD,borderRadius:10,border:`1px solid ${BORD}`,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:BG}}><th style={{padding:"10px 14px",color:"#4A5568",textAlign:"left"}}>Student</th><th style={{padding:"10px",color:"#4A5568"}}>Status</th><th style={{padding:"10px",color:"#4A5568"}}>Rooms</th><th style={{padding:"10px",color:"#4A5568"}}>Actions</th></tr></thead>
            <tbody>
              {filtered.map((s,i)=>(
                <tr key={s.name} style={{borderTop:`1px solid ${BORD}`,background:i%2===0?"transparent":"#13181F"}}>
                  <td style={{padding:"10px 14px",color:TXT}}>{s.name}</td>
                  <td style={{padding:"10px",textAlign:"center"}}>{s.registered?<span style={{color:GRN,fontSize:11}}>✓ Registered</span>:<span style={{color:"#4A5568",fontSize:11}}>Not registered</span>}</td>
                  <td style={{padding:"10px",textAlign:"center",color:DIM,fontSize:12}}>{s.citiesDone}/{s.totalCities}</td>
                  <td style={{padding:"10px",textAlign:"center"}}>{s.registered&&<button onClick={()=>{setRT(s);setNewPass("");setResetErr("");setResetMsg("");}} style={{...pbtn("#1C2B3A","#79C0FF","#79C0FF"),padding:"5px 12px",fontSize:11}}>🔑 Reset</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {resetTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:24}}>
          <div style={{background:"#1C2128",border:"1px solid #30363D",borderRadius:12,padding:28,maxWidth:400,width:"100%",fontFamily:"'Georgia',serif"}}>
            <div style={{color:TXT,fontSize:16,fontWeight:600,marginBottom:12}}>Reset Password for {resetTarget.name}</div>
            <Lbl>New Temporary Password</Lbl>
            <input autoFocus style={{...inp,marginBottom:8}} value={newPass} onChange={e=>setNewPass(e.target.value)}/>
            {resetErr&&<div style={{color:"#FF7B72",fontSize:12,marginBottom:8}}>{resetErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:10}}>
              <button onClick={()=>setRT(null)} style={{flex:1,...pbtn("transparent",DIM,"#30363D"),padding:11}}>Cancel</button>
              <button onClick={handleResetPassword} style={{flex:2,...pbtn("#2471A3","#fff"),border:"none",padding:11}}>🔑 Set Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
