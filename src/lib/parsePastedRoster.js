const normG = (v) => String(v||"").trim().toUpperCase()[0]==="F"?"F":"M";

export function parsePastedRoster(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
  if(!lines.length) return { students: [], error: "No data found in pasted text." };
  const splitRow = (line) => {
    if(line.includes("\t")) return line.split("\t").map(c=>c.trim());
    if(line.includes(",")) return line.split(",").map(c=>c.trim());
    return line.split(/\s{2,}/).map(c=>c.trim());
  };
  const rows = lines.map(splitRow);
  const headerCandidates = rows[0].map(c=>c.toLowerCase());
  const looksLikeHeader = headerCandidates.some(c=>/last|first|name|gender|sex|passport|birth|dob|allerg|email/.test(c));
  let dataRows = rows;
  let lastIdx=-1, firstIdx=-1, nameIdx=-1, genderIdx=-1, dobIdx=-1, passportIdx=-1, allergyIdx=-1, emailIdx=-1;
  if(looksLikeHeader){
    dataRows = rows.slice(1);
    headerCandidates.forEach((h,i)=>{
      if(/^last/.test(h)) lastIdx=i;
      else if(/^first/.test(h)) firstIdx=i;
      else if(/student.?list|^name$/.test(h)) nameIdx=i;
      else if(/gender|sex/.test(h)) genderIdx=i;
      else if(/birth|dob/.test(h)) dobIdx=i;
      else if(/passport/.test(h)) passportIdx=i;
      else if(/allerg/.test(h)) allergyIdx=i;
      else if(/email/.test(h)) emailIdx=i;
    });
  } else {
    const colCount = Math.max(...rows.map(r=>r.length));
    if(colCount>=2){ lastIdx=0; firstIdx=1; } else if(colCount===1){ nameIdx=0; }
  }
  const students = [];
  dataRows.forEach(row=>{
    let name="";
    if(lastIdx>=0 && firstIdx>=0){
      const last=(row[lastIdx]||"").trim(); const first=(row[firstIdx]||"").trim();
      if(last && first) name = `${last}, ${first}`;
    } else if(nameIdx>=0){ name = (row[nameIdx]||"").trim(); }
    if(!name) return;
    students.push({
      name, gender: genderIdx>=0 ? normG(row[genderIdx]) : "M",
      email: emailIdx>=0 ? (row[emailIdx]||"").trim() : "",
      passport: passportIdx>=0 ? (row[passportIdx]||"").trim() : "",
      allergies: allergyIdx>=0 ? (row[allergyIdx]||"").trim() : "",
      dob: dobIdx>=0 ? (row[dobIdx]||"").trim() : "",
    });
  });
  return { students, error: students.length ? null : "Could not find any valid names in the pasted data." };
}
