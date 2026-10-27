/* กิจกรรมเรียนซ่อมเสริมและสอบแก้ตัว 1/2569 — โรงเรียนพรตพิทยพยัต */
(function () {
  'use strict';
  /* D = ข้อมูลการแก้ไขผลการเรียน ครั้งที่ 2 (data/data2.js) · D1 = ข้อมูลครั้งที่ 1 (data/data.js เก็บไว้อ้างอิง ใช้เฉพาะตัวเลขสรุป) */
  var D = window.PROT2 || window.PROT;
  var D1 = window.PROT;
  var GR = ['0', 'ร', 'มส', 'มผ'];
  var GCLS = { '0': 'gb-0', 'ร': 'gb-r', 'มส': 'gb-ms', 'มผ': 'gb-mp' };
  var app = document.getElementById('app');

  /* ---------- indexes ---------- */
  var S = {}, T = {}, R = {};
  D.students.forEach(function (s) { S[s.code] = s; });
  D.teachers.forEach(function (t) { T[t.id] = t; });
  D.rooms.forEach(function (r) { R[r.key] = r; });
  var GKEYS = Object.keys(D.groups);

  /* ---------- utils ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function roomSort(a, b) {
    var x = a.replace('ม.', '').split('/'), y = b.replace('ม.', '').split('/');
    return (+x[0] - +y[0]) || (+x[1] - +y[1]);
  }
  function gb(g) { return '<span class="gb ' + GCLS[g] + '">' + esc(g) + '</span>'; }
  function countChips(c) {
    return GR.filter(function (g) { return c[g]; })
      .map(function (g) { return gb(g) + ' <span class="small muted">' + c[g] + '</span>'; })
      .join(' &nbsp; ');
  }
  function stuPhoto(s) {
    return s.photo ? 'photos/students/' + s.code + '.jpg' : '';
  }
  function avatar(src, alt, cls) {
    cls = 'avatar ' + (cls || '');
    if (!src) return '<div class="' + cls + ' ph">ไม่มีรูป</div>';
    return '<img class="' + cls + '" loading="lazy" src="' + src + '" alt="' + esc(alt) + '" ' +
      'onerror="this.outerHTML=\'<div class=&quot;' + cls + ' ph&quot;>ไม่มีรูป</div>\'">';
  }
  function tPhoto(t) { return t && t.photo ? 'photos/teachers/' + t.photo : ''; }
  function personT(t, link, sub) {
    if (!t) return '<span class="muted">—</span>';
    var nm = esc(t.name);
    if (link === true) nm = '<a href="#/teacher/' + t.id + '">' + nm + '</a>';
    return '<div class="person">' + avatar(tPhoto(t), t.name, 'sm') +
      '<div><div class="nm">' + nm + '</div>' +
      (sub ? '<div class="meta">' + sub + '</div>' : '') + '</div></div>';
  }
  function personS(s, sub) {
    return '<div class="person">' + avatar(stuPhoto(s), s.name, 'sm') +
      '<div><div class="nm"><a href="#/student/' + s.code + '">' + esc(s.name) + '</a></div>' +
      '<div class="meta">' + esc(s.room) + ' เลขที่ ' + esc(s.no) + ' · ' + esc(s.code) +
      (sub ? ' · ' + sub : '') + '</div></div></div>';
  }
  function gname(k) { return D.groups[k] ? D.groups[k].name : k; }
  function sessTxt(k, which, room2) {
    var g = D.groups[k]; if (!g) return '—';
    var s = g[which];
    var place = (which === 'r2' && room2) ? room2 : s.place;
    return '<span class="d">รอบที่ ' + s.round + ' · ' + esc(s.day) + '</span><br>' +
      '<span class="p">' + esc(s.time) + ' · ' + esc(place) + '</span>';
  }
  function store(key, val) {
    try {
      if (val === undefined) { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
  function nf(n) { return Number(n).toLocaleString('th-TH'); }
  function doneList(s) { return s.done || []; }
  function passChip(d) {
    return '<span class="chip chip-pass">ผ่านแล้ว · ได้ ' + esc(d.new) + '</span>';
  }
  /* ตัดคำนำหน้าชื่อเพื่อใช้เรียงตามตัวอักษร */
  function bareName(n) { return String(n || '').replace(/^(ครู\s*|ว่าที่\s*ร\.?\s*ต\.?\s*(หญิง)?\s*|นางสาว|นาง|นาย|Miss\s*|Mrs\.?\s*|Mr\.?\s*|Ms\.?\s*)/i, '').trim(); }
  function byName(a, b) { return bareName(a.name).localeCompare(bareName(b.name), 'th'); }
  function privacyNote(txt) {
    return '<div class="notice info" style="margin-top:14px">' + txt + '</div>';
  }
  /* ทำให้ทั้งแถวของตารางกดได้ เมื่อแถวนั้นมี data-href */
  function bindRows() {
    document.querySelectorAll('tr[data-href]').forEach(function (tr) {
      if (tr.getAttribute('data-bound')) return;
      tr.setAttribute('data-bound', '1');
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a, button, input, label')) return;
        location.hash = tr.getAttribute('data-href');
      });
    });
  }

  /* ---------- session grouping for a student ---------- */
  function sessionsOf(stu, which) {
    var map = {};
    stu.items.forEach(function (it) {
      var g = D.groups[it.g]; if (!g) return;
      var s = g[which];
      var place = (which === 'r2' && it.room2) ? it.room2 : s.place;
      var key = s.day + '|' + s.time + '|' + place;
      if (!map[key]) map[key] = { round: s.round, day: s.day, time: s.time, place: place, items: [] };
      map[key].items.push(it);
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.day.localeCompare(b.day, 'th') || a.round - b.round; });
  }

  /* ================= OVERVIEW ================= */
  function viewOverview() {
    var m = D.meta;
    var lvl = {};
    D.rooms.forEach(function (r) {
      var L = r.key.split('/')[0];
      lvl[L] = lvl[L] || { n: 0, rooms: 0, c: { '0': 0, 'ร': 0, 'มส': 0, 'มผ': 0 } };
      lvl[L].n += r.n; lvl[L].rooms++;
      GR.forEach(function (g) { lvl[L].c[g] += r.counts[g]; });
    });
    var maxLoad = 0;
    GKEYS.forEach(function (k) { var l = D.stationLoad[k]; if (l && l.students > maxLoad) maxLoad = l.students; });

    var h = '';
    h += '<h1 class="page-title">ภาพรวมการแก้ไขผลการเรียน ครั้งที่ 2</h1>' +
      '<p class="page-lead">ภาคเรียนที่ 1 ปีการศึกษา 2569 · แก้ไขที่โรงเรียน วันพุธที่ 28 – วันศุกร์ที่ 30 ตุลาคม 2569 · ประกาศผลทางระบบ SGS' +
      '<br>รายชื่อจากผลการเรียนในระบบ SGS ณ <strong>' + esc(m.asOf) + '</strong></p>';
    h += announceBox();

    h += '<div class="grid g4">' +
      '<div class="stat accent"><div class="k">นักเรียนที่ต้องแก้ผลการเรียน ครั้งที่ 2</div><div class="v">' + nf(m.totalStudentsWithIssue) + '</div><div class="n">คน · ใน ' + nf(D.rooms.length) + ' ห้องเรียน</div></div>' +
      '<div class="stat"><div class="k">รายการวิชาที่ต้องแก้ (0 / ร / มผ)</div><div class="v">' + nf(m.totalSubjectEntries) + '</div><div class="n">รายการ</div></div>' +
      '<div class="stat"><div class="k">แยกตามผลการเรียน</div><div class="v" style="font-size:1.25rem; line-height:1.6">0 = ' + nf(m.byGrade['0']) + ' · ร = ' + nf(m.byGrade['ร']) + ' · มผ = ' + nf(m.byGrade['มผ']) + '</div></div>' +
      '<div class="stat"><div class="k">ผลการเรียน มส</div><div class="v" style="font-size:1.25rem">ไม่อยู่ในรอบนี้</div><div class="n">รอรอบเรียนซ้ำ ครั้งที่ 2/2569</div></div>' +
      '</div>';

    h += '<div class="card" style="margin-top:18px"><div class="card-head"><h2>กำหนดการสำคัญ ครั้งที่ 2</h2>' +
      '<span class="chip chip-alert">แก้ไขที่โรงเรียน 28 – 30 ต.ค. 2569</span></div><div class="card-body"><div class="tl">' +
      CAL2.map(function (r) { var st = calState(r); return tl(r.d, r.a, r.t + ' · ' + r.w, CAL_LBL[st]); }).join('') +
      '</div><div class="small" style="margin-top:10px"><a href="#/schedule">ดูหน้าปฏิทินฉบับเต็ม รวมกำหนดการครั้งที่ 1</a></div></div></div>';

    h += '<div class="card"><div class="card-head"><h2>ปริมาณงานของแต่ละกลุ่มสาระการเรียนรู้</h2>' +
      '<span class="small muted">นับจากรายชื่อแก้ผลการเรียน ครั้งที่ 2</span></div><div class="table-scroll">' +
      '<table><thead><tr><th>กลุ่มสาระ / กลุ่มงาน</th><th class="num">นักเรียน</th><th class="num">รายการวิชา</th>' +
      '</tr></thead><tbody>';
    GKEYS.map(function (k) { return { k: k, l: D.stationLoad[k] || { students: 0, entries: 0 } }; })
      .filter(function (o) { return o.l.students; })
      .sort(function (x, y) { return y.l.students - x.l.students; })
      .forEach(function (o) {
        var g = D.groups[o.k];
        h += '<tr><td>' + esc(g.name) + '</td>' +
          '<td class="num"><div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><span>' + o.l.students + '</span>' +
          '<span class="bar" style="width:90px"><span style="width:' + Math.round(o.l.students / maxLoad * 100) + '%"></span></span></div></td>' +
          '<td class="num">' + o.l.entries + '</td></tr>';
      });
    h += '</tbody></table></div></div>';

    h += '<div class="card" style="margin-top:18px"><div class="card-head"><h2>แยกตามระดับชั้น</h2>' +
      '<span class="small muted">ตัวเลขภาพรวมระดับชั้น ไม่แสดงรายห้อง รายวิชา หรือรายบุคคล</span></div><div class="table-scroll"><table>' +
      '<thead><tr><th>ระดับชั้น</th><th class="num">นักเรียนที่ต้องแก้</th><th class="num">0</th><th class="num">ร</th><th class="num">มผ</th><th class="num">รวมรายการ</th></tr></thead><tbody>';
    ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].forEach(function (L) {
      var v = lvl[L]; if (!v) return;
      h += '<tr><td><strong>' + L + '</strong></td><td class="num">' + v.n + '</td>' +
        '<td class="num">' + v.c['0'] + '</td><td class="num">' + v.c['ร'] + '</td><td class="num">' + v.c['มผ'] + '</td>' +
        '<td class="num">' + (v.c['0'] + v.c['ร'] + v.c['มผ']) + '</td></tr>';
    });
    h += '</tbody></table></div></div>';

    h += '<div class="grid g3" style="margin-top:18px">' +
      '<a class="stat golink" href="#/students"><div class="k">สำหรับนักเรียน</div><div class="gl-t">ตรวจสอบรายบุคคล</div><div class="n">กรอกรหัสประจำตัว 5 หลัก</div></a>' +
      '<a class="stat golink" href="#/teachers"><div class="k">สำหรับครูประจำวิชา</div><div class="gl-t">ดูรายชื่อในรายวิชาของท่าน</div><div class="n">เลือกชื่อของท่าน</div></a>' +
      '<a class="stat golink" href="#/advisors"><div class="k">สำหรับครูที่ปรึกษา</div><div class="gl-t">กำกับติดตามห้องของท่าน</div><div class="n">ห้องเรียนภาคเรียนที่ 2/2569</div></a>' +
      '</div>';

    h += '<div class="notice warn" style="margin-top:18px"><strong>ข้อควรทราบ</strong> การแก้ไขผลการเรียน ครั้งที่ 2 แก้เฉพาะผลการเรียน 0 / ร / มผ ' +
      'ของรายวิชาภาคเรียนที่ 1/2569 · รายวิชาที่ได้ มส และรายวิชาของภาคเรียนอื่น ไม่อยู่ในรอบนี้ ให้รอรอบเรียนซ้ำ ครั้งที่ 2/2569 ซึ่งโรงเรียนจะแจ้งกำหนดภายหลัง</div>';

    h += round1Summary();
    return h;
  }
  /* สรุปครั้งที่ 1 (ตัวเลขภาพรวมจาก data/data.js เก็บไว้อ้างอิง) */
  function round1Summary() {
    if (!D1 || D1 === D) return '';
    var m = D1.meta;
    return '<details class="card old-docs" style="margin-top:18px"><summary>ข้อมูลครั้งที่ 1 (ดำเนินการแล้ว · เก็บไว้อ้างอิง)</summary><div class="card-body">' +
      '<p style="margin-top:0">การแก้ไขผลการเรียน ครั้งที่ 1 ดำเนินการวันที่ 24 กันยายน 2569 ณ หอประชุมคุณแม่จ่อย ดร.อนันต์ เล็กใจซื่อ ' +
      'และแบบออนไลน์ระหว่างวันที่ 28 – 30 กันยายน 2569 ประกาศผลวันศุกร์ที่ 2 ตุลาคม 2569 เวลา 09.00 น. ผ่านระบบ Prot Care</p>' +
      '<div class="grid g3">' +
      '<div class="stat"><div class="k">นักเรียนที่ต้องแก้ (ครั้งที่ 1)</div><div class="v">' + nf(m.totalStudentsWithIssue) + '</div><div class="n">จากนักเรียนทั้งหมด ' + nf(m.totalEnrolled) + ' คน</div></div>' +
      '<div class="stat"><div class="k">รายการวิชาที่ไม่ผ่าน (ครั้งที่ 1)</div><div class="v">' + nf(m.totalSubjectEntries) + '</div><div class="n">0 = ' + nf(m.byGrade['0']) + ' · ร = ' + nf(m.byGrade['ร']) + ' · มผ = ' + nf(m.byGrade['มผ']) + ' · มส = ' + nf(m.byGrade['มส']) + '</div></div>' +
      '<div class="stat"><div class="k">ข้อมูลครั้งที่ 1</div><div class="v" style="font-size:1.05rem; line-height:1.5">' + esc(m.asOf) + '</div><div class="n">ผลการเรียนจากระบบ Prot Care ก่อนประกาศผลการแก้ไข</div></div>' +
      '</div></div></details>';
  }
  function tl(date, title, sub, status) {
    return '<div class="tl-item' + (status ? ' tl-done' : '') + '"><div class="tl-date">' + esc(date) + '</div>' +
      '<div><div><strong>' + esc(title) + '</strong>' + (status ? ' <span class="chip chip-done">' + esc(status) + '</span>' : '') + '</div>' +
      '<div class="small muted">' + esc(sub) + '</div></div></div>';
  }

  /* ---------- ครั้งที่ 1: ปฏิทินที่ปรับเนื่องจากสถานการณ์น้ำท่วม (มีผลตั้งแต่ 28 ก.ย. 2569) — ดำเนินการแล้ว เก็บไว้อ้างอิง ---------- */
  /* ข้อความตามประกาศ "แจ้งปรับเปลี่ยนปฏิทินกิจกรรมการเรียนซ่อมเสริมและสอบแก้ตัว ภาคเรียนที่ 1 ปีการศึกษา 2569 เนื่องจากสถานการณ์น้ำท่วม" */
  var NEWCAL = [
    { d: 'จันทร์ที่ 28 – พุธที่ 30 กันยายน 2569', t: 'ในวันทำการ', a: 'แก้ไขผลการเรียนแบบออนไลน์ ครั้งที่ 1 (ต่อ) เปิดให้ทุกกลุ่มสาระการเรียนรู้ นักเรียนติดต่อครูประจำวิชา รับงานและส่งงาน', em: 'ผ่านช่องทางออนไลน์ของครูประจำวิชาทุกรายวิชา', w: 'นักเรียน / ครูประจำวิชา', done: true },
    { d: 'พุธที่ 30 กันยายน 2569', t: '16.00 น.', a: 'ปิดรับงานจากนักเรียน', w: 'ครูประจำวิชา', done: true },
    { d: 'พฤหัสบดีที่ 1 ตุลาคม 2569', t: 'ภายใน 12.00 น.', a: 'ครูแก้ไขผลการเรียนในระบบ Prot Care ให้แล้วเสร็จ', w: 'ครูประจำวิชา', done: true },
    { d: 'พฤหัสบดีที่ 1 ตุลาคม 2569', t: '15.30 น.', a: 'อนุมัติผลการเรียนในระบบ Prot Care', w: 'กลุ่มงานวัดผลและประเมินผล', done: true },
    { d: 'ศุกร์ที่ 2 ตุลาคม 2569', t: '09.00 น.', a: 'ประกาศผลการแก้ไขผลการเรียนผ่านระบบ Prot Care', w: 'กลุ่มงานวัดผลและประเมินผล', done: true }
  ];

  /* ---------- ครั้งที่ 2: แก้ไขที่โรงเรียน 28 – 30 ต.ค. 2569 · ประกาศผลทางระบบ SGS 2 พ.ย. 2569 ---------- */
  /* s / e = ช่วงเวลา (เวลาไทย) ใช้กำหนดสถานะ "ดำเนินการแล้ว / กำลังดำเนินการ" */
  var CAL2 = [
    { d: 'พุธที่ 28 ตุลาคม 2569', t: 'ช่วงเข้าแถวตอนเช้า', a: 'นักเรียนรับใบแสดงรายวิชาที่ต้องแก้ไขผลการเรียนจากครูที่ปรึกษา · ครูประจำวิชารับเอกสารบันทึกการแก้ไขผลการเรียนจากหัวหน้ากลุ่มสาระการเรียนรู้', w: 'นักเรียน / ครูที่ปรึกษา / ครูประจำวิชา', s: '2026-10-28T00:00', e: '2026-10-28T09:00' },
    { d: 'พุธที่ 28 – ศุกร์ที่ 30 ตุลาคม 2569', t: 'ในเวลาเรียนและนอกเวลาเรียน (ช่วงเช้า พักกลางวัน และช่วงเย็น)', a: 'นักเรียนนำใบแสดงรายวิชาไปติดต่อครูประจำวิชาด้วยตนเอง เพื่อรับภาระงานหรือสอบแก้ตัว', w: 'นักเรียน / ครูประจำวิชา', s: '2026-10-28T00:00', e: '2026-10-30T15:10' },
    { d: 'ศุกร์ที่ 30 ตุลาคม 2569', t: 'ก่อนเวลา 15.10 น.', a: 'นักเรียนปฏิบัติภาระงานที่ได้รับมอบหมายให้แล้วเสร็จ', w: 'นักเรียน', s: '2026-10-30T00:00', e: '2026-10-30T15:10' },
    { d: 'ศุกร์ที่ 30 ตุลาคม 2569', t: 'ก่อนเวลา 16.00 น.', a: 'ครูประจำวิชาส่งเอกสารบันทึกผลการแก้ไขผลการเรียน ที่ห้องสำนักงานวิชาการ (กล่องสีส้ม) · ครูที่ปรึกษาและหัวหน้ากลุ่มสาระการเรียนรู้ส่งคืนบัญชีลงชื่อรับเอกสาร (กล่องสีม่วง)', w: 'ครูประจำวิชา / ครูที่ปรึกษา / หัวหน้ากลุ่มสาระ', s: '2026-10-30T00:00', e: '2026-10-30T16:00' },
    { d: 'จันทร์ที่ 2 พฤศจิกายน 2569', t: 'ตั้งแต่เวลา 18.00 น.', a: 'ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 2 ผ่านระบบ SGS', w: 'กลุ่มงานวัดผลและประเมินผล', s: '2026-11-02T18:00', e: '2026-11-02T18:00' }
  ];
  var ANNOUNCE2 = Date.parse('2026-11-02T18:00:00+07:00');
  function announced2() { return Date.now() >= ANNOUNCE2; }
  var R2_SCOPE = 'แก้เฉพาะผลการเรียน 0 / ร / มผ ของรายวิชาภาคเรียนที่ 1/2569 · มส และรายวิชาภาคเรียนอื่น รอรอบเรียนซ้ำ ครั้งที่ 2/2569';

  /* ขั้นตอนสำหรับนักเรียน ครั้งที่ 2 (ตามร่างประกาศ ข้อ 3) */
  function steps2() {
    return '<ol class="list-reset">' +
      '<li>รับใบแสดงรายวิชาที่ต้องแก้ไขผลการเรียนจากครูที่ปรึกษา <strong>วันพุธที่ 28 ตุลาคม 2569 ช่วงเข้าแถวตอนเช้า</strong> และตรวจสอบรายวิชาที่ต้องแก้ไข</li>' +
      '<li>นำใบไปติดต่อครูประจำวิชาด้วยตนเอง ระหว่างวันพุธที่ 28 – วันศุกร์ที่ 30 ตุลาคม 2569 ได้ทั้งในเวลาเรียนและนอกเวลาเรียน (ช่วงเช้า พักกลางวัน และช่วงเย็น) เพื่อรับภาระงานหรือสอบแก้ตัว</li>' +
      '<li>ทำภาระงานตามที่ครูประจำวิชากำหนดให้แล้วเสร็จ <strong>ภายในวันศุกร์ที่ 30 ตุลาคม 2569 ก่อนเวลา 15.10 น.</strong></li>' +
      '<li>เมื่อแก้ผ่านแล้ว ครูประจำวิชาจะลงนามในใบแสดงรายวิชา นักเรียนไม่ต้องส่งใบคืน ให้เก็บไว้เป็นหลักฐาน</li>' +
      '<li>ตรวจสอบผลในระบบ SGS <strong>วันจันทร์ที่ 2 พฤศจิกายน 2569 ตั้งแต่เวลา 18.00 น.</strong> หากผลยังไม่ตรงกับที่ครูลงนามไว้ ให้นำใบที่ครูลงนามมาติดต่อห้องสำนักงานวิชาการ</li>' +
      '</ol>';
  }
  function notes2() {
    return '<ul class="list-reset">' +
      '<li>นักเรียนที่เห็นว่าผลการแก้ไขผลการเรียน ครั้งที่ 1 ไม่ตรงกับที่ได้ดำเนินการไว้ ให้นำหลักฐาน (ภาพการส่งงานออนไลน์ หรือใบที่ครูผู้สอนลงนาม) ไปติดต่อครูประจำวิชาโดยตรงภายในช่วงเวลาเดียวกัน</li>' +
      '<li>รายวิชาที่ครูผู้สอนย้ายไปปฏิบัติราชการที่สถานศึกษาอื่นแล้ว ให้ติดต่อหัวหน้ากลุ่มสาระการเรียนรู้ของรายวิชานั้น</li>' +
      '<li>รายวิชาที่ได้ มส และรายวิชาของภาคเรียนอื่น ไม่อยู่ในรอบนี้ ให้รอรอบเรียนซ้ำ ครั้งที่ 2/2569 ซึ่งโรงเรียนจะแจ้งกำหนดภายหลัง</li>' +
      '</ul>';
  }
  function announceBox() {
    if (announced2()) {
      return '<div class="notice ok" style="margin:18px 0"><strong>ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 2 ภาคเรียนที่ 1/2569 แล้ว ' +
        'ทางระบบ SGS เมื่อวันจันทร์ที่ 2 พฤศจิกายน 2569 เวลา 18.00 น.</strong>' +
        '<div style="margin-top:4px">นักเรียนตรวจสอบผลในระบบ SGS หากผลยังไม่ตรงกับที่ครูประจำวิชาลงนามไว้ ให้นำใบแสดงรายวิชาที่ครูลงนามมาติดต่อห้องสำนักงานวิชาการ ' +
        '<a href="#/guide">ดูรายละเอียด</a></div></div>';
    }
    return '<div class="notice alert" style="margin:18px 0"><strong>การแก้ไขผลการเรียน ครั้งที่ 2 ภาคเรียนที่ 1/2569 · วันพุธที่ 28 – วันศุกร์ที่ 30 ตุลาคม 2569</strong>' +
      '<div style="margin-top:4px">รับใบแสดงรายวิชาจากครูที่ปรึกษา พ. 28 ต.ค. ช่วงเข้าแถว · ติดต่อครูประจำวิชาด้วยตนเอง · ' +
      'ส่งงานภายใน ศ. 30 ต.ค. ก่อน 15.10 น. · ประกาศผลทางระบบ SGS จ. 2 พ.ย. 2569 ตั้งแต่ 18.00 น. <a href="#/guide">ดูขั้นตอน</a></div>' +
      '<div class="small" style="margin-top:4px">' + esc(R2_SCOPE) + '</div></div>';
  }
  function calTable(rows) {
    return '<div class="cal"><table><thead><tr><th>วัน เดือน ปี</th><th>เวลา</th><th>กิจกรรม</th><th>ผู้ดำเนินการ</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td class="cal-d">' + esc(r.d) + '</td><td class="cal-t">' + esc(r.t) + '</td>' +
          '<td class="cal-a">' + esc(r.a) + (r.em ? ' <strong class="u">' + esc(r.em) + '</strong>' : '') + '</td><td class="cal-w">' + esc(r.w) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  /* ครั้งที่ 1: รอบที่ 1–2 (24 ก.ย.) ดำเนินการแล้ว · รอบที่ 3 (28 ก.ย.) ยกเลิก */
  function r1Status(k) {
    var g = D.groups[k]; if (!g) return null;
    return g.r1.round === 3 ? 'cancel' : 'done';
  }

  /* ---------- ช่องทางติดต่อออนไลน์ของครู (data/contacts.js) ---------- */
  var CONTACT = {};
  (function () {
    var src = window.PROT_CONTACTS || {};
    Object.keys(src).forEach(function (n) { CONTACT[norm(bareName(n))] = String(src[n] || '').trim(); });
  })();
  function contactOf(t) { return t ? (CONTACT[norm(bareName(t.name))] || '') : ''; }
  function linkify(txt) {
    return esc(txt).replace(/https?:\/\/[^\s<]+/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    });
  }
  function contactHtml(t) {
    var c = contactOf(t);
    return c ? linkify(c) : '<span class="cc-def"><span>ช่องทางออนไลน์เดิม</span> <span>ที่ใช้ติดต่อครู</span> <span>ตลอดภาคเรียน</span></span>';
  }

  /* ================= STUDENTS ================= */
  /* แสดงเฉพาะรายบุคคล: ต้องกรอกรหัสประจำตัวให้ตรงทั้ง 5 หลัก ไม่มีการแสดงรายชื่อรวม */
  function viewStudents(q, miss) {
    var h = '<h1 class="page-title">ตรวจสอบรายบุคคล สำหรับนักเรียน</h1>' +
      '<p class="page-lead">กรอกรหัสประจำตัวนักเรียนของตนเอง เพื่อดูรายวิชาที่ต้องแก้ไขผลการเรียน ครั้งที่ 2 และครูประจำวิชาที่ต้องไปติดต่อ</p>' +
      announceBox();
    h += '<div class="card lookup"><div class="card-body">' +
      '<form id="stuForm" class="lookup-form" autocomplete="off">' +
      '<label for="stuCode" class="lookup-label">รหัสประจำตัวนักเรียน</label>' +
      '<div class="lookup-row">' +
      '<input id="stuCode" class="input lookup-input" inputmode="numeric" pattern="[0-9]*" maxlength="5" placeholder="เช่น 44731" value="' + esc(q || '') + '">' +
      '<button type="submit" class="btn btn-primary lookup-btn">ตรวจสอบ</button>' +
      '</div>' +
      '<div id="stuMsg" class="lookup-msg">' + (miss ? missMsg(miss) : '') + '</div>' +
      '</form>' +
      privacyNote('ระบบแสดงข้อมูลเป็นรายบุคคลเท่านั้น ไม่มีการแสดงรายชื่อนักเรียนรวม · หากตรวจสอบแล้วไม่พบรายการ แปลว่าไม่มีรายวิชาที่ต้องแก้ไขผลการเรียน ครั้งที่ 2') +
      '</div></div>';
    setTimeout(function () {
      var f = document.getElementById('stuForm'), inp = document.getElementById('stuCode');
      if (!miss) inp.focus();
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var code = String(inp.value || '').replace(/\D/g, '');
        var msg = document.getElementById('stuMsg');
        if (code.length !== 5) { msg.innerHTML = '<span class="err">กรุณากรอกรหัสประจำตัวให้ครบ 5 หลัก</span>'; return; }
        if (S[code]) { location.hash = '#/student/' + code; return; }
        msg.innerHTML = missMsg(code);
      });
    }, 0);
    return h;
  }
  function missMsg(code) {
    return '<div class="ok-box"><strong>ไม่พบรายวิชาที่ต้องแก้ไขผลการเรียน ครั้งที่ 2 ของรหัส ' + esc(code) + '</strong><br>' +
      'แปลว่ารหัสนี้ไม่มีผลการเรียน 0 / ร / มผ ภาคเรียนที่ 1/2569 ในรายชื่อแก้ไขผลการเรียน ครั้งที่ 2 · ' +
      'รายวิชาที่ได้ มส ไม่อยู่ในรอบนี้ (รอรอบเรียนซ้ำ ครั้งที่ 2/2569) · หากนักเรียนมั่นใจว่ายังมีรายวิชาที่ไม่ผ่าน ' +
      'โปรดตรวจสอบรหัสอีกครั้ง หรือสอบถามครูที่ปรึกษา</div>';
  }

  function viewStudent(code) {
    var s = S[code];
    if (!s) return viewStudents(code, code);
    var h = '<div class="card"><div class="card-body"><div style="display:flex; gap:18px; flex-wrap:wrap">' +
      avatar(stuPhoto(s), s.name, 'lg') +
      '<div style="flex:1 1 320px; min-width:260px">' +
      '<div class="small muted">' + esc(s.level) + ' · ภาคเรียนที่ 2/2569</div>' +
      '<h1 class="page-title" style="margin:2px 0">' + esc(s.name) + '</h1>' +
      '<div class="muted">รหัสประจำตัว ' + esc(s.code) + ' · ห้อง ' + esc(s.room) + ' เลขที่ ' + esc(s.no) + '</div>' +
      '<div style="margin-top:10px">' + countChips(s.counts) + '</div>' +
      '<div class="small muted" style="margin-top:6px">ต้องแก้ไขผลการเรียน ' + s.items.length + ' รายวิชา</div>' +
      '</div>' +
      '<div style="flex:0 1 300px"><div class="small muted" style="margin-bottom:6px">ครูที่ปรึกษา (ภาคเรียนที่ 2/2569)</div>' +
      (s.adv.length ? s.adv.map(function (id) { return personT(T[id], false); }).join('<div style="height:8px"></div>') : '<span class="muted">—</span>') +
      '</div></div></div></div>';

    if (announced2()) {
      h += '<div class="notice ok" style="margin-top:18px"><strong>ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 2 แล้ว ทางระบบ SGS (จันทร์ที่ 2 พฤศจิกายน 2569 เวลา 18.00 น.)</strong>' +
        '<div class="small" style="margin-top:4px">รายวิชาด้านล่างเป็นรายชื่อก่อนการแก้ไข ครั้งที่ 2 ให้ตรวจสอบผลล่าสุดในระบบ SGS เป็นหลัก ' +
        'หากผลยังไม่ตรงกับที่ครูประจำวิชาลงนามไว้ ให้นำใบแสดงรายวิชาที่ครูลงนามมาติดต่อห้องสำนักงานวิชาการ</div></div>';
    } else {
      h += '<div class="notice alert" style="margin-top:18px"><strong>นำใบแสดงรายวิชาที่ต้องแก้ไขผลการเรียนไปติดต่อครูประจำวิชาด้วยตนเอง ภายในวันศุกร์ที่ 30 ตุลาคม 2569 ก่อนเวลา 15.10 น.</strong>' +
        '<div class="small" style="margin-top:4px">ประกาศผลทางระบบ SGS วันจันทร์ที่ 2 พฤศจิกายน 2569 ตั้งแต่เวลา 18.00 น.</div></div>';
    }

    h += '<div class="card"><div class="card-head"><h2>รายวิชาที่ต้องแก้ไขผลการเรียน ครั้งที่ 2</h2><span class="small muted">' + s.items.length + ' รายการ</span></div><div class="table-scroll"><table>' +
      '<thead><tr><th>รหัสวิชา</th><th>รายวิชา</th><th class="num">หน่วยกิต</th><th>ผล</th><th>ครูประจำวิชา</th></tr></thead><tbody>';
    s.items.forEach(function (it) {
      h += '<tr><td class="nowrap">' + esc(it.code) + '</td><td>' + esc(it.name) + '</td><td class="num">' + esc(it.credit) + '</td>' +
        '<td>' + gb(it.grade) + '</td><td>' + personT(T[it.t]) + '</td></tr>';
    });
    h += '</tbody></table></div><div class="card-body small muted" style="padding-top:10px">ข้อมูลผลการเรียนในระบบ SGS ณ ' + esc(D.meta.asOf) + '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>ขั้นตอนสำหรับนักเรียน</h2></div><div class="card-body">' +
      steps2() +
      '<div class="notice warn" style="margin-top:14px"><strong>ข้อควรทราบ</strong><div style="margin-top:6px">' + notes2() + '</div></div>' +
      '<div class="small muted" style="margin-top:10px">หากมีข้อสงสัย สอบถามครูประจำวิชา หรือครูที่ปรึกษาของนักเรียน</div>' +
      '</div></div>';
    return h;
  }

  /* ================= TEACHERS ================= */
  /* เลือกชื่อของตนเองเพื่อเปิดข้อมูลเฉพาะของท่าน ไม่มีตารางเปรียบเทียบจำนวนระหว่างครู */
  function viewTeachers() {
    var groups = {}, other = [];
    D.teachers.forEach(function (t) {
      if (t.groups.length) t.groups.forEach(function (k) { (groups[k] = groups[k] || []).push(t); });
      else other.push(t);
    });
    var sections = GKEYS.filter(function (k) { return groups[k]; })
      .map(function (k) { return { key: k, title: D.groups[k].full || D.groups[k].name, list: groups[k].sort(byName) }; });
    if (other.length) sections.push({ key: 'OTHER', title: 'ครูผู้สอนอื่น ๆ', list: other.sort(byName) });

    var h = '<h1 class="page-title">ครูประจำวิชา</h1>' +
      '<p class="page-lead">กดปุ่ม “ดูรายละเอียด” ที่ชื่อของท่าน เพื่อเปิดรายชื่อนักเรียนกลุ่มเป้าหมายในรายวิชาของท่าน</p>';
    h += '<div class="card"><div class="card-body">' +
      '<div class="toolbar"><div class="grow"><input id="tFind" class="input" type="search" placeholder="พิมพ์ชื่อของท่านเพื่อค้นหาได้เร็วขึ้น"></div></div>' +
      '<div class="tjump">' + sections.map(function (sec) {
        return '<a href="#" data-jump="tg-' + sec.key + '">' + esc(sec.key === 'OTHER' ? sec.title : D.groups[sec.key].name) + '</a>';
      }).join('') + '</div>' +
      privacyNote('หน้านี้แสดงเฉพาะรายชื่อครูตามกลุ่มสาระการเรียนรู้ ไม่แสดงจำนวนนักเรียนของครูแต่ละท่าน · ข้อมูลนักเรียนจะแสดงเมื่อกดเข้าไปที่ชื่อของท่านเท่านั้น') +
      '</div></div>';
    sections.forEach(function (sec) {
      h += '<div class="card tgroup" id="tg-' + sec.key + '"><div class="card-head"><h2>' + esc(sec.title) + '</h2></div>' +
        '<div class="card-body"><div class="tgrid">';
      sec.list.forEach(function (t) {
        h += '<div class="tcard" data-name="' + esc(norm(t.name)) + '">' +
          avatar(tPhoto(t), t.name, 'tph') +
          '<div class="tc-name">' + (function (n) {
            var i = n.indexOf(' ');
            return i > 0 ? '<span>' + esc(n.slice(0, i)) + '</span><span>' + esc(n.slice(i + 1)) + '</span>' : '<span>' + esc(n) + '</span>';
          })(String(t.name).replace(/\s+/g, ' ').trim()) + '</div>' +
          '<div class="tc-contact"><div class="k">ช่องทางติดต่อ</div><div class="v">' + contactHtml(t) + '</div></div>' +
          '<a class="btn btn-sm btn-open tc-btn" href="#/teacher/' + t.id + '">ดูรายละเอียด</a>' +
          '</div>';
      });
      h += '</div><div class="empty tnone" hidden>ไม่พบชื่อในกลุ่มนี้</div></div></div>';
    });
    setTimeout(function () {
      var inp = document.getElementById('tFind');
      inp.addEventListener('input', function () {
        var q = norm(inp.value);
        document.querySelectorAll('.tgroup').forEach(function (g) {
          var shown = 0;
          g.querySelectorAll('.tcard').forEach(function (c) {
            var ok = !q || c.getAttribute('data-name').indexOf(q) >= 0;
            c.hidden = !ok; if (ok) shown++;
          });
          g.hidden = q && !shown;
        });
      });
      document.querySelectorAll('[data-jump]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var el = document.getElementById(a.getAttribute('data-jump'));
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }, 0);
    return h;
  }

  function viewTeacher(id) {
    var t = T[id];
    if (!t) return '<div class="card"><div class="empty">ไม่พบข้อมูลครู<br><a href="#/teachers">กลับไปเลือกชื่อ</a></div></div>';
    var h = '<div class="no-print" style="margin-bottom:12px"><a class="btn btn-sm" href="#/teachers">กลับไปหน้ารายชื่อครู</a></div>' +
      '<div class="card"><div class="card-body"><div style="display:flex; gap:18px; flex-wrap:wrap; align-items:flex-start">' +
      avatar(tPhoto(t), t.name, 'lg') +
      '<div style="flex:1 1 320px">' +
      '<h1 class="page-title" style="margin:0">' + esc(t.name) + '</h1>' +
      '<div class="muted">' + (t.groups.length ? t.groups.map(function (k) {
        return esc(gname(k)) + (t.roles && t.roles[k] ? ' (' + esc(t.roles[k]) + ')' : '');
      }).join(' · ') : 'ไม่ปรากฏในคำสั่งคณะกรรมการรับแก้ไขผลการเรียน') + '</div>' +
      (t.advisorRooms.length ? '<div class="small" style="margin-top:6px">ครูที่ปรึกษา ' +
        t.advisorRooms.sort(roomSort).map(function (r) { return '<a href="#/advisor/' + encodeURIComponent(r) + '">' + esc(r) + '</a>'; }).join(' · ') + '</div>' : '') +
      '<div class="tc-contact left"><div class="k">ช่องทางติดต่อ</div><div class="v">' + contactHtml(t) + '</div></div>' +
      '<div style="margin-top:10px">' + countChips(t.counts) + '</div>' +
      '</div>' +
      '<div style="flex:1 1 260px"><div class="grid g2">' +
      '<div class="stat"><div class="k">นักเรียนที่ต้องดูแล</div><div class="v">' + t.nStudents + '</div><div class="n">คน</div></div>' +
      '<div class="stat"><div class="k">รายการวิชา</div><div class="v">' + t.nEntries + '</div><div class="n">' + t.subjects.length + ' รายวิชา</div></div>' +
      '</div></div></div></div></div>';

    h += '<div class="card"><div class="card-head"><h2>กำหนดการสำหรับครูประจำวิชา ครั้งที่ 2</h2><span class="chip chip-alert">แก้ไขที่โรงเรียน 28 – 30 ต.ค. 2569</span></div><div class="card-body">' +
      calTable(CAL2) + '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>หน้าที่ของครูประจำวิชา ครั้งที่ 2</h2></div><div class="card-body"><ol class="list-reset">' +
      '<li>รับเอกสารบันทึกการแก้ไขผลการเรียนจากหัวหน้ากลุ่มสาระการเรียนรู้ และลงชื่อรับเอกสาร (วันพุธที่ 28 ตุลาคม 2569)</li>' +
      '<li>รับนักเรียนทั้งในและนอกเวลาเรียน มอบภาระงานหรือให้สอบแก้ตัว นักเรียนส่งงาน<strong>ภายในวันศุกร์ที่ 30 ตุลาคม 2569 ก่อนเวลา 15.10 น.</strong></li>' +
      '<li>บันทึกผลในเอกสาร: 0 เป็น 1 · ร เป็นระดับผลการเรียนตามคะแนนจริง · มผ เป็น ผ และลงนามในใบแสดงรายวิชาของนักเรียนเมื่อแก้ผ่าน</li>' +
      '<li>ถ่ายภาพเอกสารเก็บไว้ แล้วส่งที่ห้องสำนักงานวิชาการ (กล่องสีส้ม) <strong>ภายในวันศุกร์ที่ 30 ตุลาคม 2569 ก่อนเวลา 16.00 น.</strong> พร้อมลงชื่อในบัญชีส่งเอกสารของกลุ่มสาระการเรียนรู้</li>' +
      '<li>ไม่ต้องแก้ผลในระบบ Prot Care · กลุ่มงานวัดผลและประเมินผลแก้ผลในระบบ SGS ให้ และประกาศผลวันจันทร์ที่ 2 พฤศจิกายน 2569</li>' +
      '</ol>' +
      '<div class="notice info" style="margin-top:14px"><ul class="list-reset">' +
      '<li>นักเรียนที่แจ้งว่าผลครั้งที่ 1 ไม่ตรงกับที่ดำเนินการไว้ พร้อมหลักฐาน ครูตรวจสอบและบันทึกผลแก้ในครั้งนี้ได้</li>' +
      '<li>รายวิชาของครูที่ย้ายไปแล้ว หัวหน้ากลุ่มสาระการเรียนรู้รับติดต่อนักเรียน และพิจารณามอบหมายผู้รับแก้</li>' +
      '</ul></div></div></div>';

    if (t.groups.length && t.id.charAt(0) === 'T') {
      h += '<details class="card old-docs"><summary>ครั้งที่ 1 (ดำเนินการแล้ว)</summary><div class="card-body">' +
        '<div class="small muted" style="margin-bottom:6px">ครั้งที่ 1 ณ หอประชุมคุณแม่จ่อย ดร.อนันต์ เล็กใจซื่อ และแบบออนไลน์ 28 – 30 ก.ย. 2569 · ประกาศผล 2 ต.ค. 2569</div><div class="r1-list">';
      t.groups.forEach(function (k) {
        var g = D.groups[k], st = r1Status(k);
        h += '<div class="r1-row' + (st === 'cancel' ? ' cancelled' : '') + '"><span class="r1-g">' + esc(gname(k)) + '</span>' +
          '<span class="r1-w">รอบที่ ' + g.r1.round + ' · ' + esc(g.r1.day) + ' · ' + esc(g.r1.time) + '</span>' +
          (st === 'cancel' ? '<span class="chip chip-cancel">ยกเลิก – เปลี่ยนเป็นออนไลน์</span>' : '<span class="chip chip-done">ดำเนินการแล้ว</span>') + '</div>';
      });
      h += '</div><div style="height:14px"></div>' + calTable(NEWCAL) + '</div></details>';
    }

    if (!t.subjects.length) {
      h += '<div class="card"><div class="empty">ไม่มีนักเรียนที่ต้องแก้ไขผลการเรียน ครั้งที่ 2 ในรายวิชาของท่าน</div></div>';
      return h;
    }
    h += '<div class="card"><div class="card-head"><h2>นักเรียนกลุ่มเป้าหมาย แยกตามรายวิชา</h2>' +
      '<div class="no-print"><button class="btn" onclick="window.print()">พิมพ์รายชื่อ</button></div></div><div class="card-body">';
    t.subjects.slice().sort(function (a, b) { return b.students.length - a.students.length || a.code.localeCompare(b.code); }).forEach(function (sub) {
      var rows = sub.students.map(function (x) { return { s: S[x.code], grade: x.grade }; })
        .filter(function (x) { return x.s; })
        .sort(function (a, b) { return roomSort(a.s.room, b.s.room) || (+a.s.no - +b.s.no); });
      var cnt = { '0': 0, 'ร': 0, 'มส': 0, 'มผ': 0 };
      rows.forEach(function (r) { cnt[r.grade]++; });
      h += '<div class="subject-row"><div class="top">' +
        '<div><div class="sname">' + esc(sub.name) + '</div><div class="scode">' + esc(sub.code) + '</div></div>' +
        '<div>' + countChips(cnt) + ' &nbsp; <span class="chip">ค้าง ' + rows.length + ' คน</span>' +
        ((sub.done || []).length ? ' <span class="chip chip-pass">ผ่านแล้ว ' + sub.done.length + ' คน</span>' : '') + '</div></div>';
      if (!rows.length) h += '<div class="small muted" style="margin-top:8px">ไม่มีนักเรียนค้างในรายวิชานี้แล้ว</div>';
      else h += '<div class="table-scroll" style="margin-top:10px"><table><thead><tr><th style="width:40px"></th><th>นักเรียน</th><th>ห้อง</th><th>ผล</th><th class="no-print">ดำเนินการแล้ว</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var key = 'prot2_2569:' + t.id + ':' + sub.code + ':' + r.s.code;
        var done = store(key) ? 'checked' : '';
        h += '<tr><td>' + avatar(stuPhoto(r.s), r.s.name, 'sm') + '</td>' +
          '<td><a href="#/student/' + r.s.code + '">' + esc(r.s.name) + '</a><div class="small muted">' + esc(r.s.code) + '</div></td>' +
          '<td class="nowrap">' + esc(r.s.room) + ' เลขที่ ' + esc(r.s.no) + '</td>' +
          '<td>' + gb(r.grade) + '</td>' +
          '<td class="no-print"><label class="checkline"><input type="checkbox" data-k="' + key + '" ' + done + '><span class="small muted">บันทึกในเครื่องนี้</span></label></td></tr>';
      });
      if (rows.length) h += '</tbody></table></div>';
      var dn = (sub.done || []).map(function (x) { return { s: S[x.code], d: x }; }).filter(function (x) { return x.s; })
        .sort(function (a, b) { return roomSort(a.s.room, b.s.room) || (+a.s.no - +b.s.no); });
      if (dn.length) {
        h += '<details class="done-box"><summary>นักเรียนที่แก้ไขผ่านแล้ว ' + dn.length + ' คน</summary><div class="done-list">' +
          dn.map(function (x) {
            return '<div class="done-item">' + esc(x.s.name) + ' <span class="small muted">' + esc(x.s.room) + ' เลขที่ ' + esc(x.s.no) + '</span> ' +
              gb(x.d.old) + ' ' + passChip(x.d) + '</div>';
          }).join('') + '</div></details>';
      }
      h += '</div>';
    });
    h += '</div></div>';
    setTimeout(function () {
      document.querySelectorAll('input[type=checkbox][data-k]').forEach(function (el) {
        el.addEventListener('change', function () { store(el.dataset.k, el.checked ? 1 : 0); });
      });
    }, 0);
    return h;
  }

  /* ================= ADVISORS ================= */
  /* เลือกห้องที่ท่านเป็นครูที่ปรึกษา ไม่มีตารางเปรียบเทียบจำนวนระหว่างห้อง */
  function viewAdvisors() {
    var byLv = {};
    D.rooms.slice().sort(function (a, b) { return roomSort(a.key, b.key); }).forEach(function (r) {
      var L = r.key.split('/')[0]; (byLv[L] = byLv[L] || []).push(r);
    });
    var lvKeys = Object.keys(byLv);
    var lvId = function (L) { return 'lv-' + L.replace(/[^0-9]/g, ''); };
    var h = '<h1 class="page-title">ครูที่ปรึกษา</h1>' +
      '<p class="page-lead">กดปุ่ม “ดูรายละเอียด” ที่ห้องที่ท่านเป็นครูที่ปรึกษา เพื่อกำกับติดตามว่านักเรียนคนใดต้องไปพบครูท่านใด รอบใด</p>';
    h += '<div class="card"><div class="card-body">' +
      '<div class="toolbar"><div class="grow"><input id="aFind" class="input" type="search" placeholder="พิมพ์ชื่อห้อง เช่น 5/4 หรือชื่อครูที่ปรึกษา"></div></div>' +
      '<div class="tjump">' + lvKeys.map(function (L) {
        return '<a href="#" data-jump="' + lvId(L) + '">' + esc(byLv[L][0].level || L) + '</a>';
      }).join('') + '</div>' +
      privacyNote('หน้านี้แสดงเฉพาะห้องเรียนและรายชื่อครูที่ปรึกษา ไม่แสดงหรือเปรียบเทียบจำนวนนักเรียนระหว่างห้อง · ข้อมูลนักเรียนจะแสดงเมื่อกดเข้าไปที่ห้องของท่านเท่านั้น') +
      '</div></div>';
    lvKeys.forEach(function (L) {
      h += '<div class="card tgroup agroup" id="' + lvId(L) + '"><div class="card-head"><h2>' + esc(byLv[L][0].level || L) + '</h2></div>' +
        '<div class="card-body"><div class="rgrid">';
      byLv[L].forEach(function (r) {
        var ts = r.adv.map(function (id) { return T[id]; }).filter(Boolean);
        var key = norm(r.key + ' ' + r.key.replace('ม.', '') + ' ' + ts.map(function (t) { return t.name; }).join(' '));
        h += '<div class="rcard" data-name="' + esc(key) + '">' +
          '<div class="rc-room">' + esc(r.key) + '</div>' +
          '<div class="rc-photos">' + (ts.length ? ts.map(function (t) { return avatar(tPhoto(t), t.name, 'rph'); }).join('') : '') + '</div>' +
          '<div class="rc-names">' + (ts.length ? ts.map(function (t) { return '<span>ครู' + (/^[A-Za-z]/.test(bareName(t.name)) ? ' ' : '') + esc(bareName(t.name)) + '</span>'; }).join('')
            : '<span class="muted">—</span>') + '</div>' +
          '<a class="btn btn-sm btn-open rc-btn" href="#/advisor/' + encodeURIComponent(r.key) + '">ดูรายละเอียด</a>' +
          '</div>';
      });
      h += '</div><div class="empty tnone" hidden>ไม่พบห้องในระดับชั้นนี้</div></div></div>';
    });
    setTimeout(function () {
      var inp = document.getElementById('aFind');
      inp.addEventListener('input', function () {
        var q = norm(inp.value);
        document.querySelectorAll('.agroup').forEach(function (g) {
          var shown = 0;
          g.querySelectorAll('.rcard').forEach(function (c) {
            var ok = !q || c.getAttribute('data-name').indexOf(q) >= 0;
            c.hidden = !ok; if (ok) shown++;
          });
          g.hidden = q && !shown;
        });
      });
      document.querySelectorAll('[data-jump]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var el = document.getElementById(a.getAttribute('data-jump'));
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }, 0);
    return h;
  }

  function viewAdvisor(key) {
    var r = R[key];
    if (!r) return '<div class="card"><div class="empty">ไม่พบห้อง ' + esc(key) + '<br><a href="#/advisors">กลับไปหน้ารายชื่อห้อง</a></div></div>';
    var list = D.students.filter(function (s) { return s.room === key; })
      .sort(function (a, b) { return (+a.no) - (+b.no); });
    var h = '<div class="no-print" style="margin-bottom:12px"><a class="btn btn-sm" href="#/advisors">กลับไปหน้ารายชื่อห้อง</a></div>' +
      '<div class="card"><div class="card-body"><div style="display:flex; gap:18px; flex-wrap:wrap; justify-content:space-between">' +
      '<div><div class="small muted">' + esc(r.level) + (r.homeroom ? ' · ห้องประจำ ' + esc(r.homeroom) : '') + '</div>' +
      '<h1 class="page-title" style="margin:2px 0">ห้อง ' + esc(r.key) + '</h1>' +
      '<div class="muted">ครูที่ปรึกษา</div><div style="display:flex; gap:16px; flex-wrap:wrap; margin-top:6px">' +
      r.adv.map(function (id) { return personT(T[id]); }).join('') + '</div></div>' +
      '<div class="grid g3" style="flex:1 1 420px; align-content:start">' +
      '<div class="stat accent"><div class="k">นักเรียนที่ต้องแก้ผลการเรียน</div><div class="v">' + r.n + '</div><div class="n">คน</div></div>' +
      '<div class="stat"><div class="k">รายการ 0 / ร / มผ</div><div class="v">' + (r.counts['0'] + r.counts['ร'] + r.counts['มผ']) + '</div><div class="n">รายการ</div></div>' +
      '<div class="stat"><div class="k">ใบแสดงรายวิชาที่ต้องรับ</div><div class="v">' + r.n + '</div><div class="n">ใบ (คนละ 1 ใบ)</div></div>' +
      '</div></div></div></div>';

    h += announceBox();
    h += '<div class="card"><div class="card-head"><h2>หน้าที่ของครูที่ปรึกษา ครั้งที่ 2</h2></div><div class="card-body"><ol class="list-reset">' +
      '<li>รับใบแสดงรายวิชาที่ต้องแก้ไขผลการเรียนของนักเรียนในห้อง <strong>วันพุธที่ 28 ตุลาคม 2569 ช่วงเข้าแถวตอนเช้า</strong> ที่โต๊ะกลุ่มงานวัดผลฯ ข้างเวที ลานโดมอเนกประสงค์หน้าอาคาร 1 และลงชื่อรับเอกสาร</li>' +
      '<li>มอบใบให้นักเรียน และให้นักเรียนลงชื่อรับในบัญชีลงชื่อของห้อง</li>' +
      '<li>ส่งคืนบัญชีลงชื่อนักเรียนรับเอกสาร ที่ห้องสำนักงานวิชาการ (กล่องสีม่วง) <strong>ภายในวันศุกร์ที่ 30 ตุลาคม 2569</strong> และลงชื่อในบัญชีส่งคืนข้างกล่อง</li>' +
      '<li>กำกับติดตามให้นักเรียนติดต่อครูประจำวิชาและส่งงานให้เสร็จภายในวันศุกร์ที่ 30 ตุลาคม 2569 ก่อนเวลา 15.10 น.</li>' +
      '</ol></div></div>';

    /* ใบกำกับติดตาม (ไม่แบ่งรอบ/ห้อง) */
    var rowsA = [];
    list.forEach(function (s) {
      s.items.filter(function (i) { return i.grade !== 'มส'; }).forEach(function (it) { rowsA.push({ s: s, it: it }); });
    });
    h += '<div class="card"><div class="card-head"><h2>ใบกำกับติดตาม</h2>' +
      '<span class="small muted">รายชื่อแก้ไขผลการเรียน ครั้งที่ 2 · ผลหลังประกาศ 2 พ.ย. 2569 ให้ดูในระบบ SGS</span></div><div class="card-body">';
    if (!rowsA.length) h += '<div class="muted">ไม่มีนักเรียนที่ต้องติดต่อครูประจำวิชา</div>';
    else {
      h += '<div class="table-scroll"><table><thead><tr><th style="width:40px"></th><th>นักเรียน</th><th>รายวิชา</th><th>ผล</th><th>ครูประจำวิชา</th></tr></thead><tbody>';
      rowsA.sort(function (x, y) { return (+x.s.no) - (+y.s.no); }).forEach(function (x) {
        h += '<tr><td>' + avatar(stuPhoto(x.s), x.s.name, 'sm') + '</td>' +
          '<td><a href="#/student/' + x.s.code + '">' + esc(x.s.name) + '</a><div class="small muted">เลขที่ ' + esc(x.s.no) + ' · ' + esc(x.s.code) + '</div></td>' +
          '<td>' + esc(x.it.name) + '<div class="small muted">' + esc(x.it.code) + '</div></td>' +
          '<td>' + gb(x.it.grade) + '</td><td>' + personT(T[x.it.t]) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>นักเรียนในที่ปรึกษาที่ต้องแก้ผลการเรียน</h2>' +
      '<div class="no-print"><button class="btn" onclick="window.print()">พิมพ์รายชื่อ</button></div></div><div class="card-body"><div class="student-grid">';
    list.forEach(function (s) {
      h += '<a class="scard" href="#/student/' + s.code + '">' + avatar(stuPhoto(s), s.name) +
        '<div style="min-width:0"><div class="nm">' + esc(s.name) + '</div>' +
        '<div class="mt">เลขที่ ' + esc(s.no) + ' · ' + esc(s.code) + '</div>' +
        '<div style="margin-top:4px">' + countChips(s.counts) + '</div>' +
        '<div class="mt" style="margin-top:4px">' + (s.items.length ? 'ค้าง ' + s.items.length + ' รายวิชา' : 'ผ่านครบทุกรายวิชาแล้ว') +
        (doneList(s).length ? ' · แก้ผ่านแล้ว ' + doneList(s).length : '') + '</div>' +
        '<div class="go">ดูรายละเอียด</div></div></a>';
    });
    h += '</div></div></div>';
    return h;
  }

  /* ================= SCHEDULE ================= */
  /* ปฏิทิน: สถานะคำนวณจากวันเวลาปัจจุบัน (เวลาไทย) */
  var CAL_TL = [
    { dd: '23', mm: 'ก.ย. 2569', wd: 'พุธ', t: '–', a: 'ประกาศผลการเรียน ภาคเรียนที่ 1/2569', sub: 'ผ่านระบบ Prot Care', w: 'กลุ่มงานวัดผลและประเมินผล', s: '2026-09-23T00:00', e: '2026-09-23T23:59' },
    { dd: '24', mm: 'ก.ย. 2569', wd: 'พฤหัสบดี', t: '09.00 – 16.00 น.', a: 'แก้ไขผลการเรียน ครั้งที่ 1 รอบที่ 1 (เช้า) และรอบที่ 2 (บ่าย)', sub: 'ณ หอประชุมคุณแม่จ่อย ดร.อนันต์ เล็กใจซื่อ', w: 'นักเรียน / ครูประจำวิชา', s: '2026-09-24T00:00', e: '2026-09-24T23:59' },
    { dd: '28–30', mm: 'ก.ย. 2569', wd: 'จันทร์ – พุธ', t: 'ในวันทำการ', a: 'แก้ไขผลการเรียนแบบออนไลน์ ครั้งที่ 1 (ต่อ)', sub: 'เปิดให้ทุกกลุ่มสาระการเรียนรู้ นักเรียนติดต่อครูประจำวิชา รับงานและส่งงาน ผ่านช่องทางออนไลน์ของครูประจำวิชาทุกรายวิชา', w: 'นักเรียน / ครูประจำวิชา', s: '2026-09-28T00:00', e: '2026-09-30T16:00', key: true },
    { dd: '30', mm: 'ก.ย. 2569', wd: 'พุธ', t: '16.00 น.', a: 'ปิดรับงานจากนักเรียน', w: 'ครูประจำวิชา', s: '2026-09-30T00:00', e: '2026-09-30T16:00', key: true },
    { dd: '1', mm: 'ต.ค. 2569', wd: 'พฤหัสบดี', t: 'ภายใน 12.00 น.', a: 'ครูแก้ไขผลการเรียนในระบบ Prot Care ให้แล้วเสร็จ', sub: 'สถานะขึ้น “รออนุมัติ”', w: 'ครูประจำวิชา', s: '2026-10-01T00:00', e: '2026-10-01T12:00' },
    { dd: '1', mm: 'ต.ค. 2569', wd: 'พฤหัสบดี', t: '15.30 น.', a: 'อนุมัติผลการเรียนในระบบ Prot Care', w: 'กลุ่มงานวัดผลและประเมินผล', s: '2026-10-01T12:00', e: '2026-10-01T15:30' },
    { dd: '2', mm: 'ต.ค. 2569', wd: 'ศุกร์', t: '09.00 น.', a: 'ประกาศผลการแก้ไขผลการเรียนผ่านระบบ Prot Care', sub: 'นักเรียนตรวจสอบผลในแอป PROT Student Care เมนู “ผลการเรียน” · หากผลยังไม่ตรง ให้เตรียมหลักฐานและติดต่อครูประจำวิชา', w: 'กลุ่มงานวัดผลและประเมินผล', s: '2026-10-02T09:00', e: '2026-10-02T23:59', key: true },
    { dd: '28', mm: 'ต.ค. 2569', wd: 'พุธ', t: 'ช่วงเข้าแถวตอนเช้า', a: 'แก้ไขผลการเรียน ครั้งที่ 2: รับใบแสดงรายวิชาที่ต้องแก้ไขผลการเรียน', sub: 'นักเรียนรับจากครูที่ปรึกษา · ครูประจำวิชารับเอกสารบันทึกการแก้ไขผลการเรียนจากหัวหน้ากลุ่มสาระการเรียนรู้', w: 'นักเรียน / ครูที่ปรึกษา / ครูประจำวิชา', s: '2026-10-28T00:00', e: '2026-10-28T09:00', key: true },
    { dd: '28–30', mm: 'ต.ค. 2569', wd: 'พุธ – ศุกร์', t: 'ในเวลาเรียนและนอกเวลาเรียน', a: 'นักเรียนติดต่อครูประจำวิชาด้วยตนเอง รับภาระงานหรือสอบแก้ตัว', sub: 'ช่วงเช้า พักกลางวัน และช่วงเย็น · รายวิชาของครูที่ย้ายไปแล้ว ติดต่อหัวหน้ากลุ่มสาระการเรียนรู้', w: 'นักเรียน / ครูประจำวิชา', s: '2026-10-28T00:00', e: '2026-10-30T15:10', key: true },
    { dd: '30', mm: 'ต.ค. 2569', wd: 'ศุกร์', t: 'ก่อน 15.10 น.', a: 'นักเรียนส่งงานวันสุดท้าย', w: 'นักเรียน', s: '2026-10-30T00:00', e: '2026-10-30T15:10', key: true },
    { dd: '30', mm: 'ต.ค. 2569', wd: 'ศุกร์', t: 'ก่อน 16.00 น.', a: 'ครูประจำวิชาส่งเอกสารบันทึกผลการแก้ไขผลการเรียน', sub: 'ห้องสำนักงานวิชาการ กล่องสีส้ม · ครูที่ปรึกษาและหัวหน้ากลุ่มสาระส่งคืนบัญชีลงชื่อที่กล่องสีม่วง', w: 'ครูประจำวิชา / ครูที่ปรึกษา / หัวหน้ากลุ่มสาระ', s: '2026-10-30T00:00', e: '2026-10-30T16:00' },
    { dd: '2', mm: 'พ.ย. 2569', wd: 'จันทร์', t: 'ตั้งแต่ 18.00 น.', a: 'ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 2 ผ่านระบบ SGS', sub: 'หากผลยังไม่ตรงกับที่ครูประจำวิชาลงนามไว้ ให้นำใบแสดงรายวิชาที่ครูลงนามมาติดต่อห้องสำนักงานวิชาการ', w: 'กลุ่มงานวัดผลและประเมินผล', s: '2026-11-02T18:00', e: '2026-11-02T18:00', key: true }
  ];
  function calState(x) {
    if (x.term) return 'next';
    var now = Date.now(), st = Date.parse(x.s + ':00+07:00'), en = Date.parse(x.e + ':00+07:00');
    if (now > en) return 'done';
    if (now >= st) return 'now';
    return 'next';
  }
  var CAL_LBL = { done: 'ดำเนินการแล้ว', now: 'กำลังดำเนินการ', next: '' };

  function viewSchedule() {
    var h = '<div class="cal-hero">' +
      '<div class="cal-hero-eyebrow">' + (announced2() ? 'ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 2 แล้ว · วันจันทร์ที่ 2 พฤศจิกายน 2569 เวลา 18.00 น. ทางระบบ SGS'
        : 'การแก้ไขผลการเรียน ครั้งที่ 2 ภาคเรียนที่ 1/2569 · แก้ไขที่โรงเรียน') + '</div>' +
      '<h1 class="cal-hero-title">ปฏิทินการแก้ไขผลการเรียน</h1>' +
      '<div class="cal-hero-sub">ครั้งที่ 2 วันพุธที่ 28 – วันศุกร์ที่ 30 ตุลาคม 2569 นักเรียนติดต่อครูประจำวิชาด้วยตนเอง ประกาศผลทางระบบ SGS · ' +
      'ครั้งที่ 1 ดำเนินการแล้ว ประกาศผลเมื่อวันศุกร์ที่ 2 ตุลาคม 2569</div>' +
      '<div class="kd-grid">' +
      kd('รับใบแสดงรายวิชา', '28', 'ต.ค.', 'พุธ · ช่วงเข้าแถวตอนเช้า', 'จากครูที่ปรึกษา') +
      kd('นักเรียนส่งงานภายใน', '30', 'ต.ค.', 'ศุกร์ · ก่อน 15.10 น.', 'ครูส่งเอกสารก่อน 16.00 น.') +
      kd('ประกาศผล', '2', 'พ.ย.', 'จันทร์ · ตั้งแต่ 18.00 น.', 'ผ่านระบบ SGS') +
      '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>ลำดับเวลา</h2><span class="small muted">สถานะอัปเดตตามวันเวลาปัจจุบัน</span></div><div class="card-body"><ol class="ctl">';
    CAL_TL.forEach(function (x) {
      var st = calState(x);
      h += '<li class="ctl-item is-' + st + (x.key ? ' is-key' : '') + (x.term ? ' is-term' : '') + '">' +
        '<div class="ctl-date"><div class="ctl-dd">' + esc(x.dd) + '</div><div class="ctl-mm">' + esc(x.mm) + '</div>' +
        (x.wd ? '<div class="ctl-wd">' + esc(x.wd) + '</div>' : '') + '</div>' +
        '<div class="ctl-dot"></div>' +
        '<div class="ctl-body">' +
        '<div class="ctl-top">' + (x.t && x.t !== '–' ? '<span class="ctl-time">' + esc(x.t) + '</span>' : '') +
        (CAL_LBL[st] ? '<span class="chip ' + (st === 'now' ? 'chip-now' : 'chip-done') + '">' + CAL_LBL[st] + '</span>' : '') + '</div>' +
        '<div class="ctl-act">' + esc(x.a) + '</div>' +
        (x.sub ? '<div class="ctl-sub">' + esc(x.sub) + '</div>' : '') +
        '<div class="ctl-who">' + esc(x.w) + '</div>' +
        '</div></li>';
    });
    h += '</ol></div></div>';

    h += '<div class="card"><div class="card-head"><h2>ตารางปฏิทิน ครั้งที่ 2</h2><span class="small muted">กลุ่มงานวัดผลและประเมินผล กลุ่มบริหารวิชาการ</span></div>' +
      '<div class="card-body">' + calTable(CAL2) + '</div></div>';

    h += '<div class="card muted-card"><div class="card-head"><h2>ตารางปฏิทิน ครั้งที่ 1 ตามประกาศปรับปฏิทินเนื่องจากสถานการณ์น้ำท่วม</h2><span class="chip chip-done">ดำเนินการแล้ว</span></div>' +
      '<div class="card-body">' + calTable(NEWCAL) + '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>รายการที่ยกเลิกหรือเลื่อน</h2></div><div class="card-body"><div class="cx-list">' +
      cx('จันทร์ที่ 28 กันยายน 2569 · 09.00 – 12.00 น.', 'ครั้งที่ 1 รอบที่ 3 ณ หอประชุมคุณแม่จ่อย ดร.อนันต์ เล็กใจซื่อ (' +
        ['SOC', 'CAREER', 'PE'].map(gname).join(' / ') + ')', 'ยกเลิก – เปลี่ยนเป็นออนไลน์') +
      cx('จันทร์ที่ 28 กันยายน 2569 · 13.00 – 16.00 น.', 'ครูผู้สอนส่งผลการแก้ไขผลการเรียน ครั้งที่ 1', 'ยกเลิก – ใช้กำหนดตามปฏิทินใหม่') +
      cx('อังคารที่ 29 กันยายน 2569', 'ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 1', 'ยกเลิก – รวมประกาศวันศุกร์ที่ 2 ตุลาคม 2569') +
      cx('พุธที่ 30 กันยายน – พฤหัสบดีที่ 1 ตุลาคม 2569', 'ครั้งที่ 2 ณ ห้อง 122 123 124 และ 125 อาคาร 1', 'เลื่อนไปภาคเรียนที่ 2') +
      '</div></div></div>';

    h += '<div class="card muted-card"><div class="card-head"><h2>ดำเนินการแล้ว · ครั้งที่ 1 วันที่ 24 กันยายน 2569</h2></div><div class="table-scroll">' +
      '<table><thead><tr><th>รอบ / เวลา</th><th>กลุ่มที่ปฏิบัติหน้าที่</th></tr></thead><tbody>' +
      '<tr><td class="nowrap">รอบที่ 1 (เช้า)<div class="small muted">09.00 – 12.00 น.</div></td>' +
      '<td>' + ['SCI', 'FL'].map(gname).map(esc).join(' · ') + '</td></tr>' +
      '<tr><td class="nowrap">รอบที่ 2 (บ่าย)<div class="small muted">13.00 – 16.00 น.</div></td>' +
      '<td>' + ['THAI', 'ART', 'MATH', 'SUPPORT', 'ACT'].map(gname).map(esc).join(' · ') + '</td></tr>' +
      '</tbody></table></div><div class="card-body small muted" style="padding-top:10px">ณ หอประชุมคุณแม่จ่อย ดร.อนันต์ เล็กใจซื่อ</div></div>';
    return h;
  }
  function kd(k, d, m, sub, who) {
    return '<div class="kd"><div class="kd-k">' + esc(k) + '</div>' +
      '<div class="kd-date"><span class="kd-d">' + esc(d) + '</span><span class="kd-m">' + esc(m) + '</span></div>' +
      '<div class="kd-sub">' + esc(sub) + '</div><div class="kd-who">' + esc(who) + '</div></div>';
  }
  function cx(date, what, label) {
    return '<div class="cx-row"><div class="cx-main"><div class="cx-date">' + esc(date) + '</div><div class="cx-what">' + esc(what) + '</div></div>' +
      '<span class="chip chip-cancel">' + esc(label) + '</span></div>';
  }

  /* ================= GUIDE ================= */
  function viewGuide() {
    var m = D.meta;
    var h = '<h1 class="page-title">คำชี้แจงและเอกสารประกอบ</h1>' +
      '<p class="page-lead">การแก้ไขผลการเรียน (เรียนซ่อมเสริมและสอบแก้ตัว) ครั้งที่ 2 ภาคเรียนที่ 1 ปีการศึกษา 2569 ' +
      'และข้อมูลครั้งที่ 1 ตามประกาศโรงเรียนพรตพิทยพยัต ลงวันที่ 21 กันยายน 2569 และคำสั่งโรงเรียนพรตพิทยพยัต ที่ 239/2569 (เก็บไว้อ้างอิง)</p>';

    h += '<div class="card"><div class="card-head"><h2>การแก้ไขผลการเรียน ครั้งที่ 2 ภาคเรียนที่ 1/2569</h2>' +
      (announced2() ? '<span class="chip chip-done">ประกาศผลแล้ว 2 พ.ย. 2569 เวลา 18.00 น.</span>' : '<span class="chip chip-alert">28 – 30 ต.ค. 2569</span>') +
      '</div><div class="card-body">' +
      '<p style="margin-top:0">สำหรับนักเรียนชั้นมัธยมศึกษาปีที่ 1 – 6 ที่ยังมีผลการเรียน 0, ร หรือ มผ ในรายวิชาหรือกิจกรรมของภาคเรียนที่ 1 ปีการศึกษา 2569 ' +
      'แก้ไขที่โรงเรียน นักเรียนติดต่อครูประจำวิชาด้วยตนเอง ประกาศผลทางระบบ SGS วันจันทร์ที่ 2 พฤศจิกายน 2569 ตั้งแต่เวลา 18.00 น.</p>' +
      '<div class="grid g3 guide-cols">' +
      '<div><h3 class="gh">สำหรับนักเรียน</h3>' + steps2() + '</div>' +
      '<div><h3 class="gh">สำหรับครูประจำวิชา</h3><ol class="list-reset">' +
      '<li>รับเอกสารบันทึกการแก้ไขผลการเรียนจากหัวหน้ากลุ่มสาระการเรียนรู้ วันพุธที่ 28 ตุลาคม 2569</li>' +
      '<li>รับนักเรียนทั้งในและนอกเวลาเรียน นักเรียนส่งงานภายในวันศุกร์ที่ 30 ตุลาคม 2569 ก่อนเวลา 15.10 น.</li>' +
      '<li>บันทึกผลในเอกสาร (0 เป็น 1 · ร เป็นระดับผลการเรียนตามคะแนนจริง · มผ เป็น ผ) และลงนามในใบของนักเรียนเมื่อแก้ผ่าน</li>' +
      '<li>ถ่ายภาพเอกสารเก็บไว้ แล้วส่งที่ห้องสำนักงานวิชาการ ภายในวันศุกร์ที่ 30 ตุลาคม 2569 ก่อนเวลา 16.00 น.</li>' +
      '<li>ไม่ต้องแก้ผลในระบบ Prot Care กลุ่มงานวัดผลและประเมินผลแก้ผลในระบบ SGS ให้</li></ol></div>' +
      '<div><h3 class="gh">สำหรับครูที่ปรึกษา</h3><ol class="list-reset">' +
      '<li>รับใบแสดงรายวิชาของนักเรียนในห้อง วันพุธที่ 28 ตุลาคม 2569 ช่วงเข้าแถวตอนเช้า ที่โต๊ะข้างเวที ลานโดมอเนกประสงค์หน้าอาคาร 1</li>' +
      '<li>มอบใบให้นักเรียนและให้นักเรียนลงชื่อรับ</li>' +
      '<li>ส่งคืนบัญชีลงชื่อที่ห้องสำนักงานวิชาการ ภายในวันศุกร์ที่ 30 ตุลาคม 2569</li>' +
      '<li>กำกับติดตามให้นักเรียนส่งงานให้ครบภายในกำหนด</li></ol></div>' +
      '</div>' +
      '<div class="notice warn" style="margin-top:16px"><strong>ข้อควรทราบ</strong><div style="margin-top:6px">' + notes2() + '</div></div>' +
      '<div class="notice info" style="margin-top:12px"><strong>สำหรับผู้ปกครอง</strong><div class="small" style="margin-top:4px">' +
      'สอบถามนักเรียนเกี่ยวกับใบแสดงรายวิชาที่ได้รับจากครูที่ปรึกษา และกำกับติดตามให้ติดต่อครูประจำวิชาและส่งภาระงานให้ครบภายในกำหนด ' +
      'หากมีข้อสงสัยโปรดติดต่อครูประจำวิชาหรือครูที่ปรึกษาโดยตรง</div></div>' +
      '<div class="small" style="margin-top:14px"><a href="#/schedule">ดูปฏิทินครั้งที่ 2</a></div>' +
      '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 1 ภาคเรียนที่ 1/2569</h2>' +
      '<span class="chip chip-done">ประกาศผลแล้ว 2 ต.ค. 2569 เวลา 09.00 น.</span></div><div class="card-body">' +
      '<div class="grid g2"><img class="info-img" src="info/info-result-announce-1.jpg" alt="ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 1 ภาคเรียนที่ 1/2569 วันศุกร์ที่ 2 ตุลาคม 2569 เวลา 09.00 น.">' +
      '<div><p style="margin-top:0">ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 1 ผ่านระบบ Prot Care เมื่อวันศุกร์ที่ 2 ตุลาคม 2569 เวลา 09.00 น. ' +
      'นักเรียนที่ยังมีผลการเรียน 0 / ร / มผ ให้แก้ไขในครั้งที่ 2 ตามรายละเอียดด้านบน</p>' +
      '<div class="notice warn" style="margin-top:14px"><strong>ผลครั้งที่ 1 ไม่ตรงกับที่ดำเนินการไว้</strong>' +
      '<div class="small" style="margin-top:4px">ให้นำหลักฐาน (ภาพการส่งงานออนไลน์ หรือใบที่ครูผู้สอนลงนาม) ไปติดต่อครูประจำวิชาโดยตรง ภายในวันที่ 28 – 30 ตุลาคม 2569</div></div>' +
      '</div></div></div></div>';

    h += '<div class="card"><div class="card-head"><h2>การแก้ไขผลการเรียนแบบออนไลน์ ครั้งที่ 1 (ต่อ)</h2><span class="chip chip-done">ดำเนินการแล้ว</span></div><div class="card-body">' +
      '<p style="margin-top:0">ตั้งแต่วันจันทร์ที่ 28 กันยายน 2569 การแก้ไขผลการเรียน ครั้งที่ 1 (ต่อ) เปลี่ยนเป็นแบบออนไลน์ทั้งหมด ไม่ต้องมาโรงเรียน ' +
      'ไม่แบ่งรอบเช้า-บ่าย และไม่กำหนดห้อง เปิดให้ทุกกลุ่มสาระการเรียนรู้ นักเรียนติดต่อครูประจำวิชา รับงานและส่งงานผ่านช่องทางออนไลน์ ' +
      'ภายในวันพุธที่ 30 กันยายน 2569 เวลา 16.00 น. ประกาศผลวันศุกร์ที่ 2 ตุลาคม 2569 เวลา 09.00 น. ผ่านระบบ Prot Care ' +
      'ส่วนการแก้ไขผลการเรียน ครั้งที่ 2 เลื่อนไปภาคเรียนที่ 2 ปีการศึกษา 2569 (กำหนดวันแจ้งภายหลัง)</p>' +
      '<div class="grid g3 guide-cols">' +
      '<div><h3 class="gh">สำหรับนักเรียน</h3><ol class="list-reset">' +
      '<li>เปิดแอป Prot Care จับภาพหน้าจอ “ผลการเรียนที่ยังไม่ผ่าน”</li>' +
      '<li>ส่งภาพให้ครูประจำวิชาทางช่องทางออนไลน์ของรายวิชา เพื่อรับภาระงาน</li>' +
      '<li>ทำงานและส่งภายใน 30 ก.ย. 16.00 น. ติดต่อด้วยการพิมพ์ข้อความเท่านั้น</li>' +
      '<li>ตรวจสอบผลในแอป วันศุกร์ที่ 2 ตุลาคม 2569</li></ol></div>' +
      '<div><h3 class="gh">สำหรับครูประจำวิชา</h3><ol class="list-reset">' +
      '<li>มอบภาระงานและรับงานผ่านช่องทางออนไลน์ของรายวิชา รับงานถึงวันพุธที่ 30 กันยายน 2569 เวลา 16.00 น.</li>' +
      '<li>แก้ไขผลการเรียนในระบบ Prot Care ให้สถานะขึ้น “รออนุมัติ” ภายในวันพฤหัสบดีที่ 1 ตุลาคม 2569 เวลา 12.00 น.</li>' +
      '<li>เอกสารรายงานผลการแก้ไขผลการเรียนรายวิชา ส่งภายหลังเมื่อโรงเรียนเปิดทำการตามปกติ (รอแจ้งกำหนดส่งอีกครั้ง)</li></ol></div>' +
      '<div><h3 class="gh">สำหรับครูที่ปรึกษา</h3><ol class="list-reset">' +
      '<li>ส่งประกาศและข้อความแจ้งนักเรียน/ผู้ปกครองในกลุ่มห้องเรียน</li>' +
      '<li>ช่วยประสานนักเรียนที่ติดต่อครูประจำวิชาไม่ได้</li>' +
      '</ol></div>' +
      '</div>' +
      '<div class="notice warn" style="margin-top:16px"><strong>ข้อควรทราบ</strong><ul class="list-reset" style="margin-top:6px">' +
      '<li>นักเรียนที่บ้านได้รับผลกระทบจากน้ำท่วม หรือไม่มีอุปกรณ์/อินเทอร์เน็ต ให้แจ้งครูที่ปรึกษา จะได้แก้ไขในครั้งที่ 2 ภาคเรียนที่ 2 โดยไม่เสียสิทธิ์</li>' +
      '<li>ผลการเรียน มส ไม่อยู่ในขอบข่ายของกิจกรรมนี้ ต้องเรียนซ้ำตามระเบียบของโรงเรียน</li>' +
      '<li>ขอให้นักเรียนดูแลความปลอดภัยของตนเองและครอบครัวเป็นสำคัญ</li>' +
      '</ul></div></div></div>';

    h += '<div class="card"><div class="card-head"><h2>ประกาศและอินโฟกราฟิก ฉบับปรับปฏิทินเนื่องจากน้ำท่วม</h2></div><div class="card-body">' +
      '<img class="info-img" src="info/info-flood-calendar.jpg" alt="แจ้งปรับเปลี่ยนปฏิทินกิจกรรมการเรียนซ่อมเสริมและสอบแก้ตัว ภาคเรียนที่ 1 ปีการศึกษา 2569 เนื่องจากสถานการณ์น้ำท่วม">' +
      '<div class="grid g2" style="margin-top:14px">' +
      '<img class="info-img" src="info/info-flood-student.jpg" alt="ประกาศด่วน สำหรับนักเรียน: ครั้งที่ 1 (ต่อ) เปลี่ยนเป็นออนไลน์ 28 – 30 ก.ย. 2569">' +
      '<img class="info-img" src="info/info-flood-teacher.jpg" alt="แจ้งครูประจำวิชา: แก้ผลการเรียนออนไลน์ ครั้งที่ 1">' +
      '</div></div></div>';

    h += '<div class="card"><div class="card-head"><h2>ปฏิทินครั้งที่ 1 (ฉบับปรับเนื่องจากสถานการณ์น้ำท่วม)</h2><span class="chip chip-done">ดำเนินการแล้ว</span></div><div class="card-body">' + calTable(NEWCAL) + '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>วิธีเข้าดูผลการเรียนในแอป PROT Student Care</h2></div><div class="card-body">' +
      '<div class="grid g2"><img class="info-img" src="info/info-student-care.jpg" alt="วิธีเข้าดูผลการเรียน">' +
      '<div><ol class="list-reset">' +
      '<li>เปิดแอปพลิเคชัน PROT Student Care</li>' +
      '<li>กรอกชื่อผู้ใช้ (เลขประจำตัวนักเรียน) และรหัสผ่าน แล้วกด “เข้าระบบ”</li>' +
      '<li>ที่หน้าเมนูหลัก กดเมนู “ผลการเรียน”</li>' +
      '<li>เลือกชื่อนักเรียนของตนเอง และเลือกภาคเรียนเป็น 1/2569</li>' +
      '<li>ระบบจะแสดงผลการเรียนของภาคเรียนนั้น</li>' +
      '</ol><div class="small muted" style="margin-top:8px">หากรายวิชาใดยังไม่ปรากฏผลการเรียน ให้สอบถามครูประจำวิชาโดยตรงทางช่องทางออนไลน์</div>' +
      '</div></div></div></div>';

    h += '<details class="card old-docs"><summary>อินโฟกราฟิกฉบับเดิม (ก่อนวันที่ 28 กันยายน 2569)</summary><div class="card-body">' +
      '<div class="notice warn" style="margin-bottom:12px">กำหนดการ รอบ และห้องในภาพเหล่านี้ <strong>ยกเลิกแล้ว</strong> ตั้งแต่วันจันทร์ที่ 28 กันยายน 2569 ให้ยึดปฏิทินใหม่ด้านบน</div>' +
      '<div class="grid g2">' +
      '<img class="info-img" src="info/info-student-overview.jpg" alt="ฉบับเดิม: กิจกรรมเรียนซ่อมเสริมและสอบแก้ตัว สำหรับนักเรียน">' +
      '<img class="info-img" src="info/info-student-schedule.jpg" alt="ฉบับเดิม: ตารางไปพบครูประจำวิชา">' +
      '<img class="info-img" src="info/info-teacher-overview.jpg" alt="ฉบับเดิม: แจ้งครู">' +
      '<img class="info-img" src="info/info-teacher-schedule.jpg" alt="ฉบับเดิม: ตารางปฏิบัติหน้าที่">' +
      '</div></div></details>';

    h += '<div class="card"><div class="card-head"><h2>ที่มาของข้อมูลและการตรวจสอบ</h2></div><div class="card-body">' +
      '<h3 style="margin:0 0 6px; font-size:.98rem">ข้อมูลในเว็บไซต์นี้นำมาจาก</h3><ul class="list-reset">' +
      m.sources.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '<li>ครั้งที่ 1 (เก็บไว้อ้างอิง) — ' + esc(D1 && D1 !== D ? 'ผลการเรียนจากระบบ Prot Care ณ ' + D1.meta.asOf : '') + ' · ปฏิทินที่ปรับเป็นแบบออนไลน์ตามนโยบายของผู้บริหารโรงเรียน เนื่องจากสถานการณ์น้ำท่วม มีผลตั้งแต่วันจันทร์ที่ 28 กันยายน 2569</li>' +
      '<li>ช่องทางติดต่อออนไลน์ของครูประจำวิชา — ข้อมูลจากกลุ่มสาระการเรียนรู้</li>' +
      '</ul><h3 style="margin:16px 0 6px; font-size:.98rem">การตรวจสอบความถูกต้อง</h3><ul class="list-reset">' +
      m.verification.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ul>' +
      '<div class="notice info" style="margin-top:12px"><strong>ข้อมูลผลการเรียนชุดนี้เป็นสถานะ ณ ' + esc(m.asOf) + '</strong>' +
      ' — เป็นสถานะผลการเรียน ณ เวลาดังกล่าว หากมีการแก้ไขผลการเรียนในระบบหลังเวลานี้ ให้ยึดข้อมูลในระบบเป็นหลัก ' +
      'และเมื่อปรับปรุงข้อมูลชุดใหม่ วันและเวลาที่แสดงทุกหน้าจะเปลี่ยนตามอัตโนมัติ</div>' +
      '</div></div>';
    return h;
  }

  /* ================= global search ================= */
  function bindGlobalSearch() {
    var inp = document.getElementById('globalSearch'), pop = document.getElementById('globalResults');
    function close() { pop.hidden = true; pop.innerHTML = ''; }
    inp.addEventListener('input', function () {
      var raw = String(inp.value || '').trim(), q = norm(raw);
      if (q.length < 2) return close();
      var out = [];
      /* นักเรียน: ต้องพิมพ์รหัสประจำตัวครบ 5 หลักตรงกันเท่านั้น ไม่ค้นจากชื่อ */
      if (/^\d{5}$/.test(q)) {
        if (S[q]) out.push({ href: '#/student/' + q, tag: 'นักเรียน', main: 'รหัสประจำตัว ' + q, sub: 'เปิดข้อมูลรายบุคคล' });
        else out.push({ href: '#/student/' + q, tag: 'นักเรียน', main: 'รหัสประจำตัว ' + q, sub: 'ไม่พบรายวิชาที่ต้องแก้ไข' });
      }
      if (!/^\d+$/.test(q)) {
        D.teachers.slice().sort(byName).forEach(function (t) {
          if (out.length > 30) return;
          if (norm(t.name).indexOf(q) >= 0)
            out.push({ href: '#/teacher/' + t.id, tag: 'ครู', main: t.name, sub: t.groups.map(gname).join(' · ') || 'ครูผู้สอน' });
        });
        D.rooms.forEach(function (r) {
          if (norm(r.key).indexOf(q) >= 0)
            out.push({ href: '#/advisor/' + encodeURIComponent(r.key), tag: 'ห้อง', main: r.key, sub: 'สำหรับครูที่ปรึกษา' });
        });
      }
      if (!out.length) {
        pop.innerHTML = '<div style="padding:12px" class="muted small">' +
          (/^\d+$/.test(q) ? 'กรอกรหัสประจำตัวนักเรียนให้ครบ 5 หลัก' : 'ไม่พบข้อมูล · ค้นหาได้จากรหัสนักเรียน 5 หลัก ชื่อครู หรือห้องเรียน') + '</div>';
        pop.hidden = false; return;
      }
      pop.innerHTML = out.slice(0, 25).map(function (o) {
        return '<a href="' + o.href + '"><span class="tag">' + esc(o.tag) + '</span>' +
          '<span style="min-width:0"><strong>' + esc(o.main) + '</strong><br><span class="small muted">' + esc(o.sub) + '</span></span></a>';
      }).join('');
      pop.hidden = false;
    });
    pop.addEventListener('click', function () { setTimeout(function () { inp.value = ''; close(); }, 0); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.head-search')) close();
    });
  }

  /* ================= router ================= */
  function route() {
    var hash = location.hash.replace(/^#\/?/, '') || 'overview';
    var parts = hash.split('/');
    var page = parts[0], arg = parts.slice(1).join('/');
    var html = '', nav = page;
    if (page === 'overview') html = viewOverview();
    else if (page === 'students') html = viewStudents(decodeURIComponent(arg || ''));
    else if (page === 'student') { html = viewStudent(decodeURIComponent(arg)); nav = 'students'; }
    else if (page === 'teachers') html = viewTeachers();
    else if (page === 'teacher') { html = viewTeacher(decodeURIComponent(arg)); nav = 'teachers'; }
    else if (page === 'advisors') html = viewAdvisors();
    else if (page === 'advisor') { html = viewAdvisor(decodeURIComponent(arg)); nav = 'advisors'; }
    else if (page === 'schedule') html = viewSchedule();
    else if (page === 'guide') html = viewGuide();
    else { html = viewOverview(); nav = 'overview'; }
    app.innerHTML = html;
    bindRows();
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === nav);
    });
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  document.getElementById('dbMain').textContent =
    'รายชื่อแก้ไขผลการเรียน ครั้งที่ 2 จากระบบ SGS ณ ' + D.meta.asOf;
  document.getElementById('footMeta').textContent =
    'ข้อมูลผลการเรียน ณ ' + D.meta.asOf + ' · นักเรียนที่ต้องแก้ผลการเรียน ครั้งที่ 2 ' + nf(D.meta.totalStudentsWithIssue) +
    ' คน · ' + nf(D.meta.totalSubjectEntries) + ' รายการวิชา';
  var ph = document.querySelector('.print-head > div');
  if (ph) ph.insertAdjacentHTML('beforeend',
    '<div class="ph-asof">รายชื่อแก้ไขผลการเรียน ครั้งที่ 2 · ข้อมูลผลการเรียน ณ ' + D.meta.asOf + '</div>');
  bindGlobalSearch();
  route();
})();
