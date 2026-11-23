/* 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-23 | 大模型：GLM-5.3-Flash */
/* 商业评论情感分类前端逻辑：
   1. 上传 .xlsx → FileReader 转 base64 → POST http://localhost:416/api/review/classify
   2. 发送给后端/大模型的数据与返回的数据均打印浏览器控制台
   3. 原生 Canvas 绘制饼状图（好评/中评/差评）+ 分类统计条
   4. 每类精选 2 条评论（按内容长度取最能代表的一条组）展示
   所有变量与函数名以 wyh_ 开头 */

const wyh_apiUrl = 'http://localhost:416/api/review/classify';

/* 分类元信息：颜色 / 绘图 */
const wyh_kinds = [
    { key: '好评', color: '#34D399' },
    { key: '中评', color: '#FBBF24' },
    { key: '差评', color: '#F87171' }
];

let wyh_file = null;      // 当前选择的文件
let wyh_busy = false;     // 防重复提交

/* ---------- 文件选择 ---------- */
const wyh_fileInput = document.getElementById('wyhFile');
const wyh_drop = document.getElementById('wyhDrop');
const wyh_goBtn = document.getElementById('wyhGo');
const wyh_status = document.getElementById('wyhStatus');

wyh_drop.addEventListener('click', () => wyh_fileInput.click());
wyh_drop.addEventListener('dragover', e => { e.preventDefault(); wyh_drop.style.borderColor = '#60A5FA'; });
wyh_drop.addEventListener('dragleave', () => { wyh_drop.style.borderColor = ''; });
wyh_drop.addEventListener('drop', e => {
    e.preventDefault();
    wyh_drop.style.borderColor = '';
    if (e.dataTransfer.files.length) wyh_pick(e.dataTransfer.files[0]);
});
wyh_fileInput.addEventListener('change', () => {
    if (wyh_fileInput.files.length) wyh_pick(wyh_fileInput.files[0]);
});

function wyh_pick(wyh_f) {
    if (!/\.xlsx$/i.test(wyh_f.name)) {
        wyh_status.textContent = '仅支持 .xlsx 文件';
        return;
    }
    wyh_file = wyh_f;
    document.getElementById('wyhFileName').textContent = wyh_f.name + '（' + (wyh_f.size / 1024).toFixed(1) + ' KB）';
    wyh_goBtn.disabled = false;
    wyh_status.textContent = '文件已就绪，点击“开始情感分类”。';
}

/* ---------- 提交分类 ---------- */
wyh_goBtn.addEventListener('click', wyh_classify);

function wyh_classify() {
    if (!wyh_file || wyh_busy) return;
    wyh_busy = true;
    wyh_goBtn.disabled = true;
    wyh_status.textContent = '正在读取文件并转换为 base64…';

    const wyh_reader = new FileReader();
    wyh_reader.onload = function () {
        /* dataURL 形如 data:application/vnd...;base64,XXXX，去掉前缀 */
        const wyh_base64 = String(wyh_reader.result).split(',')[1];
        const wyh_payload = { wang_filename: wyh_file.name, wang_base64: wyh_base64 };

        console.log(`[wyh_review] → 发送给后端/大模型的请求：POST ${wyh_apiUrl}`);
        console.log('[wyh_review] → 请求体（wang_base64 共 ' + wyh_base64.length + ' 字符，前 60 字符：' + wyh_base64.slice(0, 60) + '…）：');
        console.log('[wyh_review] → 文件名：', wyh_payload.wang_filename);
        console.log('[wyh_review] → 完整响应解析前请看下一条日志');

        wyh_status.textContent = '已发送给大模型，正在逐条分类（服务端控制台同步打印完整收发数据）…';

        fetch(wyh_apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wyh_payload)
        })
            .then(wyh_res => wyh_res.json())
            .then(wyh_data => {
                console.log('[wyh_review] ← 后端返回的完整数据：', wyh_data);
                if (wyh_data.code !== 0) {
                    wyh_status.textContent = '分类失败：' + wyh_data.msg;
                    console.error('[wyh_review] 接口返回失败：', wyh_data);
                    return;
                }
                const wyh_results = wyh_data.data.wang_results || [];
                console.log(`[wyh_review] ← 分类结果共 ${wyh_results.length} 条：`, wyh_results);
                wyh_status.textContent = `分类完成：共 ${wyh_results.length} 条评论（${new Date().toLocaleTimeString()}）`;
                wyh_render(wyh_results);
            })
            .catch(wyh_err => {
                console.error('[wyh_review] 请求异常：', wyh_err);
                wyh_status.textContent = '请求失败：' + wyh_err.message + '（请确认已启动本地大模型分类服务，端口 416）';
            })
            .finally(() => { wyh_busy = false; wyh_goBtn.disabled = !wyh_file; });
    };
    wyh_reader.readAsDataURL(wyh_file);
}

