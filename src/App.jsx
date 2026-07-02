import { useState, useEffect } from "react";
import { BG, ConfirmModal, GRN, RED } from "./shared.jsx";
import { getAnyAdminExists, getAllTrips, getLiveTrip, setTripLive, getStudentByEmail } from "./lib/db.js";

import { AdminLogin, AdminRegister, AdminEmailLogin, StudentLogin, StudentRegister } from "./components/Auth.jsx";
import { Landing } from "./components/Landing.jsx";
import { AdminDashboard } from "./components/AdminDashboard.jsx";
import { CreateTrip } from "./components/CreateTrip.jsx";
import { TripDashboard } from "./components/TripDashboard.jsx";
import { SetupWizard } from "./components/SetupWizard.jsx";
import { StudentRoomFlow } from "./components/StudentRoomFlow.jsx";
import { AssignmentsView } from "./components/AssignmentsView.jsx";
import { ManualAssign } from "./components/ManualAssign.jsx";
import { StudentAccounts } from "./components/StudentAccounts.jsx";
import { StudentInfo } from "./components/StudentInfo.jsx";
import { RegistrationData } from "./components/RegistrationData.jsx";

export default function App(){
  const [screen,setScreen]=useState("landing");
  const [admin,setAdmin]=useState(null);
  const [student,setStudent]=useState(null);
  const [trip,setTrip]=useState(null);
  const [liveTrip,setLiveTrip]=useState(null);
  const [isLive,setIsLive]=useState(false);
  const [modal,setModal]=useState(null);
  const [booting,setBooting]=useState(true);

  // Boot: check for live trip (drives the landing page)
  useEffect(()=>{
    getLiveTrip().then(lt=>{ setLiveTrip(lt); setIsLive(!!lt); setBooting(false); });
  },[]);

  const refreshLiveTrip = async () => {
    const lt = await getLiveTrip();
    setLiveTrip(lt); setIsLive(!!lt);
  };

  const toggleLive = async () => {
    if(!trip) return;
    if(admin?.role!=="owner") return;
    if(!trip.is_live){
      setModal({
        title:"Open Student Portal?",
        message:`Open the portal for "${trip.name}" (${trip.year})? Students can log in immediately.`,
        confirmLabel:"🚀 Open Portal", confirmColor:GRN,
        onConfirm: async ()=>{
          const updated = await setTripLive(trip.id, true);
          setTrip(updated); await refreshLiveTrip(); setModal(null);
        },
      });
    } else {
      setModal({
        title:"Close Student Portal?",
        message:`Close the portal for "${trip.name}"? Students cannot log in until reopened.`,
        confirmLabel:"🔒 Close Portal", confirmColor:RED,
        onConfirm: async ()=>{
          const updated = await setTripLive(trip.id, false);
          setTrip(updated); await refreshLiveTrip(); setModal(null);
        },
      });
    }
  };

  if(booting) return <div style={{minHeight:"100vh",background:BG}}/>;

  // ── ROUTING ──────────────────────────────────────────────────────────────
  if(screen==="landing") return (
    <>
      <Landing isLive={isLive} liveTrip={liveTrip}
        onAdmin={async()=>{ const exists=await getAnyAdminExists(); setScreen(exists?"admin_email_login":"admin_register"); }}
        onStudent={()=>{ if(!isLive){ alert("The student portal is not yet open."); return; } setScreen("student_auth"); }}/>
      {modal&&<ConfirmModal {...modal} onCancel={()=>setModal(null)}/>}
    </>
  );

  if(screen==="admin_register") return <AdminRegister onDone={a=>{ setAdmin(a); setScreen("admin_dashboard"); }}/>;
  if(screen==="admin_email_login") return <AdminEmailLogin onFound={a=>{ setAdmin(a); setScreen("admin_login"); }} onBack={()=>setScreen("landing")}/>;
  if(screen==="admin_login") return <AdminLogin admin={admin} onDone={a=>{ setAdmin(a); setScreen("admin_dashboard"); }} onBack={()=>setScreen("admin_email_login")}/>;

  if(screen==="admin_dashboard") return <AdminDashboard admin={admin}
    onLogout={()=>setScreen("landing")}
    onNewTrip={()=>{ if(admin?.role!=="owner"){ return; } setScreen("create_trip"); }}
    onOpenTrip={t=>{ setTrip(t); setScreen("trip_dashboard"); }}/>;

  if(screen==="create_trip") return <CreateTrip admin={admin} onDone={t=>{ setTrip(t); setScreen("trip_dashboard"); }} onBack={()=>setScreen("admin_dashboard")}/>;

  if(screen==="trip_dashboard"&&trip) return (
    <>
      <TripDashboard trip={trip} admin={admin}
        onBack={()=>setScreen("admin_dashboard")}
        onToggleLive={toggleLive}
        onSetupRooms={()=>{ if(admin?.role!=="owner"){ return; } setScreen("setup_wizard"); }}
        onViewAssignments={()=>setScreen("assignments")}
        onManualAssign={()=>setScreen("manual_assign")}
        onStudentAccounts={()=>setScreen("student_accounts")}
        onRegistrationData={()=>setScreen("registration_data")}
        onStudentInfo={()=>setScreen("student_info")}
        onGoHome={()=>setScreen("landing")}
        onEnterAsStudent={()=>{ if(!trip.is_live){ setModal({title:"Portal Not Open",message:"Open the portal first.",confirmLabel:"OK",confirmColor:RED,onConfirm:()=>setModal(null)}); return; } setScreen("student_auth"); }}/>
      {modal&&<ConfirmModal {...modal} onCancel={()=>setModal(null)}/>}
    </>
  );

  if(screen==="setup_wizard"&&trip) return <SetupWizard trip={trip} admin={admin}
    onDone={async()=>{ const refreshed=(await getAllTrips()).find(t=>t.id===trip.id); setTrip(refreshed||trip); setScreen("trip_dashboard"); }}
    onBack={()=>setScreen("trip_dashboard")}
    onUpdateTrip={(updated)=>setTrip(updated)}/>;

  if(screen==="assignments"&&trip) return <AssignmentsView trip={trip} admin={admin} onBack={()=>setScreen("trip_dashboard")}/>;
  if(screen==="manual_assign"&&trip) return <ManualAssign trip={trip} admin={admin} onBack={()=>setScreen("trip_dashboard")} onSaved={()=>{}}/>;
  if(screen==="student_accounts"&&trip) return <StudentAccounts trip={trip} admin={admin} onBack={()=>setScreen("trip_dashboard")}/>;
  if(screen==="registration_data"&&trip) return <RegistrationData trip={trip} admin={admin} onBack={()=>setScreen("trip_dashboard")}/>;
  if(screen==="student_info"&&trip) return <StudentInfo trip={trip} admin={admin} onBack={()=>setScreen("trip_dashboard")}/>;

  // ── STUDENT SIDE ───────────────────────────────────────────────────────────
  if(screen==="student_auth"){
    if(!liveTrip) return (
      <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Georgia',serif",padding:24}}>
        <div style={{maxWidth:380,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:10}}>🔒</div>
          <div style={{color:"#F0E6D3",fontSize:17,marginBottom:6}}>Portal Not Yet Open</div>
          <button onClick={()=>setScreen("landing")} style={{padding:"10px 24px",borderRadius:7,border:"none",background:RED,color:"#fff",cursor:"pointer",fontFamily:"'Georgia',serif"}}>← Back</button>
        </div>
      </div>
    );
    return <StudentLogin tripId={liveTrip.id}
      onDone={s=>{ setStudent(s); setTrip(liveTrip); setScreen("student_rooms"); }}
      onRegister={()=>setScreen("student_register")}
      onBack={()=>setScreen("landing")}/>;
  }

  if(screen==="student_register"){
    if(!liveTrip){ setScreen("landing"); return null; }
    // roster + claimed names loaded inside StudentRegister via props passed here
    return <StudentRegisterLoader tripId={liveTrip.id} liveTrip={liveTrip}
      onDone={s=>{ setStudent(s); setTrip(liveTrip); setScreen("student_rooms"); }}
      onLogin={()=>setScreen("student_auth")}
      onBack={()=>setScreen("landing")}/>;
  }

  if(screen==="student_rooms"&&student&&trip){
    return <StudentRoomFlowLoader trip={trip} student={student} onDone={()=>{ setStudent(null); setScreen("landing"); }}/>;
  }

  return (
    <>
      <Landing isLive={isLive} liveTrip={liveTrip}
        onAdmin={async()=>{ const exists=await getAnyAdminExists(); setScreen(exists?"admin_email_login":"admin_register"); }}
        onStudent={()=>setScreen("student_auth")}/>
      {modal&&<ConfirmModal {...modal} onCancel={()=>setModal(null)}/>}
    </>
  );
}

