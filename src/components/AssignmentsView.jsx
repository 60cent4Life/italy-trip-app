import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { SLOTS, CITY_CLR, BG, CARD, BORD, DIM, TXT, RED, GRN, pbtn, TopBar, Spinner, flattenRooms, occupiedMap, getCityDateLabel } from "../shared.jsx";
import { getRoster, getSelections } from "../lib/db.js";

export function AssignmentsView({trip,onBack}){
  const [roster,setRoster]=useState([]);
  const [selections,setSelections]=useState({});
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("overview");

  useEffect(()=>{
    Promise.all([getRoster(trip.id), getSelections(trip.id)]).then(([r,s])=>{ setRoster(r); setSelections(s); setLoading(false); });
  },[trip.id]);

  if(loading) return <div style={{minHeight:"100vh",background:BG}}><TopBar title="Room Assignments" onBack={onBack} backLabel="Trip Dashboard"/><Spinner label="Loading…"/></div>;

  const rooms = flattenRooms(trip.setup_data, trip.cities);
  const occ = occupiedMap(selections, trip.cities);
  const completeNames=new Set(Object.values(selections).filter(s=>Object.keys(s.cityPicks||{}).length===trip.cities.length).map(s=>s.name));
  const anyAssignedNames=new Set(Object.values(selections).filter(s=>Object.keys(s.cityPicks||{}).length>0).map(s=>s.name));

  const rosterLookup={}; roster.forEach(s=>{ rosterLookup[s.name]={passport:s.passport||"",dob:s.dob||""}; });
  const slotCells=(name)=>{ if(!name) return ["","",""]; const i=rosterLookup[name]||{}; return [name, i.passport||"—", i.dob||"—"]; };

  const exportExcel=()=>{
    const wb=XLSX.utils.book_new();
    const sumRows=[["Room Allocation Summary"],[`Trip: ${trip.name}`],[],
      ["#","Last","First","Gender","DOB","Passport",...trip.cities.flatMap(c=>[`${c} Hotel`,`${c} Room`,`${c} Slot`])]];
    roster.forEach((s,i)=>{
      const sel=selections[s.name]; const parts=s.name.split(", ");
      sumRows.push([i+1,parts[0]||s.name,parts[1]||"",s.gender,s.dob,s.passport,
        ...trip.cities.flatMap(c=>{ const p=sel?.cityPicks?.[c]; const rm=(rooms[c]||[]).find(r=>r.key===p?.key); return [rm?.hotelName||"",rm?.label||"",p?.slot?`P${p.slot}`:""]; })]);
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sumRows),"All Students");
    XLSX.writeFile(wb,`${trip.name}_Student_Data.xlsx`);
  };

  const exportOrganizerExcel=()=>{
    const wb=XLSX.utils.book_new();
    trip.cities.forEach((city,ci)=>{
      const cityRooms=rooms[city]||[]; const cityOcc=occ[city]||{};
      const byHotel={}; cityRooms.forEach(r=>{ if(!byHotel[r.hotelName]) byHotel[r.hotelName]=[]; byHotel[r.hotelName].push(r); });
      const rows=[[city.toUpperCase()],[getCityDateLabel(trip,city)],[]];
      Object.entries(byHotel).forEach(([hotelName,hRooms])=>{
        rows.push([hotelName.toUpperCase()]);
        rows.push(["#","HOTEL","Gender","Type","Room#","Person(A)","Passport","DOB","Person(B)","Passport","DOB","Person(C)","Passport","DOB","Person(D)","Passport","DOB","Person(E)","Passport","DOB","Notes"]);
        let n=1;
        hRooms.forEach(room=>{
          const rOcc=cityOcc[room.key]||{};
          rows.push([n++,hotelName,room.gender==="F"?"Female":"Male",room.type,"",
            ...slotCells(rOcc["A"]),...slotCells(rOcc["B"]),...slotCells(rOcc["C"]),...slotCells(rOcc["D"]),...slotCells(rOcc["E"]),""]);
        });
        rows.push([]);
      });
      const ws=XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb,ws,city);
    });
    XLSX.writeFile(wb,`${trip.name}_Organizer_Sheets.xlsx`);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:60}}>
      <TopBar title="Room Assignments" sub={trip.name} onBack={onBack} backLabel="Trip Dashboard"
        right={<div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{...pbtn("#162318",GRN,GRN),padding:"6px 12px",fontSize:12}}>↓ Student Data</button>
          <button onClick={exportOrganizerExcel} style={{...pbtn("#1C2B3A","#79C0FF","#79C0FF"),padding:"6px 12px",fontSize:12}}>↓ Organizer Sheets</button>
        </div>}/>
      <div style={{maxWidth:980,margin:"0 auto",padding:"20px 16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10,marginBottom:22}}>
          {trip.cities.map(city=>{ const cp=CITY_CLR[city]; const cr=rooms[city]||[]; const total=cr.reduce((n,r)=>n+r.slots,0); const filled=cr.reduce((n,r)=>n+Object.keys(occ[city]?.[r.key]||{}).length,0);
            return <div key={city} style={{background:CARD,borderRadius:8,padding:12,border:`1px solid ${cp}44`}}>
              <div style={{color:cp,fontSize:10,textTransform:"uppercase"}}>{city}</div>
              <div style={{color:TXT,fontSize:22}}>{filled}<span style={{color:"#4A5568",fontSize:12}}>/{total}</span></div>
            </div>; })}
        </div>
        <div style={{display:"flex",gap:12,color:DIM,fontSize:13,marginBottom:16}}>
          <span style={{color:GRN}}>✓ {completeNames.size} complete</span>
          <span style={{color:"#FF7B72"}}>⏳ {roster.length-anyAssignedNames.size} not started</span>
        </div>
        <div style={{background:CARD,borderRadius:10,border:`1px solid ${BORD}`,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:BG}}><th style={{padding:"8px 12px",color:"#4A5568",textAlign:"left"}}>Student</th>{trip.cities.map(c=><th key={c} style={{padding:"8px 8px",color:CITY_CLR[c],textAlign:"center"}}>{c}</th>)}</tr></thead>
            <tbody>
              {roster.map((s,i)=>{ const sel=selections[s.name];
                return <tr key={s.name} style={{borderTop:`1px solid ${BORD}`,background:i%2===0?"transparent":"#13181F"}}>
                  <td style={{padding:"8px 12px",color:TXT}}>{s.name}</td>
                  {trip.cities.map(c=>{ const p=sel?.cityPicks?.[c]; const rm=(rooms[c]||[]).find(r=>r.key===p?.key);
                    return <td key={c} style={{padding:"8px 8px",textAlign:"center",color:DIM,fontSize:11}}>{rm?`${rm.label} P${p.slot}`:"—"}</td>; })}
                </tr>; })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
