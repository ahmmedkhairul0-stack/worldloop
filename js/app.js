import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && SUPABASE_ANON_KEY.length > 20 && !SUPABASE_ANON_KEY.includes("YOUR_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }}) : null;
let session=null, profile=null, lessons=[], filter="ALL", mode="signup";
const $=id=>document.getElementById(id);
const categoryEmoji={LANGUAGE:"Aa",CULTURE:"🌍",CREATIVITY:"✳",ART:"🎨",SKILLS:"💡"};
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");clearTimeout(window._toast);window._toast=setTimeout(()=>$("toast").classList.remove("show"),2800)}
function modal(panel="auth"){ $("modal").classList.remove("hidden"); $("authPanel").classList.toggle("hidden",panel!=="auth");$("postPanel").classList.toggle("hidden",panel!=="post");$("detailPanel").classList.add("hidden"); }
function closeModal(){$("modal").classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(x=>x.onclick=closeModal);
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
function requireBackend(){if(!configured){toast("Connect your Supabase project first — see SETUP.md");return false}return true}
function setAuthUI(){const signed=!!session;$("authBtn").classList.toggle("hidden",signed);$("logoutBtn").classList.toggle("hidden",!signed);$("postBtn").textContent=signed?"Share a lesson +":"Join to share +";$("userLabel").textContent=profile?.display_name?`Hi, ${profile.display_name}`:"";$("lessonCount").textContent=lessons.length}
async function loadProfile(){if(!session){profile=null;return}const {data}=await supabase.from("profiles").select("display_name").eq("id",session.user.id).maybeSingle();profile=data}
async function loadLessons(){
 if(!configured){$("lessonGrid").innerHTML='<div class="loading">Connect Supabase to load the live community. Sample preview lessons are available in the setup package README.</div>';setAuthUI();return}
 const {data,error}=await supabase.from("lessons").select("id,title,body,category,country,created_at,profiles(display_name)").eq("status","approved").order("created_at",{ascending:false}).limit(60);
 if(error){$("lessonGrid").innerHTML='<div class="loading">Could not load lessons. Check your Supabase setup and policies.</div>';console.error(error);return}
 lessons=data||[];render();setAuthUI()
}
function render(){
 const q=$("search").value.trim().toLowerCase();
 const list=lessons.filter(l=>(filter==="ALL"||l.category===filter)&&[l.title,l.body,l.country,l.category,l.profiles?.display_name].join(" ").toLowerCase().includes(q));
 $("lessonGrid").innerHTML=list.map(l=>`<article class="lesson"><div class="lesson-top"><span class="tag">${categoryEmoji[l.category]||"✦"} ${l.category}</span><span class="by">${new Date(l.created_at).toLocaleDateString()}</span></div><h3>${esc(l.title)}</h3><p>${esc(l.body)}</p><div class="lesson-foot"><span class="by">${esc(l.country||"Global")} · ${esc(l.profiles?.display_name||"WORLDLOOP member")}</span><div class="actions"><button class="icon-btn" data-save="${l.id}" title="Save lesson">♡ Save</button><button class="icon-btn" data-done="${l.id}" title="Mark learned">✓</button><button class="icon-btn" data-report="${l.id}" title="Report lesson">⚑</button></div></div></article>`).join("");
 $("empty").classList.toggle("hidden",list.length>0);
 $("lessonCount").textContent=lessons.length;
}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("search").addEventListener("input",render);
$("filters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;filter=b.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));render()});
$("lessonGrid").addEventListener("click",async e=>{
 const b=e.target.closest("button");if(!b)return;
 if(!session){toast("Please log in first to save, track or report lessons.");return}
 const id=b.dataset.save||b.dataset.done||b.dataset.report;if(!id)return;
 if(b.dataset.save){
  const {data:existing}=await supabase.from("saved_lessons").select("lesson_id").eq("lesson_id",id).maybeSingle();
  if(existing){const {error}=await supabase.from("saved_lessons").delete().eq("lesson_id",id);if(error)toast(error.message);else toast("Removed from saved lessons")}
  else{const {error}=await supabase.from("saved_lessons").insert({lesson_id:id});if(error)toast(error.message);else toast("Lesson saved")}
 } else if(b.dataset.done){
  const {error}=await supabase.from("lesson_completions").upsert({lesson_id:id,user_id:session.user.id},{onConflict:"user_id,lesson_id"});toast(error?"Could not update progress":"Marked as learned");
 } else {
  const reason=prompt("Briefly tell moderators why this lesson should be reviewed. Do not include personal information.");if(!reason)return;
  const {error}=await supabase.from("lesson_reports").insert({lesson_id:id,reporter_id:session.user.id,reason:reason.slice(0,500)});toast(error?"Could not submit report": "Report sent to moderators. Thank you.");
 }
});
function setMode(m){mode=m;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===m));$("nameLabel").classList.toggle("hidden",m!=="signup");$("displayName").classList.toggle("hidden",m!=="signup");$("displayName").required=m==="signup";$("password").autocomplete=m==="signup"?"new-password":"current-password";$("authSubmit").textContent=m==="signup"?"Create account →":"Log in →";$("modalTitle").textContent=m==="signup"?"Join the loop.":"Welcome back."; }
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$("authBtn").onclick=()=>{modal("auth");setMode("login")};
$("joinBtn").onclick=()=>{modal("auth");setMode("signup")};
$("postBtn").onclick=$("heroPost").onclick=()=>{if(!session){modal("auth");setMode("signup");return}modal("post")};
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!requireBackend())return;
 const email=$("email").value.trim(),password=$("password").value;
 let result;
 if(mode==="signup")result=await supabase.auth.signUp({email,password,options:{data:{display_name:$("displayName").value.trim()}}});
 else result=await supabase.auth.signInWithPassword({email,password});
 if(result.error){toast(result.error.message);return}
 if(mode==="signup"&&!result.data.session){toast("Check your email to confirm your account, then log in.");closeModal();return}
 session=result.data.session;await loadProfile();setAuthUI();closeModal();toast(mode==="signup"?"Welcome to WORLDLOOP!":"You are logged in.");await loadLessons();
});
$("resetPassword").onclick=async()=>{if(!requireBackend())return;const email=$("email").value.trim();if(!email){toast("Enter your email address first.");return}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin});toast(error?error.message:"If that email has an account, a reset link has been sent.")};
$("lessonForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!session){toast("Please log in first.");return}
 const row={title:$("lessonTitle").value.trim(),category:$("lessonCategory").value,body:$("lessonBody").value.trim(),country:$("lessonCountry").value.trim()||null,author_id:session.user.id,status:"pending"};
 const {error}=await supabase.from("lessons").insert(row);
 if(error){toast(error.message);return}
 e.target.reset();closeModal();toast("Submitted! Your lesson will appear after moderator review.");
});
$("logoutBtn").onclick=async()=>{await supabase.auth.signOut();session=null;profile=null;setAuthUI();toast("Logged out.");};
$("year").textContent=new Date().getFullYear();
async function init(){
 if(!configured){setAuthUI();await loadLessons();return}
 const {data}=await supabase.auth.getSession();session=data.session;
 await loadProfile();setAuthUI();await loadLessons();
 supabase.auth.onAuthStateChange(async(_event,newSession)=>{session=newSession;await loadProfile();setAuthUI();});
}
init();