/* ---------- 渲染统计 + 饼图 + 精选评论 ---------- */
function wyh_render(wyh_results) {
    /* 按分类分组 */
    const wyh_groups = {};
    wyh_kinds.forEach(k => { wyh_groups[k.key] = []; });
    wyh_results.forEach(r => {
        if (wyh_groups[r.wang_sentiment]) wyh_groups[r.wang_sentiment].push(r.wang_review);
    });
    const wyh_total = wyh_results.length || 1;

    /* 统计条 */
    document.getElementById('wyhStats').innerHTML = wyh_kinds.map(k => {
        const wyh_cnt = wyh_groups[k.key].length;
        const wyh_pct = (wyh_cnt / wyh_total * 100).toFixed(1);
        return `<div class="wyh_statItem">
            <span class="wyh_dot" style="background:${k.color}"></span>
            <span class="wyh_name">${k.key}</span>
            <span class="wyh_bar"><i style="width:${wyh_pct}%;background:${k.color}"></i></span>
            <span class="wyh_num"><b>${wyh_cnt}</b> 条 · ${wyh_pct}%</span>
        </div>`;
    }).join('');

    /* 饼状图（原生 Canvas） */
    wyh_drawPie(wyh_kinds.map(k => ({ name: k.key, color: k.color, value: wyh_groups[k.key].length })), wyh_total);

    /* 精选评论：每类取内容最长的 2 条（信息量最足） */
    document.getElementById('wyhFeat').innerHTML = wyh_kinds.map(k => {
        const wyh_top = wyh_groups[k.key].slice().sort((a, b) => b.length - a.length).slice(0, 2);
        return `<div class="wyh_featCol">
            <h3><span class="wyh_tag" style="background:${k.color}">${k.key}</span>精选评论（${wyh_top.length}）</h3>
            ${wyh_top.map(wyh_c => `<div class="wyh_comment">${wyh_c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`).join('') || '<div class="wyh_comment">本组暂无数据</div>'}
        </div>`;
    }).join('');

    document.getElementById('wyhChartBox').classList.remove('wyh_hide');
    document.getElementById('wyhFeatBox').classList.remove('wyh_hide');
}

/* ---------- 原生 Canvas 饼状图 ---------- */
function wyh_drawPie(wyh_parts, wyh_total) {
    const wyh_cv = document.getElementById('wyhPie');
    const wyh_ctx = wyh_cv.getContext('2d');
    const wyh_w = wyh_cv.width, wyh_h = wyh_cv.height;
    const wyh_cx = wyh_w / 2, wyh_cy = wyh_h / 2 - 14;
    const wyh_r = 118;
    wyh_ctx.clearRect(0, 0, wyh_w, wyh_h);

    /* 高分屏清晰度 */
    const wyh_dpr = window.devicePixelRatio || 1;
    if (wyh_dpr !== 1) {
        wyh_cv.width = wyh_w * wyh_dpr; wyh_cv.height = wyh_h * wyh_dpr;
        wyh_cv.style.width = wyh_w + 'px'; wyh_cv.style.height = wyh_h + 'px';
        wyh_ctx.scale(wyh_dpr, wyh_dpr);
    }

    /* 扇区（从 -90° 顺时针） */
    let wyh_angle = -Math.PI / 2;
    const wyh_nonEmpty = wyh_parts.filter(p => p.value > 0);
    if (!wyh_nonEmpty.length) {
        wyh_ctx.fillStyle = '#94A3B8';
        wyh_ctx.font = '14px sans-serif';
        wyh_ctx.fillText('无数据', wyh_cx - 22, wyh_cy);
        return;
    }
    wyh_nonEmpty.forEach(p => {
        const wyh_sweep = p.value / wyh_total * Math.PI * 2;
        wyh_ctx.beginPath();
        wyh_ctx.moveTo(wyh_cx, wyh_cy);
        wyh_ctx.arc(wyh_cx, wyh_cy, wyh_r, wyh_angle, wyh_angle + wyh_sweep);
        wyh_ctx.closePath();
        wyh_ctx.fillStyle = p.color;
        wyh_ctx.fill();
        wyh_ctx.strokeStyle = '#0B0B10';
        wyh_ctx.lineWidth = 2;
        wyh_ctx.stroke();

        /* 扇区上的百分比标签 */
        const wyh_mid = wyh_angle + wyh_sweep / 2;
        if (wyh_sweep > 0.28) {
            const wyh_lx = wyh_cx + Math.cos(wyh_mid) * (wyh_r * 0.62);
            const wyh_ly = wyh_cy + Math.sin(wyh_mid) * (wyh_r * 0.62);
            wyh_ctx.fillStyle = '#0B0B10';
            wyh_ctx.font = 'bold 13px sans-serif';
            wyh_ctx.textAlign = 'center';
            wyh_ctx.fillText((p.value / wyh_total * 100).toFixed(1) + '%', wyh_lx, wyh_ly + 4);
        }
        wyh_angle += wyh_sweep;
    });

    /* 中心圆洞（环形效果）+ 总数 */
    wyh_ctx.globalCompositeOperation = 'destination-out';
    wyh_ctx.beginPath();
    wyh_ctx.arc(wyh_cx, wyh_cy, 52, 0, Math.PI * 2);
    wyh_ctx.fill();
    wyh_ctx.globalCompositeOperation = 'source-over';
    wyh_ctx.fillStyle = '#F8FAFC';
    wyh_ctx.textAlign = 'center';
    wyh_ctx.font = 'bold 22px sans-serif';
    wyh_ctx.fillText(String(wyh_total), wyh_cx, wyh_cy - 2);
    wyh_ctx.fillStyle = '#94A3B8';
    wyh_ctx.font = '12px sans-serif';
    wyh_ctx.fillText('评论总数', wyh_cx, wyh_cy + 18);

    /* 图例 */
    const wyh_legendY = wyh_h - 42;
    let wyh_lx = wyh_cx - wyh_nonEmpty.length * 58;
    wyh_nonEmpty.forEach(p => {
        wyh_ctx.fillStyle = p.color;
        wyh_ctx.fillRect(wyh_lx, wyh_legendY, 12, 12);
        wyh_ctx.fillStyle = '#C7D7F5';
        wyh_ctx.textAlign = 'left';
        wyh_ctx.font = '13px sans-serif';
        wyh_ctx.fillText(p.name + ' ' + p.value, wyh_lx + 18, wyh_legendY + 11);
        wyh_lx += 108;
    });
}
