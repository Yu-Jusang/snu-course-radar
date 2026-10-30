import test from 'node:test';
import assert from 'node:assert/strict';
import {remaining,basketFree,ratio,selectCourses,csvCell} from '../docs/model.js';
const rows=[
 {id:'A',name:'가',capacity:30,basket:30,enrolled:20,category:'교양',department:'통계학과'},
 {id:'B',name:'나',capacity:30,basket:60,enrolled:30,category:'전필',department:'경제학부'},
 {id:'C',name:'다',capacity:100,basket:10,enrolled:120,category:'교양',department:'통계학과'},
 {id:'D',name:'라',capacity:20,basket:null,enrolled:0},
 {id:'E',name:'마',capacity:0,basket:0,enrolled:0}
];
test('장바구니와 실제 수강 인원을 구별한다',()=>{assert.equal(basketFree(rows[1]),-30);assert.equal(remaining(rows[1]),0);assert.equal(ratio(rows[1]),2);});
test('미초과는 동률 포함, 누락과 정원 0은 제외',()=>{assert.deepEqual(selectCourses(rows,{onlySafe:true,sort:'name'}).map(c=>c.id),['A','C']);});
test('경쟁률 양방향 정렬, 미확인 값은 마지막',()=>{assert.deepEqual(selectCourses(rows,{sort:'basketHigh'}).map(c=>c.id),['B','A','C','D','E']);assert.deepEqual(selectCourses(rows,{sort:'basketLow'}).map(c=>c.id),['C','A','B','D','E']);});
test('정원 초과 수강은 음수 잔여석으로 유지',()=>{assert.equal(remaining(rows[2]),-20);assert.deepEqual(selectCourses(rows,{onlySeats:true,sort:'name'}).map(c=>c.id),['A','D']);});
test('검색, 학과, 구분, 즐겨찾기 필터를 결합한다',()=>{assert.deepEqual(selectCourses(rows,{query:'통계',category:'교양',department:'통계학과',onlyStars:true},new Set(['C'])).map(c=>c.id),['C']);});
test('누락값은 0으로 간주하지 않는다',()=>{assert.equal(basketFree(rows[3]),null);assert.equal(ratio(rows[4]),null);});
test('CSV 수식과 따옴표를 안전하게 내보낸다',()=>{assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('a"b'),'"a""b"');});
