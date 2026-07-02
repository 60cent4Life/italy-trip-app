import { useState, useEffect } from "react";
import { BG, CARD, BORD, DIM, TXT, RED, GRN, inp, pbtn, Card, Lbl, TopBar, Spinner } from "../shared.jsx";
import { simpleHash, getAllTrips, getAdmin, updateAdminPassword } from "../lib/db.js";

export function AdminDashboard({admin,onLogout,onNewTrip,onOpenTrip}){
  const [trips,setTrips]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showPwModal,setShowPwModal]=useState(false);
  const [pwForm,setPwForm]=useState({current:"",newP:"",confirm:""});
  const [pwErr,setPwErr]=useState("");
  const [pwOk,setPwOk]=useState("");
  const [showCur,setShowCur]=useState(false);
  const [showNew,setShowNew]=useState(false);

  useEffect(()=>{
    getAllTrips().then(t=>{ setTrips(t); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  const handleChangePassword=async()=>{
    setPwErr(""); setPwOk("");
    if(!pwForm.current){setPwErr("Enter your current password.");return;}
    const fresh = await getAdmin();
    if(simpleHash(pwForm.current)!==fresh.pass_hash){setPwErr("Current password is incorrect.");return;}
    if(pwForm.newP.length<6){setPwErr("New password must be at least 6 characters.");return;}
    if(pwForm.newP!==pwForm.confirm){setPwErr("New passwords don't match.");return;}
    await updateAdminPassword(fresh.id, simpleHash(pwForm.newP));
    setPwOk("✓ Password changed successfully.");
    setPwForm({current:"",newP:"",confirm:""});
    setTimeout(()=>{ setShowPwModal(false); setPwOk(""); },2000);
  };

  const eyeBtn=(show,toggle)=>(
    <button onClick={toggle} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:DIM,fontSize:15,padding:0}}>{show?"🙈":"👁️"}</button>
  );

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif"}}>
      <TopBar title="Admin Dashboard" right={
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:DIM,fontSize:13}}>{admin.username}</span>
          <button onClick={()=>{setShowPwModal(true);setPwErr("");setPwOk("");setPwForm({current:"",newP:"",confirm:""});}} style={{...pbtn("transparent","#79C0FF","#79C0FF"),padding:"5px 12px",fontSize:12}}>🔑 Change Password</button>
          <button onClick={onLogout} style={{...pbtn("transparent",DIM,"#30363D"),padding:"5px 12px",fontSize:12}}>Sign Out</button>
        </div>
      }/>

      {showPwModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:24,fontFamily:"'Georgia',serif"}}>
          <div style={{background:"#1C2128",border:"1px solid #30363D",borderRadius:12,padding:28,maxWidth:400,width:"100%"}}>
            <div style={{color:TXT,fontSize:17,fontWeight:600,marginBottom:4}}>Change Password</div>
            <div style={{color:DIM,fontSize:13,marginBottom:20}}>Update your admin account password.</div>
            <Lbl>Current Password</Lbl>
            <div style={{position:"relative",marginBottom:14}}><input autoFocus style={{...inp,paddingRight:38}} type={showCur?"text":"password"} placeholder="Your current password" value={pwForm.current} onChange={e=>setPwForm(f=>({...f,current:e.target.value}))}/>{eyeBtn(showCur,()=>setShowCur(s=>!s))}</div>
            <Lbl>New Password</Lbl>
            <div style={{position:"relative",marginBottom:14}}><input style={{...inp,paddingRight:38}} type={showNew?"text":"password"} placeholder="Min. 6 characters" value={pwForm.newP} onChange={e=>setPwForm(f=>({...f,newP:e.target.value}))}/>{eyeBtn(showNew,()=>setShowNew(s=>!s))}</div>
            <Lbl>Confirm New Password</Lbl>
            <div style={{position:"relative",marginBottom:6}}><input style={{...inp,paddingRight:38}} type={showNew?"text":"password"} placeholder="Repeat new password" value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleChangePassword()}/></div>
            {pwErr&&<div style={{padding:"9px 12px",background:"#3A1A1A",borderRadius:6,color:"#FF7B72",fontSize:13,marginBottom:8}}>{pwErr}</div>}
            {pwOk&&<div style={{padding:"9px 12px",background:"#162318",borderRadius:6,color:GRN,fontSize:13,marginBottom:8}}>{pwOk}</div>}
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={()=>setShowPwModal(false)} style={{flex:1,...pbtn("transparent",DIM,"#30363D"),padding:11}}>Cancel</button>
              <button onClick={handleChangePassword} style={{flex:2,...pbtn("#2471A3","#fff"),border:"none",padding:11,fontSize:14}}>🔑 Update Password</button>
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:760,margin:"0 auto",padding:"28px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{color:TXT,fontSize:18}}>Your Trips</div>
          <button onClick={onNewTrip} style={{...pbtn(RED,"#fff"),padding:"10px 22px"}}>+ Create New Trip</button>
        </div>
        {loading ? <Spinner label="Loading your trips…"/> : trips.length===0?(
          <Card style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:36,marginBottom:12}}>✈️</div>
            <div style={{color:TXT,fontSize:18,marginBottom:6}}>No trips yet</div>
            <div style={{color:DIM,fontSize:14,marginBottom:20}}>Create your first trip to get started.</div>
            <button onClick={onNewTrip} style={{...pbtn(RED,"#fff"),padding:"11px 28px"}}>Create New Trip</button>
          </Card>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {trips.map(trip=>(
              <button key={trip.id} onClick={()=>onOpenTrip(trip)} style={{background:CARD,border:`1px solid ${BORD}`,borderRadius:10,padding:"18px 20px",cursor:"pointer",fontFamily:"'Georgia',serif",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16}}>
                <div>
                  <div style={{color:TXT,fontSize:17,fontWeight:600}}>{trip.name}</div>
                  <div style={{color:DIM,fontSize:13,marginTop:3}}>{(trip.cities||[]).join(" · ")}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <div style={{padding:"3px 10px",borderRadius:20,background:trip.is_live?"#162318":"#1C1C1C",border:`1px solid ${trip.is_live?GRN:"#4A5568"}`,color:trip.is_live?GRN:"#4A5568",fontSize:11}}>{trip.is_live?"🟢 Live":"🔴 Closed"}</div>
                  <div style={{color:"#4A5568",fontSize:11}}>Open →</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
