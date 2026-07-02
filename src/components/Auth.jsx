// ============================================================================
// Auth screens — AdminLogin, AdminRegister, StudentLogin, StudentRegister
// Converted to async: every storage call now awaits a Supabase function
// instead of reading/writing localStorage synchronously.
// ============================================================================
import { useState } from "react";
import { BG, CARD, BORD, DIM, TXT, RED, GRN, inp, pbtn, Card, Lbl, ErrBox } from "../shared.jsx";
import { simpleHash, getAdminByEmail, createAdmin, getStudentByEmail, registerStudent } from "../lib/db.js";

export function AdminEmailLogin({onFound,onBack}){
  const [email,setEmail]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async()=>{
    if(!email.trim()){setErr("Enter your email address.");return;}
    setErr(""); setLoading(true);
    try{
      const a = await getAdminByEmail(email.trim());
      if(!a){ setErr("No admin account found with that email."); setLoading(false); return; }
      onFound(a);
    }catch(e){ setErr("Something went wrong. Please try again."); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Georgia',serif",padding:24}}>
      <div style={{maxWidth:400,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:8}}>🇮🇹</div>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:DIM,textTransform:"uppercase",marginBottom:4}}>NCDSB · Hamilton Dante</div>
          <h1 style={{fontSize:26,fontWeight:400,color:TXT,margin:0}}>Italy Trip Portal</h1>
        </div>
        <Card>
          <div style={{color:TXT,fontSize:16,marginBottom:4,fontWeight:500}}>Admin Login</div>
          <div style={{color:DIM,fontSize:13,marginBottom:18}}>Enter your admin email to continue.</div>
          <Lbl>Email Address</Lbl>
          <input autoFocus style={{...inp,marginBottom:4}} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          <ErrBox msg={err}/>
          <button onClick={submit} disabled={loading} style={{...pbtn(RED,"#fff"),width:"100%",marginTop:14,padding:13,fontSize:15}}>{loading?"Checking…":"Continue →"}</button>
        </Card>
        <div style={{textAlign:"center",marginTop:14}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",color:DIM,fontSize:13,cursor:"pointer",textDecoration:"underline"}}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}

export function AdminLogin({admin,onDone,onBack}){
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async()=>{
    setErr(""); setLoading(true);
    try{
      if(simpleHash(pass)!==admin.pass_hash){ setErr("Incorrect password."); setLoading(false); return; }
      onDone(admin);
    }catch(e){ setErr("Something went wrong. Please try again."); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Georgia',serif",padding:24}}>
      <div style={{maxWidth:400,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:8}}>🇮🇹</div>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:DIM,textTransform:"uppercase",marginBottom:4}}>NCDSB · Hamilton Dante</div>
          <h1 style={{fontSize:26,fontWeight:400,color:TXT,margin:0}}>Italy Trip Portal</h1>
        </div>
        <Card>
          <div style={{color:TXT,fontSize:16,marginBottom:4,fontWeight:500}}>Admin Login</div>
          <div style={{color:DIM,fontSize:13,marginBottom:18}}>Welcome back, {admin.username}</div>
          <Lbl>Password</Lbl>
          <input autoFocus style={{...inp,marginBottom:4}} type="password" placeholder="Enter your password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          <ErrBox msg={err}/>
          <button onClick={submit} disabled={loading} style={{...pbtn(RED,"#fff"),width:"100%",marginTop:14,padding:13,fontSize:15}}>{loading?"Signing in…":"Sign In →"}</button>
        </Card>
        <div style={{textAlign:"center",marginTop:14}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",color:DIM,fontSize:13,cursor:"pointer",textDecoration:"underline"}}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}

export function AdminRegister({onDone}){
  const [f,setF]=useState({username:"",email:"",pass:"",pass2:""});
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async()=>{
    if(!f.username.trim()||!f.email.trim()||!f.pass){setErr("All fields required.");return;}
    if(f.pass!==f.pass2){setErr("Passwords don't match.");return;}
    if(f.pass.length<6){setErr("Password must be at least 6 characters.");return;}
    setErr(""); setLoading(true);
    try{
      const admin = await createAdmin({ username:f.username.trim(), email:f.email.trim(), passHash:simpleHash(f.pass), role:'owner' });
      onDone(admin);
    }catch(e){ setErr("Could not create account. " + (e.message||"")); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Georgia',serif",padding:24}}>
      <div style={{maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:8}}>🇮🇹</div>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:DIM,textTransform:"uppercase",marginBottom:4}}>NCDSB · Hamilton Dante</div>
          <h1 style={{fontSize:26,fontWeight:400,color:TXT,margin:"0 0 2px"}}>Italy Trip Portal</h1>
        </div>
        <Card>
          <div style={{color:TXT,fontSize:16,marginBottom:2,fontWeight:500}}>Create Owner Account</div>
          <div style={{color:DIM,fontSize:12,marginBottom:16}}>This is the first admin account and can never be removed. You can add more admins later from your dashboard.</div>
          <Lbl>Name / Username</Lbl>
          <input style={{...inp,marginBottom:12}} placeholder="e.g. Dan Seixeiro" value={f.username} onChange={e=>setF({...f,username:e.target.value})}/>
          <Lbl>Email</Lbl>
          <input style={{...inp,marginBottom:12}} type="email" placeholder="admin@ncdsb.ca" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
          <Lbl>Password</Lbl>
          <input style={{...inp,marginBottom:12}} type="password" placeholder="Min. 6 characters" value={f.pass} onChange={e=>setF({...f,pass:e.target.value})}/>
          <Lbl>Confirm Password</Lbl>
          <input style={{...inp,marginBottom:4}} type="password" value={f.pass2} onChange={e=>setF({...f,pass2:e.target.value})} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          <ErrBox msg={err}/>
          <button onClick={submit} disabled={loading} style={{...pbtn(RED,"#fff"),width:"100%",marginTop:16,padding:13,fontSize:15}}>{loading?"Creating…":"Create Account →"}</button>
        </Card>
      </div>
    </div>
  );
}

export function StudentLogin({tripId,onDone,onRegister,onBack}){
  const [f,setF]=useState({email:"",pass:""});
  const [err,setErr]=useState("");
  const [showPass,setShowPass]=useState(false);
  const [loading,setLoading]=useState(false);

  const submit=async()=>{
    setErr(""); setLoading(true);
    try{
      const email=f.email.trim().toLowerCase();
      const s = await getStudentByEmail(tripId, email);
      if(!s){ setErr("No account found. Please register."); setLoading(false); return; }
      if(simpleHash(f.pass)!==s.pass_hash){ setErr("Incorrect password."); setLoading(false); return; }
      onDone(s);
    }catch(e){ setErr("Something went wrong. Please try again."); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Georgia',serif",padding:24}}>
      <div style={{maxWidth:400,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:42,marginBottom:6}}>🇮🇹</div>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:DIM,textTransform:"uppercase",marginBottom:4}}>NCDSB · Hamilton Dante</div>
          <div style={{fontSize:20,color:TXT,fontWeight:400}}>Italy Trip Portal</div>
        </div>
        <Card>
          <div style={{color:TXT,fontSize:16,marginBottom:4,fontWeight:500}}>Student Login</div>
          <div style={{color:DIM,fontSize:13,marginBottom:18}}>Sign in to select or update your rooms.</div>
          <Lbl>Email Address</Lbl>
          <input autoFocus style={{...inp,marginBottom:12}} type="email" placeholder="your@email.com" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
          <Lbl>Password</Lbl>
          <div style={{position:"relative",marginBottom:4}}>
            <input style={{...inp,paddingRight:44}} type={showPass?"text":"password"} placeholder="Your password" value={f.pass} onChange={e=>setF({...f,pass:e.target.value})} onKeyDown={e=>e.key==="Enter"&&submit()}/>
            <button onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:DIM,fontSize:16,lineHeight:1,padding:0}}>{showPass?"🙈":"👁️"}</button>
          </div>
          <ErrBox msg={err}/>
          <button onClick={submit} disabled={loading} style={{...pbtn(RED,"#fff"),width:"100%",marginTop:14,padding:13,fontSize:15}}>{loading?"Signing in…":"Sign In →"}</button>
          <div style={{textAlign:"center",marginTop:12}}>
            <button onClick={onRegister} style={{background:"transparent",border:"none",color:DIM,fontSize:13,cursor:"pointer",textDecoration:"underline"}}>New student? Register here</button>
          </div>
        </Card>
        <div style={{textAlign:"center",marginTop:14}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",color:DIM,fontSize:13,cursor:"pointer",textDecoration:"underline"}}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}

export function StudentRegister({tripId,roster,claimedNames,onDone,onLogin,onBack}){
  const [f,setF]=useState({firstName:"",lastName:"",name:"",email:"",dob:"",gender:"",passport:"",allergies:"",pass:"",pass2:""});
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [showPass,setShowPass]=useState(false);
  const [showPass2,setShowPass2]=useState(false);

  const hasRoster = roster.length > 0;

  const handleNameChange=(field,val)=>{
    const updated={...f,[field]:val};
    if(field==="firstName"||field==="lastName"){
      const last=(field==="lastName"?val:f.lastName).trim();
      const first=(field==="firstName"?val:f.firstName).trim();
      if(last&&first){
        const combined=`${last}, ${first}`;
        updated.name=combined;
        const match=roster.find(r=>r.name.toLowerCase()===combined.toLowerCase());
        if(match){
          if(!updated.dob&&match.dob) updated.dob=match.dob;
          if(!updated.gender&&match.gender) updated.gender=match.gender;
          if(!updated.passport&&match.passport) updated.passport=match.passport;
          if(!updated.allergies&&match.allergies&&!["N/A","n/a","NA"].includes(match.allergies)) updated.allergies=match.allergies;
        }
      } else { updated.name=""; }
    }
    setF(updated);
  };

  const submit=async()=>{
    if(!f.firstName.trim()||!f.lastName.trim()){setErr("Enter your first and last name.");return;}
    if(!f.email.trim()){setErr("Email address is required.");return;}
    if(!f.dob){setErr("Date of birth is required.");return;}
    if(!f.gender){setErr("Please select your gender.");return;}
    if(!f.pass){setErr("Password is required.");return;}
    if(f.pass!==f.pass2){setErr("Passwords don't match.");return;}
    if(f.pass.length<6){setErr("Password must be at least 6 characters.");return;}

    const name=`${f.lastName.trim()}, ${f.firstName.trim()}`;
    let finalName = name, finalGender = f.gender, finalDob = f.dob, finalPassport = f.passport, finalAllergies = f.allergies;

    if(hasRoster){
      const available=roster.filter(r=>!claimedNames.has(r.name));
      const rMatch=available.find(r=>r.name.toLowerCase()===name.toLowerCase());
      if(!rMatch){setErr(`"${name}" was not found on the student roster. Check your spelling or contact your teacher.`);return;}
      if(claimedNames.has(rMatch.name)){setErr("This name has already been claimed by another account.");return;}
      finalName = rMatch.name;
      finalGender = f.gender || rMatch.gender || "F";
      finalDob = f.dob || rMatch.dob || "";
      finalPassport = f.passport.trim() || rMatch.passport || "";
      finalAllergies = f.allergies.trim() || rMatch.allergies || "";
    } else {
      if(claimedNames.has(name)){setErr("This name has already been registered. If this is you, please log in instead.");return;}
    }

    setErr(""); setLoading(true);
    try{
      const student = await registerStudent(tripId, {
        email: f.email.trim(), name: finalName, passHash: simpleHash(f.pass),
        firstName: f.firstName.trim(), lastName: f.lastName.trim(),
        gender: finalGender, dob: finalDob, passport: finalPassport, allergies: finalAllergies,
      });
      onDone(student);
    }catch(e){ setErr(e.message || "Could not register. Please try again."); }
    setLoading(false);
  };

  const eyeBtn=(show,toggle)=>(
    <button onClick={toggle} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:DIM,fontSize:16,lineHeight:1,padding:0}}>{show?"🙈":"👁️"}</button>
  );

  const rosterMatch=f.name&&hasRoster?roster.find(r=>r.name.toLowerCase()===f.name.toLowerCase()):null;
  const isOnRoster=!!rosterMatch;

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Georgia',serif",padding:24,display:"flex",alignItems:"flex-start",justifyContent:"center"}}>
      <div style={{maxWidth:480,width:"100%",paddingTop:24}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:42,marginBottom:6}}>🇮🇹</div>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:DIM,textTransform:"uppercase",marginBottom:4}}>NCDSB · Hamilton Dante</div>
          <div style={{fontSize:20,color:TXT,fontWeight:400}}>Italy Trip Portal</div>
        </div>
        <Card>
          <div style={{color:TXT,fontSize:16,marginBottom:2,fontWeight:500}}>Student Registration</div>
          <div style={{color:DIM,fontSize:13,marginBottom:18,lineHeight:1.5}}>
            Create your account to select rooms. All fields marked * are required.
            {hasRoster&&<span style={{color:GRN,display:"block",marginTop:4,fontSize:12}}>✓ A student roster is loaded — your name will be verified automatically.</span>}
            {!hasRoster&&<span style={{color:"#FFD700",display:"block",marginTop:4,fontSize:12}}>ℹ️ No roster is loaded yet — enter your details as they appear on your passport.</span>}
          </div>

          <div style={{color:RED,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${BORD}`}}>Personal Information</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><Lbl>Last Name *</Lbl><input style={inp} placeholder="e.g. Agresta" value={f.lastName} onChange={e=>handleNameChange("lastName",e.target.value)}/></div>
            <div><Lbl>First Name *</Lbl><input style={inp} placeholder="e.g. Sophia" value={f.firstName} onChange={e=>handleNameChange("firstName",e.target.value)}/></div>
          </div>

          {f.name&&hasRoster&&(
            <div style={{padding:"7px 12px",borderRadius:6,background:isOnRoster?"#162318":"#3A1A1A",border:`1px solid ${isOnRoster?GRN:"#FF7B72"}`,color:isOnRoster?GRN:"#FF7B72",fontSize:12,marginBottom:12}}>
              {isOnRoster?`✓ Found on roster as "${rosterMatch.name}"`:`✗ "${f.name}" not found on roster — check your spelling or contact your teacher`}
            </div>
          )}
          {f.name&&!hasRoster&&(
            <div style={{padding:"7px 12px",borderRadius:6,background:"#1C2128",border:"1px solid #30363D",color:DIM,fontSize:12,marginBottom:12}}>ℹ️ No roster uploaded yet — your name will be registered as entered</div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><Lbl>Date of Birth *</Lbl><input style={inp} type="date" value={f.dob} onChange={e=>setF({...f,dob:e.target.value})} max={new Date().toISOString().split("T")[0]}/></div>
            <div>
              <Lbl>Gender *</Lbl>
              <div style={{display:"flex",gap:8,marginTop:2}}>
                {[["F","Female"],["M","Male"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setF({...f,gender:v})} style={{flex:1,padding:"10px 8px",borderRadius:7,border:`2px solid ${f.gender===v?RED:"#30363D"}`,background:f.gender===v?`${RED}22`:"transparent",color:f.gender===v?TXT:DIM,fontSize:13,cursor:"pointer",fontFamily:"'Georgia',serif"}}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{marginBottom:12}}><Lbl>Passport Number <span style={{textTransform:"none",letterSpacing:0,color:"#4A5568"}}>(if available)</span></Lbl><input style={inp} placeholder="e.g. P468367BI" value={f.passport} onChange={e=>setF({...f,passport:e.target.value})}/></div>
          <div style={{marginBottom:18}}><Lbl>Allergies / Medical Notes <span style={{textTransform:"none",letterSpacing:0,color:"#4A5568"}}>(write "None" if none)</span></Lbl><input style={inp} placeholder="e.g. Peanut allergy, or None" value={f.allergies} onChange={e=>setF({...f,allergies:e.target.value})}/></div>

          <div style={{color:RED,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${BORD}`}}>Account Details</div>
          <Lbl>Email Address * <span style={{textTransform:"none",letterSpacing:0,color:"#4A5568"}}>(this is your username)</span></Lbl>
          <input style={{...inp,marginBottom:12}} type="email" placeholder="your@email.com" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
          <Lbl>Password *</Lbl>
          <div style={{position:"relative",marginBottom:12}}><input style={{...inp,paddingRight:44}} type={showPass?"text":"password"} placeholder="Min. 6 characters" value={f.pass} onChange={e=>setF({...f,pass:e.target.value})}/>{eyeBtn(showPass,()=>setShowPass(s=>!s))}</div>
          <Lbl>Confirm Password *</Lbl>
          <div style={{position:"relative",marginBottom:4}}><input style={{...inp,paddingRight:44}} type={showPass2?"text":"password"} placeholder="Repeat password" value={f.pass2} onChange={e=>setF({...f,pass2:e.target.value})} onKeyDown={e=>e.key==="Enter"&&submit()}/>{eyeBtn(showPass2,()=>setShowPass2(s=>!s))}</div>

          <ErrBox msg={err}/>
          <button onClick={submit} disabled={loading} style={{...pbtn(RED,"#fff"),width:"100%",marginTop:14,padding:13,fontSize:15}}>{loading?"Creating account…":"Create Account →"}</button>
          <div style={{textAlign:"center",marginTop:12}}>
            <button onClick={onLogin} style={{background:"transparent",border:"none",color:DIM,fontSize:13,cursor:"pointer",textDecoration:"underline"}}>Already registered? Log in</button>
          </div>
        </Card>
        <div style={{textAlign:"center",marginTop:14}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",color:DIM,fontSize:13,cursor:"pointer",textDecoration:"underline"}}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}
