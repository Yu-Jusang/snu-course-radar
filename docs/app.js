import {remaining,basketFree,ratio,selectCourses,csvCell} from './model.js';
const $=id=>document.getElementById(id), pageSize=30;
const ids=['query','category','department','sort','onlySafe','onlySeats','onlyStars'];
let data=null,status=null,page=1,filtered=[],stars=new Set();
try{stars=new Set(JSON.parse(localStorage.getItem('snu-course-stars')||'[]'));}catch{}
const num=n=>n==null?'—':n.toLocaleString('ko-KR');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function options(){return Object.fromEntries(ids.map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value]));}
function render(){
  if(!data)return;
  filtered=selectCourses(data.courses,options(),stars);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
  $('result-count').textContent=`${num(filtered.length)}개 강좌 / 전체 ${num(data.total)}개`;
  $('empty').hidden=filtered.length>0;$('empty').textContent='조건에 맞는 강좌가 없습니다. 검색어나 필터를 바꿔보세요.';
  $('rows').innerHTML=filtered.slice((page-1)*pageSize,page*pageSize).map(c=>{
    const r=ratio(c),free=basketFree(c),seats=remaining(c),over=r!==null&&r>1;
    return `<tr><td><button class="star" data-id="${esc(c.id)}" aria-pressed="${stars.has(c.id)}" aria-label="${esc(c.name)} 즐겨찾기">${stars.has(c.id)?'★':'☆'}</button></td><td><div class="course-title"><span class="badge">${esc(c.category)}</span>${esc(c.name)}</div><div class="meta">${esc(c.instructor)} · ${esc(c.department)} · ${esc(c.id)} · ${num(c.credits)}학점</div><div class="meta">${esc(c.schedule)}</div>${c.flags?`<div class="flags"><span>${esc(c.flags)}</span></div>`:''}</td><td title="재학생 정원 ${num(c.currentStudentCapacity)}">${num(c.capacity)}</td><td>${num(c.basket)}</td><td class="${over?'over':''}"><span class="ratio">${r===null?'—':r.toFixed(2)+' : 1'}</span><span class="bar"><i style="width:${r===null?0:Math.min(100,r*100)}%"></i></span></td><td class="${free<0?'over':free>0?'positive':''}">${free===null?'—':free<0?num(-free)+' 초과':num(free)}</td><td title="총수강인원 ${num(c.totalEnrolled)}">${num(c.enrolled)}</td><td class="${seats>0?'positive':''}">${num(seats)}</td></tr>`;
  }).join('');
  $('page-info').textContent=`${page} / ${pages}`;$('prev').disabled=page<=1;$('next').disabled=page>=pages;
}
function freshness(){if(!data)return;const old=Date.now()-Date.parse(data.updatedAt)>30*60000;const failed=status?.ok===false;const el=$('freshness');el.textContent=failed?'수집 지연 · 마지막 성공 자료':old?'30분 이상 지난 자료':'최근 수집 자료';el.classList.toggle('warning',old||failed);$('timestamp').textContent=new Date(data.updatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' KST 기준';}
async function load(){
  $('refresh').disabled=true;
  try{
    const res=await fetch(`data/courses.json?t=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw Error();const next=await res.json();
    if(!Array.isArray(next.courses)||!next.updatedAt||next.total!==next.courses.length)throw Error();
    data=next;status=await fetch(`data/status.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
    $('term').textContent=data.term;$('total').textContent=num(data.total);
    $('uncrowded').textContent=num(data.courses.filter(c=>c.capacity>0&&basketFree(c)!==null&&basketFree(c)>=0).length);
    $('crowded').textContent=num(data.courses.filter(c=>basketFree(c)!==null&&basketFree(c)<0).length);
    $('available').textContent=num(data.courses.filter(c=>remaining(c)>0).length);
    for(const id of ['category','department']){const previous=$(id).value;$(id).innerHTML=`<option value="">${id==='category'?'전체 구분':'전체 학과'}</option>`+[...new Set(data.courses.map(c=>c[id]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko')).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');$(id).value=previous;}
    freshness();render();
  }catch{$('freshness').textContent='자료를 불러오지 못했습니다';$('freshness').classList.add('warning');if(!data){$('empty').textContent='공개 강좌 자료에 연결하지 못했습니다. 잠시 후 다시 불러오기를 눌러주세요.';$('result-count').textContent='연결 확인 필요';}else{$('timestamp').textContent+=' · 이전 자료 유지';}}
  finally{$('refresh').disabled=false;}
}
ids.forEach(id=>$(id).addEventListener(id==='query'?'input':'change',()=>{page=1;render();}));
$('reset').onclick=()=>{for(const id of ids){if($(id).type==='checkbox')$(id).checked=false;else $(id).value=id==='sort'?'basketFree':'';}page=1;render();};
$('rows').onclick=e=>{const b=e.target.closest('button[data-id]');if(!b)return;stars.has(b.dataset.id)?stars.delete(b.dataset.id):stars.add(b.dataset.id);try{localStorage.setItem('snu-course-stars',JSON.stringify([...stars]));}catch{}render();};
$('prev').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};$('refresh').onclick=load;
$('download').onclick=()=>{if(!data)return;const columns=['교과목번호','강좌명','교수','학과','이수구분','시간','정원','장바구니','장바구니 경쟁률','장바구니 여유','수강신청','수강 잔여석','제한 표시','수집시각'];const lines=[columns,...filtered.map(c=>[c.id,c.name,c.instructor,c.department,c.category,c.schedule,c.capacity,c.basket,ratio(c),basketFree(c),c.enrolled,remaining(c),c.flags,data.updatedAt])];const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='snu-courses.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
load();setInterval(load,600000);setInterval(freshness,60000);
