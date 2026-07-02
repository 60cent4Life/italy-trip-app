import { useState, useEffect } from "react";
import { BG, CARD, BORD, DIM, TXT, RED, GRN, inp, TopBar, Spinner } from "../shared.jsx";
import { getRoster, getAllStudentAccounts } from "../lib/db.js";

// Merges the admin-uploaded roster with actual student_accounts records.
// A registered student's own submitted info (which they may have corrected
// during registration) always takes priority over the original roster paste.
// Only students who haven't registered yet fall back to the roster data.
export function StudentInfo({trip,admin,onBack}){
  const [roster,setRoster]=useState([]);
  const [accounts,setAccounts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");

  useEffect(()=>{
    Promise.all([getRoster(trip.id), getAllStudentAccounts(trip.id)]).then(([r,a])=>{
      setRoster(r); setAccounts(a); setLoading(false);
    });
  },[trip.id]);

  if(loading) return <div style={{minHeight:"100vh",background:BG}}><TopBar title="Student Info" onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}/><Spinner label="Loading…"/></div>;

  const merged = roster.map(r=>{
    const acct = accounts.find(a=>a.name.toLowerCase()===r.name.toLowerCase());
    return {
      name: r.name,
      registered: !!acct,
      gender: acct?.gender || r.gender || "",
      dob: acct?.dob || r.dob || "",
      passport: acct?.passport || r.passport || "",
      allergies: acct?.allergies || r.allergies || "",
      email: acct?.email || r.email || "",
    };
  });

  const filtered = merged.filter(s=>!search || s.name.toLowerCase().includes(search.toLowerCase()));
  const missingPassport = merged.filter(s=>!s.passport).length;

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:60}}>
      <TopBar title="Student Info" sub={trip.name} onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}/>
      <div style={{maxWidth:980,margin:"0 auto",padding:"20px 16px"}}>
        <div style={{color:DIM,fontSize:13,marginBottom:14,lineHeight:1.5}}>
          Shows each student's gender, date of birth, passport number, allergies, and email — pulling from their own registration where available, or your uploaded roster if they haven't registered yet.
        </div>
        <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          <div style={{background:CARD,borderRadius:8,padding:"10px 16px",border:`1px solid ${BORD}`}}>
            <div style={{color:DIM,fontSize:11,textTransform:"uppercase"}}>Total Students</div>
            <div style={{color:TXT,fontSize:20}}>{merged.length}</div>
          </div>
          <div style={{background:CARD,borderRadius:8,padding:"10px 16px",border:`1px solid ${missingPassport>0?"#FF7B72":BORD}`}}>
            <div style={{color:missingPassport>0?"#FF7B72":DIM,fontSize:11,textTransform:"uppercase"}}>Missing Passport #</div>
            <div style={{color:missingPassport>0?"#FF7B72":TXT,fontSize:20}}>{missingPassport}</div>
          </div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name…" style={{...inp,marginBottom:14,maxWidth:320}}/>
        <div style={{background:CARD,borderRadius:10,border:`1px solid ${BORD}`,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:BG}}>
                <th style={{padding:"10px 14px",color:"#4A5568",textAlign:"left"}}>Student</th>
                <th style={{padding:"10px 10px",color:"#4A5568",textAlign:"center"}}>Status</th>
                <th style={{padding:"10px 10px",color:"#4A5568",textAlign:"center"}}>Gender</th>
                <th style={{padding:"10px 10px",color:"#4A5568",textAlign:"center"}}>DOB</th>
                <th style={{padding:"10px 10px",color:"#4A5568",textAlign:"left"}}>Passport #</th>
                <th style={{padding:"10px 10px",color:"#4A5568",textAlign:"left"}}>Allergies</th>
                <th style={{padding:"10px 14px",color:"#4A5568",textAlign:"left"}}>Email</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s,i)=>(
                <tr key={s.name} style={{borderTop:`1px solid ${BORD}`,background:i%2===0?"transparent":"#13181F"}}>
                  <td style={{padding:"9px 14px",color:TXT}}>{s.name}</td>
                  <td style={{padding:"9px 10px",textAlign:"center"}}>
                    {s.registered
                      ? <span style={{color:GRN,fontSize:11}}>✓ Registered</span>
                      : <span style={{color:"#8A9BB0",fontSize:11}}>Not registered</span>}
                  </td>
                  <td style={{padding:"9px 10px",textAlign:"center",color:DIM}}>{s.gender||"—"}</td>
                  <td style={{padding:"9px 10px",textAlign:"center",color:DIM}}>{s.dob||"—"}</td>
                  <td style={{padding:"9px 10px",color:s.passport?TXT:"#FF7B72"}}>{s.passport||"Missing"}</td>
                  <td style={{padding:"9px 10px",color:DIM}}>{s.allergies||"—"}</td>
                  <td style={{padding:"9px 14px",color:DIM}}>{s.email||"—"}</td>
                </tr>
              ))}
              {filtered.length===0&&(
                <tr><td colSpan={7} style={{padding:24,textAlign:"center",color:DIM}}>No students match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
