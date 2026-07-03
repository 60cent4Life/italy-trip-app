import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { SLOTS, ROOM_TYPES, CITY_CLR, BG, CARD, BORD, DIM, TXT, RED, GRN, pbtn, TopBar, Spinner, flattenRooms, occupiedMap, getCityDateLabel } from "../shared.jsx";
import { getRoster, getSelections, getAllStudentAccounts } from "../lib/db.js";

export function AssignmentsView({trip,admin,onBack}){
  const [roster,setRoster]=useState([]);
  const [accounts,setAccounts]=useState([]);
  const [selections,setSelections]=useState({});
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("overview");

  useEffect(()=>{
    Promise.all([getRoster(trip.id), getSelections(trip.id), getAllStudentAccounts(trip.id)]).then(([r,s,a])=>{ setRoster(r); setSelections(s); setAccounts(a); setLoading(false); });
  },[trip.id]);

  if(loading) return <div style={{minHeight:"100vh",background:BG}}><TopBar title="Room Assignments" onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}/><Spinner label="Loading…"/></div>;

  const rooms = flattenRooms(trip.setup_data, trip.cities);
  const occ = occupiedMap(selections, trip.cities);
  const completeNames=new Set(Object.values(selections).filter(s=>Object.keys(s.cityPicks||{}).length===trip.cities.length).map(s=>s.name));
  const anyAssignedNames=new Set(Object.values(selections).filter(s=>Object.keys(s.cityPicks||{}).length>0).map(s=>s.name));

  // A registered student's own submitted passport/DOB/gender (which they may
  // have corrected during registration) takes priority over the original
  // roster upload — this is what actually travels with them, not the paste.
  const infoFor = (name) => {
    const acct = accounts.find(a=>a.name.toLowerCase()===name.toLowerCase());
    const r = roster.find(x=>x.name===name);
    return {
      gender: acct?.gender || r?.gender || "",
      dob: acct?.dob || r?.dob || "",
      passport: acct?.passport || r?.passport || "",
    };
  };

  const rosterLookup={}; roster.forEach(s=>{ rosterLookup[s.name]=infoFor(s.name); });

  const exportExcel=()=>{
    const wb=XLSX.utils.book_new();
    const sumRows=[["Room Allocation Summary"],[`Trip: ${trip.name}`],[],
      ["#","Last","First","Gender","DOB","Passport",...trip.cities.flatMap(c=>[`${c} Hotel`,`${c} Room`,`${c} Slot`])]];
    roster.forEach((s,i)=>{
      const sel=selections[s.name]; const parts=s.name.split(", "); const info=infoFor(s.name);
      sumRows.push([i+1,parts[0]||s.name,parts[1]||"",info.gender,info.dob,info.passport,
        ...trip.cities.flatMap(c=>{ const p=sel?.cityPicks?.[c]; const rm=(rooms[c]||[]).find(r=>r.key===p?.key); return [rm?.hotelName||"",rm?.label||"",p?.slot?`P${p.slot}`:""]; })]);
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sumRows),"All Students");
    XLSX.writeFile(wb,`${trip.name}_Student_Data.xlsx`);
  };

  // Builds a colored, print-ready workbook — one sheet per city, landscape,
  // fit to one page wide — with just the info an organizer needs day-of:
  // room, type, and who's in it. No passport/DOB clutter.
  const exportOrganizerExcel=async()=>{
    const wb = new ExcelJS.Workbook();
    wb.creator = "Italy Trip Portal";

    trip.cities.forEach(city=>{
      const cityColorHex = (CITY_CLR[city]||"#C0392B").replace("#","");
      const cityRooms = rooms[city]||[]; const cityOcc = occ[city]||{};
      const byHotel={}; cityRooms.forEach(r=>{ if(!byHotel[r.hotelName]) byHotel[r.hotelName]=[]; byHotel[r.hotelName].push(r); });

      const ws = wb.addWorksheet(city, {
        pageSetup: { orientation:"landscape", fitToPage:true, fitToWidth:1, fitToHeight:1, margins:{left:0.3,right:0.3,top:0.4,bottom:0.4,header:0.15,footer:0.15} },
      });
      ws.columns = [
        {width:6},{width:14},{width:10},{width:21.36},{width:21.36},{width:21.36},{width:21.36},{width:21.36},
      ];

      const titleRow = ws.addRow([city.toUpperCase()]);
      ws.mergeCells(titleRow.number,1,titleRow.number,8);
      titleRow.getCell(1).font = {size:18,bold:true,color:{argb:`FF${cityColorHex}`}};
      titleRow.getCell(1).alignment = {horizontal:"left"};

      const dateRow = ws.addRow([getCityDateLabel(trip,city)]);
      ws.mergeCells(dateRow.number,1,dateRow.number,8);
      dateRow.getCell(1).font = {size:11,italic:true,color:{argb:"FF8A9BB0"}};
      ws.addRow([]);

      Object.entries(byHotel).forEach(([hotelName,hRooms])=>{
        const hotelRow = ws.addRow([hotelName.toUpperCase()]);
        ws.mergeCells(hotelRow.number,1,hotelRow.number,8);
        hotelRow.height = 22;
        hotelRow.eachCell({includeEmpty:true},cell=>{
          cell.fill = {type:"pattern",pattern:"solid",fgColor:{argb:`FF${cityColorHex}`}};
        });
        hotelRow.getCell(1).font = {size:12,bold:true,color:{argb:"FFFFFFFF"}};
        hotelRow.getCell(1).alignment = {horizontal:"left",vertical:"middle"};

        const headerRow = ws.addRow(["#","Type","Gender","Person A","Person B","Person C","Person D","Person E"]);
        headerRow.height = 18;
        headerRow.eachCell({includeEmpty:true},cell=>{
          cell.fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FF2D3748"}};
          cell.font = {size:10,bold:true,color:{argb:"FFFFFFFF"}};
          cell.alignment = {horizontal:"center",vertical:"middle"};
        });

        let n=1;
        hRooms.forEach(room=>{
          const rOcc = cityOcc[room.key]||{};
          const names = SLOTS.slice(0,5).map(s=>rOcc[s]||"");
          const row = ws.addRow([n++, room.type, room.gender==="F"?"Female":"Male", ...names]);
          row.height = 20;
          const genderTint = room.gender==="F" ? "FFFDECEC" : "FFEAF3FC";
          row.eachCell({includeEmpty:true},cell=>{
            cell.fill = {type:"pattern",pattern:"solid",fgColor:{argb:genderTint}};
            cell.font = {size:10,color:{argb:"FF1A1A1A"}};
            cell.border = {top:{style:"thin",color:{argb:"FFD0D0D0"}},bottom:{style:"thin",color:{argb:"FFD0D0D0"}},left:{style:"thin",color:{argb:"FFD0D0D0"}},right:{style:"thin",color:{argb:"FFD0D0D0"}}};
            cell.alignment = {vertical:"middle"};
          });
          row.getCell(1).alignment = {horizontal:"center",vertical:"middle"};
          row.getCell(2).alignment = {horizontal:"center",vertical:"middle"};
          row.getCell(3).alignment = {horizontal:"center",vertical:"middle"};
        });
        ws.addRow([]);
      });

      // One compact summary row so the sheet stays on a single printed page.
      let femaleCount=0, maleCount=0;
      cityRooms.forEach(r=>{
        const filled = Object.keys(cityOcc[r.key]||{}).length;
        if(r.gender==="F") femaleCount+=filled; else maleCount+=filled;
      });
      const hotelCount = Object.keys(byHotel).length;

      const summaryRow = ws.addRow([`${hotelCount} Hotels   ·   ${femaleCount} Female   ·   ${maleCount} Male   ·   ${femaleCount+maleCount} Total Students`]);
      ws.mergeCells(summaryRow.number,1,summaryRow.number,8);
      summaryRow.height = 24;
      summaryRow.eachCell({includeEmpty:true},cell=>{
        cell.fill = {type:"pattern",pattern:"solid",fgColor:{argb:`FF${cityColorHex}`}};
      });
      summaryRow.getCell(1).font = {size:12,bold:true,color:{argb:"FFFFFFFF"}};
      summaryRow.getCell(1).alignment = {horizontal:"center",vertical:"middle"};
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {type:"application/octet-stream"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${trip.name}_Organizer_Sheets.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",paddingBottom:60}}>
      <TopBar title="Room Assignments" sub={trip.name} onBack={onBack} backLabel="Trip Dashboard" adminName={admin?.username}
        right={<div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{...pbtn("#162318",GRN,GRN),padding:"6px 12px",fontSize:12}}>↓ Student Data</button>
          <button onClick={exportOrganizerExcel} style={{...pbtn("#1C2B3A","#79C0FF","#79C0FF"),padding:"6px 12px",fontSize:12}}>↓ Organizer Sheets (Print-Ready)</button>
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
