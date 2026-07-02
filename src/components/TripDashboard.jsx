import { useState, useEffect } from "react";
import { CITY_CLR, BG, CARD, BORD, DIM, TXT, GRN, RED, pbtn, TopBar, Spinner, flattenRooms, occupiedMap } from "../shared.jsx";
import { getRoster, getSelections, getAllStudentAccounts } from "../lib/db.js";

export function TripDashboard({trip,admin,onBack,onToggleLive,onSetupRooms,onViewAssignments,onManualAssign,onGoHome,onEnterAsStudent,onStudentAccounts,onRegistrationData,onStudentInfo}){
  const [roster,setRoster]=useState([]);
  const [selections,setSelections]=useState({});
  const [accountCount,setAccountCount]=useState(0);
  const [loading,setLoading]=useState(true);

  const load = async () => {
    const [r,s,accts] = await Promise.all([
      getRoster(trip.id), getSelections(trip.id), getAllStudentAccounts(trip.id)
    ]);
    setRoster(r); setSelections(s); setAccountCount(accts.length); setLoading(false);
  };

  useEffect(()=>{ load(); },[trip.id, trip.is_live]);

  if(loading) return <div style={{minHeight:"100vh",background:BG}}><TopBar title={trip.name} onBack={onBack} backLabel="All Trips"/><Spinner label="Loading trip data…"/></div>;

  const rooms = flattenRooms(trip.setup_data, trip.cities);
  const occ = occupiedMap(selections, trip.cities);
  const submitted = Object.values(selections).filter(s=>Object.keys(s.cityPicks||{}).length===trip.cities.length).length;
  const cityStats = trip.cities.map(city=>{ const cr=rooms[city]||[]; const total=cr.reduce((n,r)=>n+r.slots,0); const filled=cr.reduce((n,r)=>n+Object.keys(occ[city]?.[r.key]||{}).length,0); return {city,total,filled}; });

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:40}}>
      <TopBar title={trip.name} sub={`${trip.year}`} onBack={onBack} backLabel="All Trips" adminName={admin?.username}
        right={<div style={{display:"flex",gap:8}}>
          <button onClick={onGoHome} style={{...pbtn("transparent",DIM,"#30363D"),padding:"5px 12px",fontSize:12}}>🏠 Home</button>
          <button onClick={onEnterAsStudent} disabled={!trip.is_live} style={{...pbtn(trip.is_live?"#1C2B3A":CARD,trip.is_live?"#79C0FF":DIM,trip.is_live?"#79C0FF":"#30363D"),padding:"5px 12px",fontSize:12,cursor:trip.is_live?"pointer":"not-allowed"}}>🎒 Enter as Student</button>
        </div>}/>
      <div style={{maxWidth:860,margin:"0 auto",padding:"24px 16px"}}>
        <div style={{borderRadius:12,border:`2px solid ${trip.is_live?GRN:"#4A5568"}`,overflow:"hidden",marginBottom:22}}>
          <div style={{background:trip.is_live?"#162318":"#1C1C1C",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{color:trip.is_live?GRN:"#8A9BB0",fontSize:16,fontWeight:700}}>{trip.is_live?"🟢  STUDENT PORTAL IS LIVE":"🔴  STUDENT PORTAL IS CLOSED"}</div>
              <div style={{color:DIM,fontSize:12,marginTop:3}}>{admin?.role!=="owner"?"Only the owner can open or close the portal.":trip.is_live?`Students can log in and select rooms for "${trip.name}".`:"Click the button to open — students can log in immediately."}</div>
            </div>
            {admin?.role==="owner"
              ? <button onClick={onToggleLive} style={{padding:"12px 28px",borderRadius:8,border:`2px solid ${trip.is_live?"#FF7B72":GRN}`,background:trip.is_live?"#3A1A1A":"#162318",color:trip.is_live?"#FF7B72":GRN,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"'Georgia',serif",minWidth:180}}>{trip.is_live?"🔒  Close Portal":"🚀  Open Portal"}</button>
              : <div style={{padding:"12px 28px",borderRadius:8,border:"2px solid #30363D",background:"#1C1C1C",color:DIM,fontSize:14,fontWeight:700,fontFamily:"'Georgia',serif",minWidth:180,textAlign:"center"}}>🔒 Owner Only</div>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:22}}>
          {[{label:"Students",val:roster.length,icon:"👥"},{label:"Registered",val:accountCount,icon:"📝"},{label:"Submitted",val:submitted,icon:"✅"},{label:"Cities",val:trip.cities.length,icon:"🗺️"}].map(({label,val,icon})=>(
            <div key={label} style={{background:CARD,borderRadius:8,padding:14,border:`1px solid ${BORD}`}}>
              <div style={{color:DIM,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{icon} {label}</div>
              <div style={{color:TXT,fontSize:26}}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10,marginBottom:24}}>
          {cityStats.map(({city,total,filled})=>{ const cp=CITY_CLR[city]; return (
            <div key={city} style={{background:CARD,borderRadius:8,padding:12,border:`1px solid ${cp}44`}}>
              <div style={{color:cp,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3}}>{city}</div>
              <div style={{color:TXT,fontSize:22}}>{filled}<span style={{color:"#4A5568",fontSize:12}}>/{total}</span></div>
              <div style={{color:GRN,fontSize:11}}>🟢 {total-filled} open</div>
            </div>
          );})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
          {[
            {icon:"🏨",label:"Configure Hotels & Rooms",sub:"Upload roster & set up hotels",onClick:onSetupRooms,ownerOnly:true},
            {icon:"🛂",label:"Student Info",sub:"Passport #, DOB, allergies & email at a glance",onClick:onStudentInfo},
            {icon:"📋",label:"View Assignments",sub:"See who's in each room",onClick:onViewAssignments},
            {icon:"✏️",label:"Manually Assign / Move Students",sub:"Place or move a student between rooms",onClick:onManualAssign},
            {icon:"👤",label:"Student Accounts",sub:"See who has registered & reset passwords",onClick:onStudentAccounts},
            {icon:"📋",label:"Registration Data",sub:"View or upload the organizer's original application data",onClick:onRegistrationData},
          ].map(({icon,label,sub,onClick,ownerOnly})=>{
            const locked = ownerOnly && admin?.role!=="owner";
            return (
              <button key={label} onClick={locked?undefined:onClick} disabled={locked} style={{background:CARD,border:`1px solid ${BORD}`,borderRadius:10,padding:"18px 16px",cursor:locked?"not-allowed":"pointer",fontFamily:"'Georgia',serif",textAlign:"left",opacity:locked?0.5:1}}>
                <div style={{fontSize:28,marginBottom:8}}>{locked?"🔒":icon}</div>
                <div style={{color:TXT,fontSize:14,fontWeight:600,marginBottom:3}}>{label}</div>
                <div style={{color:DIM,fontSize:12}}>{locked?"Owner only":sub}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
