let token = localStorage.getItem("carepointToken") || "";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(url, options={}) {
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(token) headers.Authorization="Bearer "+token;
  const response=await fetch(url,{...options,headers});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2500)}
function setLoggedIn(on){$("#login-view").classList.toggle("hidden",on);$("#app-view").classList.toggle("hidden",!on)}
function initials(name){return String(name).split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function patientCells(p,full=false){return `<tr><td class="patient-name">${esc(p.name)}</td><td>${esc(p.patientId)}</td><td>${esc(p.age)}</td><td>${esc(p.department)}</td><td>${esc(p.phone)}</td>${full?`<td><span class="tag">${esc(p.status)}</span></td><td><button class="action" data-delete-patient="${esc(p.id)}">Delete</button></td>`:""}</tr>`}
async function loadDashboard(){const d=await api("/api/dashboard");$("#stat-patients").textContent=d.totalPatients;$("#stat-appointments").textContent=d.totalAppointments;$("#stat-today").textContent=d.todayAppointments;const p=await api("/api/patients");$("#recent-body").innerHTML=p.slice(0,5).map(x=>patientCells(x)).join("")||'<tr><td colspan="5">No patients yet. Register your first patient.</td></tr>'}
async function loadPatients(q=""){const p=await api("/api/patients?q="+encodeURIComponent(q));$("#patients-body").innerHTML=p.map(x=>patientCells(x,true)).join("")||'<tr><td colspan="7">No matching patient records.</td></tr>'}
async function loadAppointments(){const list=await api("/api/appointments");$("#appointments-body").innerHTML=list.map(a=>`<tr><td class="patient-name">${esc(a.patientName)}</td><td>${esc(a.doctor)}</td><td>${esc(a.department)}</td><td>${esc(a.date)}</td><td>${esc(a.time)}</td><td><span class="tag">${esc(a.status)}</span></td><td><button class="action" data-delete-appointment="${esc(a.id)}">Cancel</button></td></tr>`).join("")||'<tr><td colspan="7">No appointments yet.</td></tr>'}
const doctors=[["Dr. Priya Sharma","Cardiologist","Cardiology","09:00 AM – 02:00 PM"],["Dr. Arjun Rao","General Physician","General Medicine","10:00 AM – 04:00 PM"],["Dr. Meera Iyer","Dermatologist","Dermatology","09:30 AM – 01:30 PM"],["Dr. Karthik Nair","Orthopedic Surgeon","Orthopedics","11:00 AM – 05:00 PM"],["Dr. Sneha Patel","Pediatrician","Pediatrics","09:00 AM – 03:00 PM"],["Dr. Vikram Das","Neurologist","Neurology","12:00 PM – 06:00 PM"]];
const departments=[["General Medicine","✚","Primary care, routine checkups and common illnesses.","4 doctors"],["Cardiology","♡","Heart health and cardiac evaluation.","2 doctors"],["Neurology","⌘","Brain, spine and nervous system care.","2 doctors"],["Pediatrics","♧","Care for infants, children and adolescents.","3 doctors"],["Orthopedics","♢","Bone, joint, muscle and mobility care.","3 doctors"],["Dermatology","◉","Skin, hair and nail condition care.","2 doctors"]];
$("#doctor-grid").innerHTML=doctors.map(d=>`<article class="doc-card"><div class="doc-icon">⚕</div><h3>${esc(d[0])}</h3><p>${esc(d[1])} · ${esc(d[2])}</p><small>Clinic hours: ${esc(d[3])}</small></article>`).join("");
$("#department-grid").innerHTML=departments.map(d=>`<article class="dept-card"><div class="dept-icon">${d[1]}</div><h3>${esc(d[0])}</h3><p>${esc(d[2])}</p><small>${esc(d[3])}</small></article>`).join("");
async function refresh(){await Promise.all([loadDashboard(),loadPatients(),loadAppointments()])}
async function login(e){e.preventDefault();$("#login-error").textContent="";const f=new FormData(e.currentTarget);try{const d=await api("/api/auth/login",{method:"POST",body:JSON.stringify({username:f.get("username"),password:f.get("password")})});token=d.token;localStorage.setItem("carepointToken",token);$("#user-name").textContent=d.user.username;setLoggedIn(true);await refresh()}catch(err){$("#login-error").textContent=err.message}}
$("#login-form").addEventListener("submit",login);
$("#logout").onclick=()=>{token="";localStorage.removeItem("carepointToken");setLoggedIn(false)};
function go(page){document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));$("#"+page+"-page").classList.remove("hidden");document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#page-title").textContent=page[0].toUpperCase()+page.slice(1);if(page==="patients")loadPatients($("#patient-search").value);if(page==="appointments")loadAppointments()}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));document.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>go(b.dataset.goto));
$("#date-label").textContent=new Intl.DateTimeFormat("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(new Date());
const pd=$("#patient-dialog"),ad=$("#appointment-dialog");
$("#header-add").onclick=$("#new-patient").onclick=()=>pd.showModal();$("#new-appointment").onclick=()=>ad.showModal();
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).close());
$("#patient-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api("/api/patients",{method:"POST",body:JSON.stringify(Object.fromEntries(f))});e.currentTarget.reset();pd.close();await refresh();toast("Patient saved to backend.");}catch(err){toast(err.message)}});
$("#appointment-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api("/api/appointments",{method:"POST",body:JSON.stringify(Object.fromEntries(f))});e.currentTarget.reset();ad.close();await refresh();toast("Appointment saved to backend.");}catch(err){toast(err.message)}});
$("#patient-search").addEventListener("input",e=>loadPatients(e.target.value).catch(err=>toast(err.message)));
document.addEventListener("click",async e=>{const p=e.target.closest("[data-delete-patient]");const a=e.target.closest("[data-delete-appointment]");try{if(p&&confirm("Delete this patient record?")){await api("/api/patients/"+encodeURIComponent(p.dataset.deletePatient),{method:"DELETE"});await refresh();toast("Patient deleted.");}if(a&&confirm("Cancel this appointment?")){await api("/api/appointments/"+encodeURIComponent(a.dataset.deleteAppointment),{method:"DELETE"});await refresh();toast("Appointment cancelled.");}}catch(err){toast(err.message)}});
(async()=>{try{if(token){await api("/api/auth/me");setLoggedIn(true);await refresh()}else setLoggedIn(false)}catch{token="";localStorage.removeItem("carepointToken");setLoggedIn(false)}})();
