/* 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* 知识库文件生成器：用 Node 原生 zlib + 手写 zip 结构生成合法 .docx（无第三方依赖）
   用法：node tools/wang_gen_kb.js  → 输出到 ../../知识库文件/ */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const wang_dir = path.dirname(fileURLToPath(import.meta.url));
const wang_outDir = path.join(wang_dir, '..', '..', '知识库文件');

/* ---------- CRC32 ---------- */
const wang_crcTable = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();
function wang_crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const b of buf) c = wang_crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---------- 最小 zip 打包（deflate） ---------- */
function wang_makeZip(entries) {
    const locals = [], centrals = [];
    let offset = 0;
    for (const e of entries) {
        const name = Buffer.from(e.name, 'utf8');
        const data = Buffer.from(e.data, 'utf8');
        const comp = zlib.deflateRawSync(data);
        const crc = wang_crc32(data);
        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
        lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18);
        lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
        locals.push(lh, name, comp);
        const ch = Buffer.alloc(46);
        ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
        ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
        ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24);
        ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
        centrals.push(Buffer.concat([ch, name]));
        offset += 30 + name.length + comp.length;
    }
    const central = Buffer.concat(centrals);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, central, eocd]);
}

/* ---------- docx 组装 ---------- */
function wang_docXml(paras) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = paras.map(p => `<w:p><w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r></w:p>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
        + body + '<w:sectPr/></w:body></w:document>';
}
const wang_contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const wang_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
function wang_writeDocx(filename, paras) {
    const zip = wang_makeZip([
        { name: '[Content_Types].xml', data: wang_contentTypes },
        { name: '_rels/.rels', data: wang_rels },
        { name: 'word/document.xml', data: wang_docXml(paras) }
    ]);
    const out = path.join(wang_outDir, filename);
    fs.writeFileSync(out, zip);
    console.log('[wang_gen_kb] 已生成', out, zip.length, '字节');
}

/* ---------- 知识库文件 1：产品客服 FAQ ---------- */
fs.mkdirSync(wang_outDir, { recursive: true });

wang_writeDocx('WangAI产品客服FAQ手册.docx', [
    'WangAI 智能客服产品常见问题手册（版本 v2.3，2026 年秋季生效）',
    '一、公司与产品简介：WangAI 是东软智能科技有限公司面向电商店铺推出的智能客服 SaaS 产品，支持 7x24 小时在线问答、工单自动分派与知识库检索。定价为：基础版免费（每月 1000 次对话），专业版每月 299 元（不限对话、含知识库上传），旗舰版每月 899 元（含多店铺管理与专属客服培训）。',
    '二、客服工作时间与联系方式：人工在线客服工作时间为周一至周五 9:00 至 18:00；售后客服热线 400-0416-123；支持邮箱 support@wangai.example.cn；售后微信服务号：WangAI-Service。法定节假日人工客服休息，机器人客服正常应答。',
    '三、退换货政策：硬件产品自签收之日起 7 天内支持无理由退货，15 天内出现非人为质量问题可免费换货；软件订阅服务一经开通不支持退款，但可在到期前变更套餐档位；定制类订单不适用无理由退货。退款审核通过后 3 个工作日内原路退回，逾期未到账请提供订单号联系客服热线查询。',
    '四、会员权益：注册用户首单享 9 折优惠；年付会员享 85 折并赠送两次上门硬件清洁保养服务；每月 16 日为会员日，当日消费双倍积分，积分可在会员中心兑换延长服务期或周边礼品。',
    '五、常见问题排查：设备无法开机时请先检查电源适配器是否插紧，更换插座重试，仍无效则长按复位键 10 秒；App 无法连接设备时请确认手机与设备连接同一 2.4G WiFi 频段并开启蓝牙；回复速度变慢可在管理后台点击重启服务，若持续超过 10 分钟请提交工单并附上店铺名称与发生时段。',
    '六、投诉与升级流程：对服务结果不满意可在工单系统点击申请升级，投诉将在 24 小时内响应、3 个工作日内办结；仍不满意可发送邮件至服务监督邮箱 oversea@wangai.example.cn，由服务质量部独立复核。'
]);

/* ---------- 知识库文件 2：课程考核规范 ---------- */
wang_writeDocx('高级网页设计课程考核规范.docx', [
    '高级网页设计 I 课程考核规范（2026 年秋季学期 · 计算机与软件学院）',
    '一、成绩构成：本课程总评成绩 = 出勤 10% + 课堂参与 10% + 实验报告 30% + 全栈项目 50%。任一项缺交按 0 分计，总评低于 60 分不予通过。',
    '二、出勤规定：迟到或早退累计三次折算一次缺勤；学期缺勤累计达总学时的三分之一者取消考核资格，须重修。病假须提前在学习通提交辅导员审批单。',
    '三、实验报告要求：共六份实验报告，每份须包含运行截图、后端接口清单（路径、请求参数、响应示例）与数据库变更记录；报告须如实标注所使用的 AI 工具名称及提示词内容，未标注视为学术不诚信。',
    '四、全栈项目要求：项目须为前后端分离架构，前端仅允许原生 HTML/CSS/JavaScript，禁止第三方库与 CDN；后端使用 Node.js + Express，数据库 SQLite 或 MySQL 二选一；服务端口固定为本人学号后三位；项目须包含至少一个基于大模型 API 的功能模块（如 AI 聊天或知识库问答）。',
    '五、项目答辩：答辩安排在最后一周课堂进行，每人 8 分钟：演示 5 分钟 + 提问 3 分钟。答辩须现场展示控制台中的请求与响应数据；无法现场运行项目的按项目分减半。',
    '六、补考与缓考：因病或因事不能参加答辩须提前两周向任课教师提交书面申请，获批后可在下学期第一周补答辩；未申请缺答辩者本次项目成绩记 0 分。',
    '七、学术诚信：抄袭他人代码或整段照搬网络项目，经查实总评记 0 分并上报学院；允许在教师指定的大模型辅助范围内开发，但提交物中必须附 AI 使用说明。'
]);

console.log('[wang_gen_kb] 完成，输出目录：', wang_outDir);
