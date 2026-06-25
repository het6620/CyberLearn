const TODAY = "2026-06-24";
let LESSONS = [];
const grid = document.getElementById("lessonGrid");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
(function matrix(){
  const c=document.createElement("canvas");document.getElementById("matrix").appendChild(c);
  const ctx=c.getContext("2d");let w,h,cols,drops;
  const ch="01<>{}[]#$%&*ABCDEF0123456789".split("");
  function rs(){w=c.width=innerWidth;h=c.height=innerHeight;cols=Math.floor(w/16);drops=Array(cols).fill(1)}
  rs();addEventListener("resize",rs);
  setInterval(()=>{ctx.fillStyle="rgba(0,0,0,.08)";ctx.fillRect(0,0,w,h);ctx.fillStyle="#00ff41";ctx.font="15px monospace";
    drops.forEach((y,i)=>{const t=ch[Math.floor(Math.random()*ch.length)];ctx.fillText(t,i*16,y*16);if(y*16>h&&Math.random()>.975)drops[i]=0;drops[i]++})},60);
})();
const themeBtn=document.getElementById("themeToggle");
if(localStorage.theme==="light"){document.body.classList.add("light");themeBtn.textContent="☀️"}
themeBtn.onclick=()=>{document.body.classList.toggle("light");const light=document.body.classList.contains("light");themeBtn.textContent=light?"☀️":"🌙";localStorage.theme=light?"light":"dark"};
async function load(){LESSONS=await (await fetch("/api/lessons")).json();render();updateScore();}
function fmt(d){const[y,m,dd]=d.split("-");return `${dd}-${m}-${y}`}
function render(){
  grid.innerHTML="";
  LESSONS.forEach((l,i)=>{
    const locked=l.date>TODAY;const done=l.progress.learned;
    const card=document.createElement("div");
    card.className=`card ${done?"done":""} ${locked?"locked":""}`;
    card.innerHTML=`<span class="card-day">DAY ${i+1}</span><div class="card-date">📅 ${fmt(l.date)}</div><div class="card-title">${l.name}</div><div class="card-def">${l.definition}</div><div class="card-foot"><span class="badge ${done?"ok":""}">${done?"✓ Learned":"○ Pending"}</span>${l.progress.quiz_done?`<span class="badge ${l.progress.quiz_correct?"ok":"warn"}">Quiz ${l.progress.quiz_correct?"✓":"✗"}</span>`:`<span class="badge">Quiz: -</span>`}${locked?`<span class="badge warn">🔒 Locked</span>`:""}</div>`;
    if(!locked) card.onclick=()=>openLesson(i); else card.onclick=()=>alert(`🔒 Unlocks on ${fmt(l.date)}`);
    grid.appendChild(card);
  });
  const learned=LESSONS.filter(l=>l.progress.learned).length;
  document.getElementById("progressFill").style.width=(learned/LESSONS.length*100)+"%";
  document.getElementById("progressText").textContent=`${learned} / ${LESSONS.length}`;
  document.getElementById("streakNum").textContent=learned;
}
function openLesson(i){
  const l=LESSONS[i];
  modalContent.innerHTML=`<button class="close-x" onclick="closeModal()">×</button><h2>${l.name}</h2><div class="m-date">DAY ${i+1} · ${fmt(l.date)}</div><div class="sec"><h3>Definition</h3><p>${l.definition}</p></div><div class="sec"><h3>Theory</h3><p>${l.theory}</p></div><div class="sec"><h3>Example CVE</h3><span class="cve-tag">${l.cve}</span></div><div class="sec"><h3>How to Exploit (Lab Use Only)</h3><pre>${l.exploit}</pre></div><div class="sec"><h3>Mitigation</h3><p>${l.mitigation}</p></div><div class="quiz-box"><h3>🧠 Daily Quiz</h3><p style="margin-bottom:10px">${l.quiz.question}</p><div id="opts">${l.quiz.options.map((o,k)=>`<button class="opt" data-k="${k}">${String.fromCharCode(65+k)}. ${o}</button>`).join("")}</div></div><div class="learn-row"><input type="checkbox" class="chk" id="learnChk" ${l.progress.learned?"checked":""}><label for="learnChk">✅ I have learned this vulnerability today</label></div>`;
  modal.classList.add("open");
  const quizDone=l.progress.quiz_done;
  modalContent.querySelectorAll(".opt").forEach(btn=>{
    if(quizDone) btn.disabled=true;
    btn.onclick=async()=>{
      const sel=+btn.dataset.k;
      const r=await(await fetch("/api/quiz",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({date:l.date,selected:sel})})).json();
      modalContent.querySelectorAll(".opt").forEach((b,k)=>{b.disabled=true;if(k===r.answer)b.classList.add("correct");if(k===sel&&!r.correct)b.classList.add("wrong");});
      l.progress.quiz_done=1;l.progress.quiz_correct=r.correct?1:0;updateScore();
    };
  });
  document.getElementById("learnChk").onchange=async(e)=>{
    await fetch("/api/learn",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({date:l.date,learned:e.target.checked})});
    l.progress.learned=e.target.checked?1:0;render();updateScore();
  };
}
function closeModal(){modal.classList.remove("open")}
modal.onclick=e=>{if(e.target===modal)closeModal()};
async function updateScore(){
  const s=await(await fetch("/api/scorecard")).json();
  document.getElementById("scoreStats").innerHTML=`<div class="stat"><div class="num">${s.learned}/${s.total}</div><div class="lbl">Vulns Learned</div></div><div class="stat"><div class="num">${s.quizzes}/${s.total}</div><div class="lbl">Quizzes Taken</div></div><div class="stat"><div class="num">${s.score}/${s.total}</div><div class="lbl">Correct Answers</div></div><div class="stat"><div class="num">${s.percentage}%</div><div class="lbl">Mastery Score</div></div>`;
}
load();
