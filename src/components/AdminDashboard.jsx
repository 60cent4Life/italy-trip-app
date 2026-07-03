import { useState, useEffect } from "react";
import { BG, CARD, BORD, DIM, TXT, RED, GRN, inp, pbtn, Card, Lbl, TopBar, Spinner, ConfirmModal } from "../shared.jsx";
import { simpleHash, getAllTrips, getAdminByEmail, updateAdminPassword, getAllAdmins, createAdmin, deleteAdmin, deleteTrip } from "../lib/db.js";

export function AdminDashboard({admin,onLogout,onNewTrip,onOpenTrip}){
  const [trips,setTrips]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showPwModal,setShowPwModal]=useState(false);
  const [pwForm,setPwForm]=useState({current:"",newP:"",confirm:""});
  const [pwErr,setPwErr]=useState("");
  const [pwOk,setPwOk]=useState("");
  const [showCur,setShowCur]=useState(false);
  const [showNew,setShowNew]=useState(false);

  const [admins,setAdmins]=useState([]);
  const [showAdminModal,setShowAdminModal]=useState(false);
  const [newAdminForm,setNewAdminForm]=useState({username:"",email:"",pass:""});
  const [adminErr,setAdminErr]=useState("");
  const [adminLoading,setAdminLoading]=useState(false);
  const [confirmDeleteId,setConfirmDeleteId]=useState(null);
  const [deleteTripTarget,setDeleteTripTarget]=useState(null);
  const [deletingTrip,setDeletingTrip]=useState(false);

  useEffect(()=>{
    getAllTrips().then(t=>{ setTrips(t); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    if(admin.role==="owner") getAllAdmins().then(setAdmins).catch(()=>{});
  },[admin.role]);

  const handleDeleteTrip=async()=>{
    if(!deleteTripTarget) return;
    setDeletingTrip(true);
    try{
      await deleteTrip(deleteTripTarget.id);
      setTrips(await getAllTrips());
      setDeleteTripTarget(null);
    }catch(e){ alert(e.message || "Could not delete trip."); }
    setDeletingTrip(false);
  };

  const handleChangePassword=async()=>{
    setPwErr(""); setPwOk("");
    if(!pwForm.current){setPwErr("Enter your current password.");return;}
    const fresh = await getAdminByEmail(admin.email);
    if(simpleHash(pwForm.current)!==fresh.pass_hash){setPwErr("Current password is incorrect.");return;}
    if(pwForm.newP.length<6){setPwErr("New password must be at least 6 characters.");return;}
    if(pwForm.newP!==pwForm.confirm){setPwErr("New passwords don't match.");return;}
    await updateAdminPassword(fresh.id, simpleHash(pwForm.newP));
    setPwOk("✓ Password changed successfully.");
    setPwForm({current:"",newP:"",confirm:""});
    setTimeout(()=>{ setShowPwModal(false); setPwOk(""); },2000);
  };

  const handleAddAdmin=async()=>{
    setAdminErr("");
    if(!newAdminForm.username.trim()||!newAdminForm.email.trim()||!newAdminForm.pass){setAdminErr("All fields required.");return;}
    if(newAdminForm.pass.length<6){setAdminErr("Password must be at least 6 characters.");return;}
    setAdminLoading(true);
    try{
      await createAdmin({ username:newAdminForm.username.trim(), email:newAdminForm.email.trim(), passHash:simpleHash(newAdminForm.pass), role:"admin" });
      setAdmins(await getAllAdmins());
      setShowAdminModal(false);
      setNewAdminForm({username:"",email:"",pass:""});
    }catch(e){ setAdminErr(e.message || "Could not create admin account."); }
    setAdminLoading(false);
  };

  const handleDeleteAdmin=async(id)=>{
    try{
      await deleteAdmin(id);
      setAdmins(await getAllAdmins());
    }catch(e){ alert(e.message || "Could not remove admin."); }
    setConfirmDeleteId(null);
  };

  const eyeBtn=(show,toggle)=>(
    <button onClick={toggle} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:DIM,fontSize:15,padding:0}}>{show?"🙈":"👁️"}</button>
  );

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif"}}>
      <TopBar title="Admin Dashboard" right={
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:DIM,fontSize:13}}>{admin.username}{admin.role==="owner"&&<span style={{color:"#FFD700",marginLeft:6}}>★ Owner</span>}</span>
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

      {showAdminModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:24,fontFamily:"'Georgia',serif"}}>
          <div style={{background:"#1C2128",border:"1px solid #30363D",borderRadius:12,padding:28,maxWidth:400,width:"100%"}}>
            <div style={{color:TXT,fontSize:17,fontWeight:600,marginBottom:4}}>Add Admin Account</div>
            <div style={{color:DIM,fontSize:13,marginBottom:20}}>Give someone else full admin access. You can remove them again at any time.</div>
            <Lbl>Name</Lbl>
            <input autoFocus style={{...inp,marginBottom:12}} placeholder="e.g. Trip Organizer" value={newAdminForm.username} onChange={e=>setNewAdminForm(f=>({...f,username:e.target.value}))}/>
            <Lbl>Email</Lbl>
            <input style={{...inp,marginBottom:12}} type="email" placeholder="organizer@example.com" value={newAdminForm.email} onChange={e=>setNewAdminForm(f=>({...f,email:e.target.value}))}/>
            <Lbl>Temporary Password</Lbl>
            <input style={{...inp,marginBottom:6}} type="text" placeholder="Min. 6 characters — share this with them" value={newAdminForm.pass} onChange={e=>setNewAdminForm(f=>({...f,pass:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAddAdmin()}/>
            {adminErr&&<div style={{padding:"9px 12px",background:"#3A1A1A",borderRadius:6,color:"#FF7B72",fontSize:13,marginTop:8}}>{adminErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={()=>setShowAdminModal(false)} style={{flex:1,...pbtn("transparent",DIM,"#30363D"),padding:11}}>Cancel</button>
              <button onClick={handleAddAdmin} disabled={adminLoading} style={{flex:2,...pbtn("#2471A3","#fff"),border:"none",padding:11,fontSize:14}}>{adminLoading?"Creating…":"+ Create Admin"}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:760,margin:"0 auto",padding:"28px 16px"}}>
        {admin.role==="owner"&&(
          <div style={{background:"#1C2B1A",border:"1px solid #F0B429",borderRadius:8,padding:"12px 16px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{fontSize:18}}>⚠️</div>
            <div style={{flex:1}}>
              <div style={{color:"#F0B429",fontSize:13,fontWeight:600,marginBottom:2}}>⏰ Check this every 2-3 months — don't wait until next trip season</div>
              <div style={{color:DIM,fontSize:12,lineHeight:1.5}}>
                This app's free database (Supabase) pauses itself after 7 days of no activity — and if it stays paused for more than <strong style={{color:TXT}}>90 days without you restoring it</strong>, it becomes permanently unrecoverable. Since this app is only actively used a few days a year, it's easy to lose everything (every student, room pick, admin account) if it's ignored too long. Visit{" "}
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{color:"#79C0FF"}}>supabase.com/dashboard</a>{" "}
                every couple of months and click "Resume"/"Restore" if it shows paused — this resets the clock. A few days before students need to log in, do this and then test logging in here yourself once to confirm everything's working.
              </div>
            </div>
          </div>
        )}
        {admin.role==="owner"&&(
          <div style={{marginBottom:28}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{color:TXT,fontSize:16}}>Admin Accounts</div>
              <button onClick={()=>{setShowAdminModal(true);setAdminErr("");}} style={{...pbtn("transparent","#79C0FF","#79C0FF"),padding:"6px 14px",fontSize:12}}>+ Add Admin</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {admins.map(a=>(
                <div key={a.id} style={{background:CARD,border:`1px solid ${BORD}`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{color:TXT,fontSize:14}}>{a.username}{a.role==="owner"&&<span style={{color:"#FFD700",fontSize:11,marginLeft:6}}>★ Owner</span>}</div>
                    <div style={{color:DIM,fontSize:12}}>{a.email}</div>
                  </div>
                  {a.role!=="owner"&&(
                    confirmDeleteId===a.id?(
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>handleDeleteAdmin(a.id)} style={{...pbtn(RED,"#fff"),padding:"5px 10px",fontSize:12}}>Confirm Remove</button>
                        <button onClick={()=>setConfirmDeleteId(null)} style={{...pbtn("transparent",DIM,"#30363D"),padding:"5px 10px",fontSize:12}}>Cancel</button>
                      </div>
                    ):(
                      <button onClick={()=>setConfirmDeleteId(a.id)} style={{...pbtn("transparent","#FF7B72","#FF7B72"),padding:"5px 10px",fontSize:12}}>Remove</button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{color:TXT,fontSize:18}}>Your Trips</div>
          {admin.role==="owner"&&<button onClick={onNewTrip} style={{...pbtn(RED,"#fff"),padding:"10px 22px"}}>+ Create New Trip</button>}
        </div>
        {loading ? <Spinner label="Loading your trips…"/> : trips.length===0?(
          <Card style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:36,marginBottom:12}}>✈️</div>
            <div style={{color:TXT,fontSize:18,marginBottom:6}}>No trips yet</div>
            <div style={{color:DIM,fontSize:14,marginBottom:20}}>{admin.role==="owner"?"Create your first trip to get started.":"The owner hasn't created a trip yet."}</div>
            {admin.role==="owner"&&<button onClick={onNewTrip} style={{...pbtn(RED,"#fff"),padding:"11px 28px"}}>Create New Trip</button>}
          </Card>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {trips.map(trip=>(
              <div key={trip.id} style={{background:CARD,border:`1px solid ${BORD}`,borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>onOpenTrip(trip)} style={{flex:1,background:"transparent",border:"none",padding:"18px 20px",cursor:"pointer",fontFamily:"'Georgia',serif",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16}}>
                  <div>
                    <div style={{color:TXT,fontSize:17,fontWeight:600}}>{trip.name}</div>
                    <div style={{color:DIM,fontSize:13,marginTop:3}}>{(trip.cities||[]).join(" · ")}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                    <div style={{padding:"3px 10px",borderRadius:20,background:trip.is_live?"#162318":"#1C1C1C",border:`1px solid ${trip.is_live?GRN:"#4A5568"}`,color:trip.is_live?GRN:"#4A5568",fontSize:11}}>{trip.is_live?"🟢 Live":"🔴 Closed"}</div>
                    <div style={{color:"#4A5568",fontSize:11}}>Open →</div>
                  </div>
                </button>
                {admin.role==="owner"&&(
                  <button onClick={()=>setDeleteTripTarget(trip)} title="Delete trip" style={{...pbtn("transparent","#FF7B72","#30363D"),padding:"8px 12px",fontSize:16,marginRight:14}}>🗑️</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTripTarget&&(
        <ConfirmModal
          title="Delete This Trip?"
          message={`This will permanently delete "${deleteTripTarget.name}" — including its roster, all student accounts, room selections, and registration data. This cannot be undone.`}
          confirmLabel={deletingTrip?"Deleting…":"🗑️ Delete Trip"}
          confirmColor={RED}
          onConfirm={handleDeleteTrip}
          onCancel={()=>setDeleteTripTarget(null)}
        />
      )}
    </div>
  );
}