// ── Small loader wrappers — fetch roster/setup data needed by child screens ──
import { getRoster, getAllStudentAccounts } from "./lib/db.js";
import { flattenRooms } from "./shared.jsx";

function StudentRegisterLoader({tripId,liveTrip,onDone,onLogin,onBack}){
  const [roster,setRoster]=useState(null);
  const [claimed,setClaimed]=useState(new Set());
  useEffect(()=>{
    Promise.all([getRoster(tripId), getAllStudentAccounts(tripId)]).then(([r,accts])=>{
      setRoster(r); setClaimed(new Set(accts.map(a=>a.name)));
    });
  },[tripId]);
  if(roster===null) return <div style={{minHeight:"100vh",background:BG}}/>;
  return <StudentRegister tripId={tripId} roster={roster} claimedNames={claimed} onDone={onDone} onLogin={onLogin} onBack={onBack}/>;
}

function StudentRoomFlowLoader({trip,student,onDone}){
  const [rooms,setRooms]=useState(null);
  useEffect(()=>{ setRooms(flattenRooms(trip.setup_data, trip.cities)); },[trip]);
  if(rooms===null) return <div style={{minHeight:"100vh",background:BG}}/>;
  return <StudentRoomFlow student={student} trip={trip} rooms={rooms} onDone={onDone}/>;
}
