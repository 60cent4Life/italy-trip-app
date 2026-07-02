import { BG, DIM, TXT, RED, GRN, pbtn } from "../shared.jsx";

export function Landing({isLive,liveTrip,onAdmin,onStudent}){
  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Georgia',serif",padding:24}}>
      <div style={{maxWidth:460,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:10}}>🇮🇹</div>
        <div style={{fontSize:10,letterSpacing:"0.2em",color:DIM,textTransform:"uppercase",marginBottom:4}}>Niagara Catholic DSB · Hamilton Dante</div>
        <h1 style={{fontSize:28,fontWeight:400,color:TXT,margin:"0 0 2px"}}>Italy Summer Credit Course</h1>
        <div style={{fontSize:22,color:RED,fontWeight:600,marginBottom:8}}>{liveTrip?liveTrip.year:"\u00A0"}</div>
        <div style={{width:40,height:2,background:RED,margin:"0 auto 24px"}}/>
        <div style={{padding:"10px 20px",borderRadius:8,background:isLive?"#162318":"#1C1C1C",border:`1px solid ${isLive?GRN:"#4A5568"}`,marginBottom:28,display:"inline-block"}}>
          <span style={{fontSize:13,color:isLive?GRN:"#4A5568"}}>{isLive?"🟢  Student portal is OPEN":"🔴  Student portal is currently CLOSED"}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button onClick={onStudent} disabled={!isLive} style={{background:isLive?`${RED}22`:"#1C1C1C",border:`2px solid ${isLive?RED:"#30363D"}`,borderRadius:10,padding:"18px 24px",cursor:isLive?"pointer":"not-allowed",fontFamily:"'Georgia',serif",textAlign:"left",display:"flex",alignItems:"center",gap:14,opacity:isLive?1:0.5}}>
            <span style={{fontSize:30}}>🎒</span>
            <div><div style={{color:isLive?TXT:DIM,fontSize:16,fontWeight:600}}>I am a Student</div><div style={{color:DIM,fontSize:12,marginTop:3}}>{isLive?"Log in or register to select your rooms":"Portal not yet open — check back soon"}</div></div>
          </button>
          <button onClick={onAdmin} style={{background:"#1C2128",border:"2px solid #30363D",borderRadius:10,padding:"18px 24px",cursor:"pointer",fontFamily:"'Georgia',serif",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:30}}>🗂️</span>
            <div><div style={{color:TXT,fontSize:16,fontWeight:600}}>I am an Administrator</div><div style={{color:DIM,fontSize:12,marginTop:3}}>Manage trips, configure rooms, export reports</div></div>
          </button>
        </div>
      </div>
    </div>
  );
}
