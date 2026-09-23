/* กิจกรรมเรียนซ่อมเสริมและสอบแก้ตัว 1/2569 — โรงเรียนพรตพิทยพยัต */
(function () {
  'use strict';
  var D = window.PROT;
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
  /* ตัดคำนำหน้าชื่อเพื่อใช้เรียงตามตัวอักษร */
  function bareName(n) { return String(n || '').replace(/^(ว่าที่\s*ร\.?\s*ต\.?\s*(หญิง)?\s*|นางสาว|นาง|นาย|Miss\s*|Mrs\.?\s*|Mr\.?\s*|Ms\.?\s*)/i, '').trim(); }
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
    var m = D.meta, a = m.activity;
    var lvl = {};
    D.rooms.forEach(function (r) {
      var L = r.key.split('/')[0];
      lvl[L] = lvl[L] || { n: 0, enrolled: 0, c: { '0': 0, 'ร': 0, 'มส': 0, 'มผ': 0 } };
      lvl[L].n += r.n; lvl[L].enrolled += r.enrolled;
      GR.forEach(function (g) { lvl[L].c[g] += r.counts[g]; });
    });
    var subj = {};
    D.students.forEach(function (s) {
      s.items.forEach(function (it) {
        subj[it.code] = subj[it.code] || { code: it.code, name: it.name, n: 0, g: it.g };
        subj[it.code].n++;
      });
    });
    var maxLoad = 0;
    GKEYS.forEach(function (k) { var l = D.stationLoad[k]; if (l && l.students > maxLoad) maxLoad = l.students; });

    var h = '';
    h += '<h1 class="page-title">ภาพรวมกิจกรรม</h1>' +
      '<p class="page-lead">' + esc(a.orderNo) + ' และประกาศโรงเรียนพรตพิทยพยัต ลงวันที่ ' + esc(a.announceDate) +
      '<br>ข้อมูลผลการเรียนดึงจากระบบ Prot Care เมื่อ<strong>' + esc(m.asOf) + '</strong></p>';

    h += '<div class="grid g4">' +
      '<div class="stat accent"><div class="k">นักเรียนที่ต้องแก้ผลการเรียน</div><div class="v">' + nf(m.totalStudentsWithIssue) + '</div><div class="n">จากนักเรียนทั้งหมด ' + nf(m.totalEnrolled) + ' คน</div></div>' +
      '<div class="stat"><div class="k">รายการวิชาที่ไม่ผ่าน</div><div class="v">' + nf(m.totalSubjectEntries) + '</div><div class="n">ใน 80 ห้องเรียน จาก 84 ห้อง</div></div>' +
      '<div class="stat"><div class="k">อยู่ในขอบข่ายกิจกรรม (0 / ร / มผ)</div><div class="v">' + nf(m.byGrade['0'] + m.byGrade['ร'] + m.byGrade['มผ']) + '</div><div class="n">0 = ' + nf(m.byGrade['0']) + ' · ร = ' + nf(m.byGrade['ร']) + ' · มผ = ' + nf(m.byGrade['มผ']) + '</div></div>' +
      '<div class="stat"><div class="k">ผลการเรียน มส (นอกขอบข่าย)</div><div class="v">' + nf(m.byGrade['มส']) + '</div><div class="n">ต้องเรียนซ้ำรายวิชา</div></div>' +
      '</div>';

    h += '<div class="card" style="margin-top:18px"><div class="card-head"><h2>กำหนดการสำคัญ</h2>' +
      '<span class="chip">รอบเช้า ' + esc(a.morning) + ' · รอบบ่าย ' + esc(a.afternoon) + '</span></div><div class="card-body"><div class="tl">' +
      tl(a.resultDate, 'ประกาศผลการเรียน ภาคเรียนที่ 1/2569', 'ผ่านระบบ Prot Care · นักเรียนและผู้ปกครองดูผลในแอป PROT Student Care') +
      tl(a.round1.days, 'กิจกรรมเรียนซ่อมเสริมและสอบแก้ตัว ครั้งที่ 1', 'ณ ' + a.round1.place + ' · ครูผู้สอนส่งผลการแก้ไข ' + a.round1.submit) +
      tl('อังคารที่ 29 กันยายน 2569', 'ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 1', 'นักเรียนที่ยังไม่ผ่านต้องเข้าร่วมกิจกรรมครั้งที่ 2') +
      tl(a.round2.days, 'กิจกรรมเรียนซ่อมเสริมและสอบแก้ตัว ครั้งที่ 2', 'ณ ' + a.round2.place + ' · ครูผู้สอนส่งผลการแก้ไข ' + a.round2.submit) +
      tl('ศุกร์ที่ 2 ตุลาคม 2569', 'ประกาศผลการแก้ไขผลการเรียน ครั้งที่ 2', 'สิ้นสุดกรอบเวลาของกิจกรรม') +
      '</div></div></div>';

    h += '<div class="card"><div class="card-head"><h2>ปริมาณงานของแต่ละกลุ่มสาระการเรียนรู้</h2>' +
      '<span class="small muted">ประมาณการจำนวนนักเรียนที่จะเข้าพบในแต่ละสถานี</span></div><div class="table-scroll">' +
      '<table><thead><tr><th>กลุ่มสาระ / กลุ่มงาน</th><th class="num">นักเรียน</th><th class="num">รายการวิชา</th>' +
      '<th>ครั้งที่ 1</th><th>ครั้งที่ 2</th></tr></thead><tbody>';
    GKEYS.map(function (k) { return { k: k, l: D.stationLoad[k] || { students: 0, entries: 0 } }; })
      .sort(function (x, y) { return y.l.students - x.l.students; })
      .forEach(function (o) {
        var g = D.groups[o.k];
        h += '<tr><td><a href="#/schedule">' + esc(g.name) + '</a></td>' +
          '<td class="num"><div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><span>' + o.l.students + '</span>' +
          '<span class="bar" style="width:90px"><span style="width:' + Math.round(o.l.students / maxLoad * 100) + '%"></span></span></div></td>' +
          '<td class="num">' + o.l.entries + '</td>' +
          '<td class="small">' + sessTxt(o.k, 'r1') + '</td>' +
          '<td class="small">' + sessTxt(o.k, 'r2') + '</td></tr>';
      });
    h += '</tbody></table></div></div>';

    h += '<div class="card" style="margin-top:18px"><div class="card-head"><h2>แยกตามระดับชั้น</h2>' +
      '<span class="small muted">ตัวเลขภาพรวมระดับชั้น ไม่แสดงรายห้อง รายวิชา หรือรายบุคคล</span></div><div class="table-scroll"><table>' +
      '<thead><tr><th>ระดับชั้น</th><th class="num">นักเรียนที่ต้องแก้</th><th class="num">ทั้งหมด</th><th class="num">0</th><th class="num">ร</th><th class="num">มส</th><th class="num">มผ</th></tr></thead><tbody>';
    ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].forEach(function (L) {
      var v = lvl[L]; if (!v) return;
      h += '<tr><td><strong>' + L + '</strong></td><td class="num">' + v.n + '</td><td class="num muted">' + v.enrolled + '</td>' +
        '<td class="num">' + v.c['0'] + '</td><td class="num">' + v.c['ร'] + '</td><td class="num">' + v.c['มส'] + '</td><td class="num">' + v.c['มผ'] + '</td></tr>';
    });
    h += '</tbody></table></div></div>';

    h += '<div class="grid g3" style="margin-top:18px">' +
      '<a class="stat golink" href="#/students"><div class="k">สำหรับนักเรียน</div><div class="gl-t">ตรวจสอบรายบุคคล</div><div class="n">กรอกรหัสประจำตัว 5 หลัก</div></a>' +
      '<a class="stat golink" href="#/teachers"><div class="k">สำหรับครูประจำวิชา</div><div class="gl-t">ดูรายชื่อในรายวิชาของท่าน</div><div class="n">เลือกชื่อของท่าน</div></a>' +
      '<a class="stat golink" href="#/advisors"><div class="k">สำหรับครูที่ปรึกษา</div><div class="gl-t">กำกับติดตามห้องของท่าน</div><div class="n">เลือกห้องเรียน</div></a>' +
      '</div>';

    h += '<div class="notice warn" style="margin-top:18px"><strong>ข้อควรทราบ</strong> ผลการเรียน “มส” ไม่อยู่ในขอบข่ายของกิจกรรมนี้ ' +
      'นักเรียนต้องเรียนซ้ำรายวิชาตามระเบียบการวัดและประเมินผลของโรงเรียน · ในหน้าเว็บนี้จึงแสดงรายการ มส ไว้เพื่อการกำกับติดตามของครูที่ปรึกษาเท่านั้น</div>';
    return h;
  }
  function tl(date, title, sub) {
    return '<div class="tl-item"><div class="tl-date">' + esc(date) + '</div>' +
      '<div><div><strong>' + esc(title) + '</strong></div><div class="small muted">' + esc(sub) + '</div></div></div>';
  }

  /* ================= STUDENTS ================= */
  /* แสดงเฉพาะรายบุคคล: ต้องกรอกรหัสประจำตัวให้ตรงทั้ง 5 หลัก ไม่มีการแสดงรายชื่อรวม */
  function viewStudents(q, miss) {
    var h = '<h1 class="page-title">ตรวจสอบรายบุคคล สำหรับนักเรียน</h1>' +
      '<p class="page-lead">กรอกรหัสประจำตัวนักเรียนของตนเอง เพื่อดูว่าต้องไปพบครูท่านใด วันใด เวลาใด และที่ไหน</p>';
    h += '<div class="card lookup"><div class="card-body">' +
      '<form id="stuForm" class="lookup-form" autocomplete="off">' +
      '<label for="stuCode" class="lookup-label">รหัสประจำตัวนักเรียน</label>' +
      '<div class="lookup-row">' +
      '<input id="stuCode" class="input lookup-input" inputmode="numeric" pattern="[0-9]*" maxlength="5" placeholder="เช่น 44731" value="' + esc(q || '') + '">' +
      '<button type="submit" class="btn btn-primary lookup-btn">ตรวจสอบ</button>' +
      '</div>' +
      '<div id="stuMsg" class="lookup-msg">' + (miss ? missMsg(miss) : '') + '</div>' +
      '</form>' +
      privacyNote('ระบบแสดงข้อมูลเป็นรายบุคคลเท่านั้น ไม่มีการแสดงรายชื่อนักเรียนรวม · หากตรวจสอบแล้วไม่พบรายการ แปลว่าไม่มีรายวิชาที่ต้องแก้ไขผลการเรียน ณ วันเวลาที่ดึงข้อมูล') +
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
    return '<div class="ok-box"><strong>ไม่พบรายวิชาที่ต้องแก้ไขผลการเรียนของรหัส ' + esc(code) + '</strong><br>' +
      'แปลว่ารหัสนี้ไม่มีผลการเรียน 0 / ร / มส / มผ ณ วันเวลาที่ดึงข้อมูล · หากนักเรียนมั่นใจว่ายังมีรายวิชาที่ไม่ผ่าน ' +
      'โปรดตรวจสอบรหัสอีกครั้ง หรือสอบถามครูที่ปรึกษา</div>';
  }

  function viewStudent(code) {
    var s = S[code];
    if (!s) return viewStudents(code, code);
    var room = R[s.room] || {};
    var inScope = s.items.filter(function (i) { return i.grade !== 'มส'; });
    var msItems = s.items.filter(function (i) { return i.grade === 'มส'; });
    var h = '<div class="card"><div class="card-body"><div style="display:flex; gap:18px; flex-wrap:wrap">' +
      avatar(stuPhoto(s), s.name, 'lg') +
      '<div style="flex:1 1 320px; min-width:260px">' +
      '<div class="small muted">' + esc(s.level) + '</div>' +
      '<h1 class="page-title" style="margin:2px 0">' + esc(s.name) + '</h1>' +
      '<div class="muted">รหัสประจำตัว ' + esc(s.code) + ' · ห้อง ' + esc(s.room) + ' เลขที่ ' + esc(s.no) +
      (room.homeroom ? ' · ห้องประจำ ' + esc(room.homeroom) : '') + '</div>' +
      '<div style="margin-top:10px">' + countChips(s.counts) + '</div>' +
      '<div class="small muted" style="margin-top:6px">รวม ' + s.items.length + ' รายวิชา · ' + s.credits + ' หน่วยกิต</div>' +
      '</div>' +
      '<div style="flex:0 1 300px"><div class="small muted" style="margin-bottom:6px">ครูที่ปรึกษา</div>' +
      (s.adv.length ? s.adv.map(function (id) { return personT(T[id], false); }).join('<div style="height:8px"></div>') : '<span class="muted">—</span>') +
      '</div></div></div></div>';

    h += '<div class="card"><div class="card-head"><h2>สิ่งที่นักเรียนต้องทำ</h2></div><div class="card-body">' +
      '<ol class="list-reset">' +
      '<li>ตรวจสอบผลการเรียนของตนเองในแอป PROT Student Care หลังวันประกาศผล (23 กันยายน 2569)</li>' +
      '<li>ไปพบครูประจำวิชาตามวัน เวลา และสถานที่ในตารางด้านล่าง พร้อม<strong>แสดงหน้าจอ “ผลการเรียนที่ยังไม่ผ่าน”</strong> ในแอปให้ครูดู — ไม่ต้องติดต่อสำนักงานวิชาการ</li>' +
      '<li>รับภาระงานหรือเข้าสอบแก้ตัว และส่งงานให้ครบก่อนกำหนด ครั้งที่ 1 ภายใน 28 ก.ย. 2569 เวลา 12.00 น. · ครั้งที่ 2 ภายใน 1 ต.ค. 2569 เวลา 12.00 น.</li>' +
      '<li>หากติดหลายรายวิชาในรอบเดียวกัน ให้แบ่งเวลาเข้าพบครูให้ครบทุกวิชาภายในรอบนั้น</li>' +
      '<li>แต่งกายด้วยเครื่องแบบนักเรียนให้ถูกต้อง และนำสมาร์ตโฟนที่ใช้ระบบ Prot Care ได้มาด้วยทุกครั้ง</li>' +
      '</ol></div></div>';

    if (msItems.length) {
      h += '<div class="notice warn" style="margin-top:18px"><strong>นักเรียนมีผลการเรียน มส จำนวน ' + msItems.length + ' รายวิชา</strong> ' +
        'ซึ่งไม่อยู่ในขอบข่ายของกิจกรรมนี้ ต้องเรียนซ้ำรายวิชาตามระเบียบการวัดและประเมินผลของโรงเรียน โปรดติดต่อครูที่ปรึกษาเพื่อดำเนินการต่อไป</div>';
    }

    ['r1', 'r2'].forEach(function (which) {
      var label = which === 'r1' ? 'ครั้งที่ 1 · 24 และ 28 กันยายน 2569' : 'ครั้งที่ 2 · 30 กันยายน – 1 ตุลาคม 2569';
      var sub = which === 'r1' ? 'ณ หอประชุมคุณแม่จ่อย ดร.อนันต์ เล็กใจซื่อ' : 'ณ ห้อง 122 123 124 และ 125 อาคาร 1 (เฉพาะผู้ที่ยังไม่ผ่านหลังประกาศผล 29 ก.ย.)';
      var sess = sessionsOf({ items: inScope }, which);
      h += '<div class="card"><div class="card-head"><h2>ตารางไปพบครู — ' + label + '</h2><span class="small muted">' + esc(sub) + '</span></div><div class="card-body">';
      if (!sess.length) { h += '<div class="muted">ไม่มีรายวิชาที่อยู่ในขอบข่ายของกิจกรรม</div>'; }
      sess.forEach(function (x) {
        h += '<div class="sess" style="margin-bottom:12px"><div class="lbl">รอบที่ ' + x.round + '</div>' +
          '<div class="d">' + esc(x.day) + ' · ' + esc(x.time) + '</div>' +
          '<div class="p">' + esc(x.place) + '</div>' +
          '<div style="margin-top:8px" class="table-scroll"><table><thead><tr><th>รายวิชา</th><th>ผล</th><th>ครูประจำวิชา</th></tr></thead><tbody>';
        x.items.forEach(function (it) {
          h += '<tr><td><div class="sname">' + esc(it.name) + '</div><div class="scode">' + esc(it.code) + ' · ' + esc(gname(it.g)) + '</div></td>' +
            '<td>' + gb(it.grade) + '</td><td>' + personT(T[it.t]) + '</td></tr>';
        });
        h += '</tbody></table></div></div>';
      });
      h += '</div></div>';
    });

    h += '<div class="card"><div class="card-head"><h2>รายวิชาที่ยังไม่ผ่านทั้งหมด</h2><span class="small muted">' + s.items.length + ' รายการ</span></div><div class="table-scroll"><table>' +
      '<thead><tr><th>รหัสวิชา</th><th>รายวิชา</th><th class="num">หน่วยกิต</th><th>ผล</th><th>ครูประจำวิชา</th><th>สถานีที่ต้องไปพบ</th></tr></thead><tbody>';
    s.items.forEach(function (it) {
      h += '<tr><td class="nowrap">' + esc(it.code) + '</td><td>' + esc(it.name) + '</td><td class="num">' + esc(it.credit) + '</td>' +
        '<td>' + gb(it.grade) + (it.grade === 'มส' ? ' <span class="chip chip-warn">นอกขอบข่าย</span>' : '') + '</td>' +
        '<td>' + personT(T[it.t]) + '</td>' +
        '<td class="small">' + esc(gname(it.g)) +
        (it.note === 'subject_group_differs' ? '<br><span class="muted">รายวิชาอยู่กลุ่ม ' + esc(gname(it.sg)) + ' แต่ครูผู้สอนปฏิบัติหน้าที่กับกลุ่ม ' + esc(gname(it.g)) + '</span>' : '') +
        (it.note === 'teacher_not_in_order' ? '<br><span class="muted">ครูผู้สอนไม่ปรากฏในคำสั่ง ให้ไปตามกลุ่มสาระของรายวิชา</span>' : '') +
        '</td></tr>';
    });
    h += '</tbody></table></div></div>';
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
      '<p class="page-lead">กดปุ่ม “ดูรายละเอียด” ที่ชื่อของท่าน เพื่อเปิดรายชื่อนักเรียนกลุ่มเป้าหมายในรายวิชาของท่าน พร้อมวัน เวลา และสถานที่ปฏิบัติหน้าที่</p>';
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
      '<div style="margin-top:10px">' + countChips(t.counts) + '</div>' +
      '</div>' +
      '<div style="flex:1 1 260px"><div class="grid g2">' +
      '<div class="stat"><div class="k">นักเรียนที่ต้องดูแล</div><div class="v">' + t.nStudents + '</div><div class="n">คน</div></div>' +
      '<div class="stat"><div class="k">รายการวิชา</div><div class="v">' + t.nEntries + '</div><div class="n">' + t.subjects.length + ' รายวิชา</div></div>' +
      '</div></div></div></div></div>';

    if (t.groups.length) {
      h += '<div class="card"><div class="card-head"><h2>วัน เวลา และสถานที่ปฏิบัติหน้าที่</h2></div><div class="card-body"><div class="grid g2">';
      t.groups.forEach(function (k) {
        h += '<div class="sess"><div class="lbl">' + esc(gname(k)) + ' · ครั้งที่ 1</div><div>' + sessTxt(k, 'r1') + '</div>' +
          '<div style="height:10px"></div><div class="lbl">' + esc(gname(k)) + ' · ครั้งที่ 2</div><div>' + sessTxt(k, 'r2') + '</div></div>';
      });
      h += '</div><div class="notice info" style="margin-top:12px">ครั้งที่ 2 ให้เฉพาะครูผู้สอนที่ยังมีนักเรียนค้างแก้ไขผลการเรียนตามรายชื่อในระบบ หลังประกาศผลครั้งที่ 1 (29 กันยายน 2569) มาประจำห้อง</div></div></div>';
    } else {
      h += '<div class="notice warn" style="margin-top:18px">ไม่พบชื่อครูในคำสั่งคณะกรรมการรับแก้ไขผลการเรียน ที่ 239/2569 — ระบบจึงจัดสถานีให้ตามกลุ่มสาระการเรียนรู้ของรายวิชา โปรดตรวจสอบกับหัวหน้ากลุ่มสาระฯ อีกครั้ง</div>';
    }

    h += '<div class="card"><div class="card-head"><h2>หน้าที่ของครูประจำวิชา</h2></div><div class="card-body"><ol class="list-reset">' +
      '<li>ตรวจสอบรายชื่อนักเรียนที่ได้ 0 / ร / มผ ในรายวิชาของตนเองจากระบบ Prot Care หลังวันประกาศผล</li>' +
      '<li>เตรียมภาระงานหรือแบบทดสอบให้พร้อมก่อนวันปฏิบัติหน้าที่</li>' +
      '<li>มาประจำสถานีตามวัน เวลา และสถานที่ของกลุ่มสาระฯ ตนเอง</li>' +
      '<li>แก้ไขผลการเรียนในระบบ Prot Care ด้วยตนเอง (สถานะ “รออนุมัติ”) และส่งเอกสารให้กลุ่มงานวัดผลฯ ภายใน 16.00 น. ของวันส่งผล</li>' +
      '</ol></div></div>';

    if (!t.subjects.length) {
      h += '<div class="card"><div class="empty">ไม่มีนักเรียนที่ต้องแก้ไขผลการเรียนในรายวิชาของท่าน ณ วันเวลาที่ดึงข้อมูล</div></div>';
      return h;
    }
    h += '<div class="card"><div class="card-head"><h2>นักเรียนกลุ่มเป้าหมาย แยกตามรายวิชา</h2>' +
      '<div class="no-print"><button class="btn" onclick="window.print()">พิมพ์รายชื่อ</button></div></div><div class="card-body">';
    t.subjects.slice().sort(function (a, b) { return b.students.length - a.students.length; }).forEach(function (sub) {
      var rows = sub.students.map(function (x) { return { s: S[x.code], grade: x.grade }; })
        .filter(function (x) { return x.s; })
        .sort(function (a, b) { return roomSort(a.s.room, b.s.room) || (+a.s.no - +b.s.no); });
      var cnt = { '0': 0, 'ร': 0, 'มส': 0, 'มผ': 0 };
      rows.forEach(function (r) { cnt[r.grade]++; });
      h += '<div class="subject-row"><div class="top">' +
        '<div><div class="sname">' + esc(sub.name) + '</div><div class="scode">' + esc(sub.code) + ' · สถานี ' + esc(gname(sub.g)) + '</div></div>' +
        '<div>' + countChips(cnt) + ' &nbsp; <span class="chip">' + rows.length + ' คน</span></div></div>' +
        '<div class="table-scroll" style="margin-top:10px"><table><thead><tr><th style="width:40px"></th><th>นักเรียน</th><th>ห้อง</th><th>ผล</th><th class="no-print">ดำเนินการแล้ว</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var key = 'prot1_2569:' + t.id + ':' + sub.code + ':' + r.s.code;
        var done = store(key) ? 'checked' : '';
        h += '<tr><td>' + avatar(stuPhoto(r.s), r.s.name, 'sm') + '</td>' +
          '<td><a href="#/student/' + r.s.code + '">' + esc(r.s.name) + '</a><div class="small muted">' + esc(r.s.code) + '</div></td>' +
          '<td class="nowrap">' + esc(r.s.room) + ' เลขที่ ' + esc(r.s.no) + '</td>' +
          '<td>' + gb(r.grade) + '</td>' +
          '<td class="no-print"><label class="checkline"><input type="checkbox" data-k="' + key + '" ' + done + '><span class="small muted">บันทึกในเครื่องนี้</span></label></td></tr>';
      });
      h += '</tbody></table></div></div>';
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
    var opts = '<option value="">— เลือกห้องเรียน —</option>' + Object.keys(byLv).map(function (L) {
      return '<optgroup label="' + esc(byLv[L][0].level || L) + '">' + byLv[L].map(function (r) {
        var names = r.adv.map(function (id) { return T[id] ? T[id].name : ''; }).filter(Boolean).join(', ');
        return '<option value="' + esc(r.key) + '">' + esc(r.key) + (names ? ' · ' + esc(names) : '') + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    var h = '<h1 class="page-title">ครูที่ปรึกษา</h1>' +
      '<p class="page-lead">เลือกห้องที่ท่านเป็นครูที่ปรึกษา เพื่อกำกับติดตามว่านักเรียนคนใดต้องไปพบครูท่านใด รอบใด</p>';
    h += '<div class="card lookup"><div class="card-body">' +
      '<form id="aForm" class="lookup-form" autocomplete="off">' +
      '<label for="aSel" class="lookup-label">ห้องเรียน · ครูที่ปรึกษา</label>' +
      '<div class="lookup-row">' +
      '<select id="aSel" class="input lookup-input">' + opts + '</select>' +
      '<button type="submit" class="btn btn-primary lookup-btn">เปิดข้อมูลห้อง</button>' +
      '</div><div id="aMsg" class="lookup-msg"></div></form>' +
      privacyNote('หน้านี้แสดงข้อมูลเฉพาะห้องที่ท่านเลือกเท่านั้น ไม่มีการแสดงหรือเปรียบเทียบจำนวนนักเรียนระหว่างห้อง') +
      '</div></div>';
    setTimeout(function () {
      var f = document.getElementById('aForm'), sel = document.getElementById('aSel');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!sel.value) { document.getElementById('aMsg').innerHTML = '<span class="err">กรุณาเลือกห้องเรียน</span>'; return; }
        location.hash = '#/advisor/' + encodeURIComponent(sel.value);
      });
    }, 0);
    return h;
  }

  function viewAdvisor(key) {
    var r = R[key];
    if (!r) return '<div class="card"><div class="empty">ไม่พบห้อง ' + esc(key) + '<br><a href="#/advisors">กลับไปเลือกห้อง</a></div></div>';
    var list = D.students.filter(function (s) { return s.room === key; })
      .sort(function (a, b) { return (+a.no) - (+b.no); });
    var h = '<div class="card"><div class="card-body"><div style="display:flex; gap:18px; flex-wrap:wrap; justify-content:space-between">' +
      '<div><div class="small muted">' + esc(r.level) + (r.homeroom ? ' · ห้องประจำ ' + esc(r.homeroom) : '') + '</div>' +
      '<h1 class="page-title" style="margin:2px 0">ห้อง ' + esc(r.key) + '</h1>' +
      '<div class="muted">ครูที่ปรึกษา</div><div style="display:flex; gap:16px; flex-wrap:wrap; margin-top:6px">' +
      r.adv.map(function (id) { return personT(T[id]); }).join('') + '</div></div>' +
      '<div class="grid g4" style="flex:1 1 420px; align-content:start">' +
      '<div class="stat"><div class="k">นักเรียนทั้งห้อง</div><div class="v">' + r.enrolled + '</div></div>' +
      '<div class="stat accent"><div class="k">ต้องแก้ผลการเรียน</div><div class="v">' + r.n + '</div><div class="n">' + (r.enrolled ? Math.round(r.n / r.enrolled * 100) : 0) + '% ของห้อง</div></div>' +
      '<div class="stat"><div class="k">รายการ 0 / ร / มผ</div><div class="v">' + (r.counts['0'] + r.counts['ร'] + r.counts['มผ']) + '</div></div>' +
      '<div class="stat"><div class="k">รายการ มส</div><div class="v">' + r.counts['มส'] + '</div><div class="n">ต้องเรียนซ้ำ</div></div>' +
      '</div></div></div></div>';

    h += '<div class="card"><div class="card-head"><h2>หน้าที่ของครูที่ปรึกษา</h2></div><div class="card-body"><ol class="list-reset">' +
      '<li>ตรวจสอบผลการเรียนของนักเรียนในที่ปรึกษาหลังวันประกาศผล</li>' +
      '<li>แจ้งและกำกับติดตามให้นักเรียนไปพบครูประจำวิชาตามรอบของกลุ่มสาระฯ ที่ตนเองติด</li>' +
      '<li>ย้ำให้นักเรียนแสดงหน้าจอ “ผลการเรียนที่ยังไม่ผ่าน” ในระบบ Prot Care แก่ครูประจำวิชา ไม่ต้องติดต่อสำนักงานวิชาการ</li>' +
      '<li>ติดตามนักเรียนที่ยังไม่ผ่านในครั้งที่ 1 ให้เข้าร่วมกิจกรรมครั้งที่ 2 ให้ครบ</li>' +
      '</ol></div></div>';

    /* round-by-round call sheet */
    ['r1', 'r2'].forEach(function (which) {
      var title = which === 'r1' ? 'ใบกำกับติดตาม ครั้งที่ 1' : 'ใบกำกับติดตาม ครั้งที่ 2';
      var byS = {};
      list.forEach(function (s) {
        s.items.filter(function (i) { return i.grade !== 'มส'; }).forEach(function (it) {
          var g = D.groups[it.g]; if (!g) return;
          var ses = g[which];
          var place = (which === 'r2' && it.room2) ? it.room2 : ses.place;
          var k = ses.day + '|' + ses.time + '|' + place;
          byS[k] = byS[k] || { round: ses.round, day: ses.day, time: ses.time, place: place, rows: [] };
          byS[k].rows.push({ s: s, it: it });
        });
      });
      var keys = Object.keys(byS).sort(function (a, b) { return byS[a].day.localeCompare(byS[b].day, 'th') || byS[a].round - byS[b].round; });
      h += '<div class="card"><div class="card-head"><h2>' + title + '</h2>' +
        '<span class="small muted">' + (which === 'r1' ? 'ณ หอประชุมคุณแม่จ่อย ดร.อนันต์ เล็กใจซื่อ' : 'ณ ห้อง 122–125 อาคาร 1 · เฉพาะผู้ที่ยังไม่ผ่านหลัง 29 ก.ย.') + '</span></div><div class="card-body">';
      if (!keys.length) h += '<div class="muted">ไม่มีนักเรียนที่ต้องเข้าร่วม</div>';
      keys.forEach(function (k) {
        var b = byS[k];
        var uniq = {}; b.rows.forEach(function (x) { uniq[x.s.code] = 1; });
        h += '<div class="sess" style="margin-bottom:12px"><div class="lbl">รอบที่ ' + b.round + ' · นักเรียน ' + Object.keys(uniq).length + ' คน · ' + b.rows.length + ' รายวิชา</div>' +
          '<div class="d">' + esc(b.day) + ' · ' + esc(b.time) + '</div><div class="p">' + esc(b.place) + '</div>' +
          '<div class="table-scroll" style="margin-top:8px"><table><thead><tr><th style="width:40px"></th><th>นักเรียน</th><th>รายวิชา</th><th>ผล</th><th>ครูประจำวิชา</th></tr></thead><tbody>';
        b.rows.sort(function (x, y) { return (+x.s.no) - (+y.s.no); }).forEach(function (x) {
          h += '<tr><td>' + avatar(stuPhoto(x.s), x.s.name, 'sm') + '</td>' +
            '<td><a href="#/student/' + x.s.code + '">' + esc(x.s.name) + '</a><div class="small muted">เลขที่ ' + esc(x.s.no) + ' · ' + esc(x.s.code) + '</div></td>' +
            '<td>' + esc(x.it.name) + '<div class="small muted">' + esc(x.it.code) + '</div></td>' +
            '<td>' + gb(x.it.grade) + '</td><td>' + personT(T[x.it.t]) + '</td></tr>';
        });
        h += '</tbody></table></div></div>';
      });
      h += '</div></div>';
    });

    h += '<div class="card"><div class="card-head"><h2>นักเรียนในที่ปรึกษาที่ต้องแก้ผลการเรียน</h2>' +
      '<div class="no-print"><button class="btn" onclick="window.print()">พิมพ์รายชื่อ</button></div></div><div class="card-body"><div class="student-grid">';
    list.forEach(function (s) {
      h += '<a class="scard" href="#/student/' + s.code + '">' + avatar(stuPhoto(s), s.name) +
        '<div style="min-width:0"><div class="nm">' + esc(s.name) + '</div>' +
        '<div class="mt">เลขที่ ' + esc(s.no) + ' · ' + esc(s.code) + '</div>' +
        '<div style="margin-top:4px">' + countChips(s.counts) + '</div>' +
        '<div class="mt" style="margin-top:4px">' + s.items.length + ' รายวิชา</div>' +
        '<div class="go">ดูรายละเอียด</div></div></a>';
    });
    h += '</div></div></div>';
    return h;
  }

  /* ================= SCHEDULE ================= */
  function viewSchedule() {
    var a = D.meta.activity;
    function load(k) { var l = D.stationLoad[k] || { students: 0, entries: 0 }; return l; }
    var h = '<h1 class="page-title">ตารางปฏิบัติหน้าที่และตารางไปพบครู</h1>' +
      '<p class="page-lead">' + esc(a.orderNo) + ' · รอบเช้า ' + esc(a.morning) + ' · รอบบ่าย ' + esc(a.afternoon) + '</p>';

    h += '<div class="card"><div class="card-head"><h2>ครั้งที่ 1 · ' + esc(a.round1.days) + '</h2><span class="small muted">ณ ' + esc(a.round1.place) + '</span></div><div class="table-scroll">' +
      '<table><thead><tr><th>รอบ</th><th>วัน / เวลา</th><th>กลุ่มที่ปฏิบัติหน้าที่</th><th class="num">นักเรียนที่คาดว่าจะเข้าพบ</th></tr></thead><tbody>';
    [
      { r: 1, day: 'พฤหัสบดีที่ 24 กันยายน 2569', time: '09.00 – 12.00 น.', gs: ['SCI', 'FL'] },
      { r: 2, day: 'พฤหัสบดีที่ 24 กันยายน 2569', time: '13.00 – 16.00 น.', gs: ['THAI', 'ART', 'MATH', 'SUPPORT', 'ACT'] },
      { r: 3, day: 'จันทร์ที่ 28 กันยายน 2569', time: '09.00 – 12.00 น.', gs: ['SOC', 'CAREER', 'PE'] }
    ].forEach(function (row) {
      var tot = row.gs.reduce(function (x, k) { return x + load(k).students; }, 0);
      h += '<tr><td><strong>' + row.r + '</strong></td><td>' + esc(row.day) + '<div class="small muted">' + esc(row.time) + '</div></td>' +
        '<td>' + row.gs.map(function (k) { return '<div>' + esc(gname(k)) + ' <span class="small muted">(' + load(k).students + ' คน · ' + load(k).entries + ' รายวิชา)</span></div>'; }).join('') + '</td>' +
        '<td class="num"><strong>' + tot + '</strong></td></tr>';
    });
    h += '<tr><td>—</td><td>จันทร์ที่ 28 กันยายน 2569<div class="small muted">13.00 – 16.00 น.</div></td>' +
      '<td colspan="2">ครูผู้สอนทุกกลุ่มส่งผลการแก้ไขผลการเรียน ครั้งที่ 1 (ภายใน 16.00 น.) · ประกาศผล อังคารที่ 29 กันยายน 2569</td></tr>';
    h += '</tbody></table></div></div>';

    h += '<div class="card"><div class="card-head"><h2>ครั้งที่ 2 · ' + esc(a.round2.days) + '</h2><span class="small muted">ณ ' + esc(a.round2.place) + '</span></div><div class="table-scroll">' +
      '<table><thead><tr><th>รอบ</th><th>วัน / เวลา</th><th>ห้อง 122</th><th>ห้อง 123</th><th>ห้อง 124</th><th>ห้อง 125</th></tr></thead><tbody>';
    function cell(k, extra) {
      if (!k) return '<td class="muted">ห้องสำรอง</td>';
      return '<td>' + esc(gname(k)) + (extra ? '<div class="small muted">' + esc(extra) + '</div>' : '') +
        '<div class="small muted">' + load(k).students + ' คน</div></td>';
    }
    h += '<tr><td><strong>1</strong></td><td>พุธที่ 30 กันยายน 2569<div class="small muted">09.00 – 12.00 น.</div></td>' +
      cell('SOC') + cell('CAREER') + cell('PE') + cell('MATH') + '</tr>';
    h += '<tr><td><strong>2</strong></td><td>พุธที่ 30 กันยายน 2569<div class="small muted">13.00 – 16.00 น.</div></td>' +
      cell('SCI') + '<td>' + esc(gname('FL')) + '<div class="small muted">ภาษาอังกฤษ</div></td>' +
      '<td>' + esc(gname('FL')) + '<div class="small muted">ภาษาที่สอง (ญี่ปุ่น / จีน / ฝรั่งเศส)</div></td>' + cell('THAI') + '</tr>';
    h += '<tr><td><strong>3</strong></td><td>พฤหัสบดีที่ 1 ตุลาคม 2569<div class="small muted">09.00 – 12.00 น.</div></td>' +
      cell('ART') + cell('SUPPORT') + cell('ACT') + cell(null) + '</tr>';
    h += '<tr><td>—</td><td>พฤหัสบดีที่ 1 ตุลาคม 2569<div class="small muted">13.00 – 16.00 น.</div></td>' +
      '<td colspan="4">ครูผู้สอนทุกกลุ่มส่งผลการแก้ไขผลการเรียน ครั้งที่ 2 (ภายใน 16.00 น.) · ประกาศผล ศุกร์ที่ 2 ตุลาคม 2569</td></tr>';
    h += '</tbody></table></div></div>';

    h += '<div class="card"><div class="card-head"><h2>สรุปตามกลุ่มสาระ</h2></div><div class="table-scroll"><table>' +
      '<thead><tr><th>กลุ่มสาระ / กลุ่มงาน</th><th class="num">นักเรียน</th><th class="num">รายการวิชา</th><th>ครั้งที่ 1</th><th>ครั้งที่ 2</th></tr></thead><tbody>';
    GKEYS.forEach(function (k) {
      h += '<tr><td><strong>' + esc(gname(k)) + '</strong><div class="small muted">' + esc(D.groups[k].full) + '</div></td>' +
        '<td class="num">' + load(k).students + '</td><td class="num">' + load(k).entries + '</td>' +
        '<td class="small">' + sessTxt(k, 'r1') + '</td><td class="small">' + sessTxt(k, 'r2') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';

    h += '<div class="notice" style="margin-top:18px"><strong>หมายเหตุ</strong><ul class="list-reset" style="margin-top:6px">' +
      '<li>กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ ในครั้งที่ 2 แบ่งเป็น ห้อง 123 สำหรับครูผู้สอนภาษาอังกฤษ และห้อง 124 สำหรับครูผู้สอนภาษาที่สอง</li>' +
      '<li>ครั้งที่ 2 ให้เฉพาะครูผู้สอนที่ยังมีนักเรียนค้างแก้ไขผลการเรียนหลังประกาศผลครั้งที่ 1 (29 กันยายน 2569) มาประจำห้อง · ห้อง 125 ในรอบที่ 3 เป็นห้องสำรอง</li>' +
      '<li>ครูที่เป็นทั้งครูกลุ่มสาระการเรียนรู้ภาษาไทยและกรรมการกิจกรรมพัฒนาผู้เรียน ให้ปฏิบัติหน้าที่ทั้งสองรอบในครั้งที่ 2</li>' +
      '<li>ตัวเลขจำนวนนักเรียนเป็นค่าประมาณจากผลการเรียน ณ วันที่ดึงข้อมูล ใช้เพื่อวางแผนจัดสถานีเท่านั้น</li>' +
      '</ul></div>';
    return h;
  }

  /* ================= GUIDE ================= */
  function viewGuide() {
    var m = D.meta;
    var h = '<h1 class="page-title">คำชี้แจงและเอกสารประกอบ</h1>' +
      '<p class="page-lead">ประกาศโรงเรียนพรตพิทยพยัต ลงวันที่ 21 กันยายน 2569 และคำสั่งโรงเรียนพรตพิทยพยัต ที่ 239/2569</p>';

    h += '<div class="card"><div class="card-head"><h2>สำหรับนักเรียน</h2></div><div class="card-body grid g2">' +
      '<img class="info-img" src="info/info-student-overview.jpg" alt="กิจกรรมเรียนซ่อมเสริมและสอบแก้ตัว สำหรับนักเรียน">' +
      '<img class="info-img" src="info/info-student-schedule.jpg" alt="ตารางไปพบครูประจำวิชา">' +
      '</div></div>';
    h += '<div class="card"><div class="card-head"><h2>วิธีเข้าดูผลการเรียนในแอป PROT Student Care</h2></div><div class="card-body">' +
      '<div class="grid g2"><img class="info-img" src="info/info-student-care.jpg" alt="วิธีเข้าดูผลการเรียน">' +
      '<div><ol class="list-reset">' +
      '<li>เปิดแอปพลิเคชัน PROT Student Care</li>' +
      '<li>กรอกชื่อผู้ใช้ (เลขประจำตัวนักเรียน) และรหัสผ่าน แล้วกด “เข้าระบบ”</li>' +
      '<li>ที่หน้าเมนูหลัก กดเมนู “ผลการเรียน”</li>' +
      '<li>เลือกชื่อนักเรียนของตนเอง และเลือกภาคเรียนเป็น 1/2569</li>' +
      '<li>ระบบจะแสดงผลการเรียนของภาคเรียนนั้น</li>' +
      '</ol><div class="small muted" style="margin-top:8px">หากยังไม่ถึงกำหนดประกาศผล ระบบจะแจ้งว่า “ยังไม่ถึงเวลาประกาศผลการเรียน” · หากรายวิชาใดยังไม่ปรากฏผลการเรียน ให้สอบถามครูประจำวิชาโดยตรง</div>' +
      '</div></div></div></div>';
    h += '<div class="card"><div class="card-head"><h2>สำหรับครู</h2></div><div class="card-body grid g2">' +
      '<img class="info-img" src="info/info-teacher-overview.jpg" alt="แจ้งครู กิจกรรมเรียนซ่อมเสริมและสอบแก้ตัว">' +
      '<img class="info-img" src="info/info-teacher-schedule.jpg" alt="ตารางปฏิบัติหน้าที่">' +
      '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>ที่มาของข้อมูลและการตรวจสอบ</h2></div><div class="card-body">' +
      '<h3 style="margin:0 0 6px; font-size:.98rem">ข้อมูลในเว็บไซต์นี้นำมาจาก</h3><ul class="list-reset">' +
      m.sources.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ul><h3 style="margin:16px 0 6px; font-size:.98rem">การตรวจสอบความถูกต้อง</h3><ul class="list-reset">' +
      m.verification.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '<li>การจัดสถานีของแต่ละรายวิชา อ้างอิงกลุ่มที่ครูผู้สอนปฏิบัติหน้าที่ตามคำสั่งที่ 239/2569 กรณีรายวิชาอยู่คนละกลุ่มกับครูผู้สอน ระบบจะแสดงหมายเหตุกำกับไว้</li>' +
      '</ul>' +
      '<div class="notice info" style="margin-top:12px"><strong>ข้อมูลชุดนี้ดึงจากระบบ Prot Care เมื่อ' + esc(m.asOf) + '</strong>' +
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
    'ข้อมูลผลการเรียนชุดนี้ดึงจากระบบ Prot Care เมื่อ' + D.meta.asOf;
  document.getElementById('footMeta').textContent =
    'ดึงข้อมูลจากระบบ ' + D.meta.asOf + ' · นักเรียนที่ต้องแก้ผลการเรียน ' + nf(D.meta.totalStudentsWithIssue) +
    ' คน · ' + nf(D.meta.totalSubjectEntries) + ' รายการวิชา';
  var ph = document.querySelector('.print-head > div');
  if (ph) ph.insertAdjacentHTML('beforeend',
    '<div class="ph-asof">ข้อมูลผลการเรียน ณ ' + D.meta.asOf + '</div>');
  bindGlobalSearch();
  route();
})();
