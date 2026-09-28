import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const SETS = {
  main:   {label:"Main Set", total:201, prefix:"", sub:"Your regular cards"},
  secret: {label:"Secret Rares", total:39, prefix:"S", sub:"Your secret rare cards"},
  promo:  {label:"Promos", total:10, prefix:"P", sub:"Your promo cards"}
};

let current="main";
let cards={};
let db=null;
let user=null;

const $=id=>document.getElementById(id);
const key=(s,id)=>`${s}-${id}`;
const pad=n=>String(n).padStart(3,"0");
const label=(s,id)=>SETS[s].prefix+pad(id);

function setConnection(ok,text){
  $("connection").classList.toggle("offline",!ok);
  $("connection").querySelector(".dot").classList.toggle("offline",!ok);
  $("connectionText").textContent=text;
}
function toast(msg){
  const t=$("toast"); t.textContent=msg; t.classList.remove("hidden");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>t.classList.add("hidden"),2600);
}
function escapeHtml(s){return (s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

async function connect(){
  try{
    const app=initializeApp(firebaseConfig);
    const auth=getAuth(app);
    db=getFirestore(app);
    await signInAnonymously(auth);
    user=auth.currentUser;
    setConnection(true,"Shared collection online");
    onSnapshot(collection(db,"cards"),snap=>{
      cards={};
      snap.forEach(d=>cards[d.id]=d.data());
      render();
    },err=>{
      console.error(err); setConnection(false,"Database connection error — check Firebase rules");
    });
  }catch(err){
    console.error(err);
    setConnection(false,"Firebase isn't configured yet");
    toast("Open FIREBASE_SETUP.md and connect your Firebase project.");
    render();
  }
}

async function saveCardRecord(id,record){
  if(!db||!user) throw new Error("Not connected");
  await setDoc(doc(db,"cards",key(current,id)),{
    ...record, section:current, number:id,
    updatedAt:new Date().toISOString(),
    updatedBy:user.uid
  });
}
async function removeCardRecord(id){
  if(!db||!user) throw new Error("Not connected");
  await deleteDoc(doc(db,"cards",key(current,id)));
}

function render(){
  const s=SETS[current], q=$("search").value.trim().toLowerCase();
  $("sectionTitle").innerHTML=`${s.label} <span>(${s.prefix}001–${s.prefix}${pad(s.total)})</span>`;
  $("sectionSub").textContent=s.sub;
  const filled=Object.values(cards).filter(c=>c.section===current).length;
  const pct=Math.round(filled/s.total*100);
  $("completed").textContent=`${filled} / ${s.total}`;
  $("percent").textContent=`${pct}%`;
  $("progressBar").style.width=`${pct}%`;
  $("grid").innerHTML="";
  let shown=0;

  for(let i=1;i<=s.total;i++){
    const id=label(current,i), rec=cards[key(current,i)];
    if(q && !id.toLowerCase().includes(q) && !(rec?.name||"").toLowerCase().includes(q) && !(rec?.note||"").toLowerCase().includes(q)) continue;
    shown++;
    const el=document.createElement("div");
    el.className="slot"+(rec?"":" empty");
    if(rec){
      el.innerHTML=`<span class="slot-number">${id}</span>
        <button class="edit">✎</button>
        <img src="${rec.image}" alt="${escapeHtml(rec.name||id)}">
        ${rec.name?`<div class="card-name">${escapeHtml(rec.name)}</div>`:""}`;
      el.querySelector("img").onclick=()=>openViewer(rec,id);
      el.querySelector(".edit").onclick=e=>{e.stopPropagation();openModal(i)};
    }else{
      el.innerHTML=`<span class="slot-number">${id}</span><div class="pokeball"></div><span>Empty</span>`;
      el.onclick=()=>openModal(i);
    }
    $("grid").appendChild(el);
  }
  if(!shown)$("grid").innerHTML=`<div class="no-results">No cards match your search.</div>`;
}

function populateSlots(selected=1){
  slotSelect.innerHTML="";
  for(let i=1;i<=SETS[current].total;i++){
    const o=document.createElement("option");
    o.value=i;o.textContent=label(current,i);slotSelect.appendChild(o);
  }
  slotSelect.value=selected;
}
function syncModalFields(){
  const id=Number(slotSelect.value), rec=cards[key(current,id)];
  $("cardName").value=rec?.name||"";
  $("cardNote").value=rec?.note||"";
  $("fileInput").value="";
  $("removeCard").classList.toggle("hidden",!rec);
  $("modalTitle").textContent=rec?`Edit ${label(current,id)}`:`Add ${label(current,id)}`;
}
function openModal(id=1){populateSlots(id);syncModalFields();$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}

function resizeImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload=()=>{
      const max=1000, scale=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement("canvas");
      c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg",.76));
    };
    img.onerror=reject;img.src=url;
  });
}

async function save(){
  if(!db||!user){toast("The shared database is not connected yet.");return}
  const id=Number(slotSelect.value), old=cards[key(current,id)], file=$("fileInput").files[0];
  try{
    $("saveCard").disabled=true;
    let image=old?.image;
    if(file) image=await resizeImage(file);
    if(!image) throw new Error("Please choose a card image.");
    await saveCardRecord(id,{image,name:$("cardName").value.trim(),note:$("cardNote").value.trim()});
    closeModal();toast(`${label(current,id)} saved to the shared collection.`);
  }catch(e){console.error(e);toast(e.message||"Couldn't save the card.");}
  finally{$("saveCard").disabled=false}
}

function openViewer(rec,id){
  $("viewerImg").src=rec.image;
  $("viewerCaption").textContent=rec.name?`${id} — ${rec.name}${rec.note?" • "+rec.note:""}`:id;
  $("viewer").classList.remove("hidden");
}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");current=b.dataset.set;$("search").value="";render();
});
$("uploadBtn").onclick=()=>openModal(1);
$("closeModal").onclick=closeModal;
$("saveCard").onclick=save;
$("slotSelect").onchange=syncModalFields;
$("removeCard").onclick=async()=>{
  const id=Number(slotSelect.value);
  if(!confirm(`Remove ${label(current,id)} from the shared collection?`))return;
  try{await removeCardRecord(id);closeModal();toast(`${label(current,id)} removed.`)}catch(e){toast("Couldn't remove the card.")}
};
$("viewerClose").onclick=()=>$("viewer").classList.add("hidden");
$("search").oninput=render;

$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(cards,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="pokemon-binder-backup.json";a.click();URL.revokeObjectURL(a.href);
};
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const incoming=JSON.parse(await f.text());
    if(!db||!user)throw new Error();
    if(!confirm("Import this backup and overwrite matching slots?"))return;
    for(const [id,rec] of Object.entries(incoming)){
      if(rec?.image && rec?.section) await setDoc(doc(db,"cards",id),rec);
    }
    toast("Backup imported.");
  }catch{toast("That backup file couldn't be imported.")}
  e.target.value="";
};
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();$("viewer").classList.add("hidden")}});

connect();
