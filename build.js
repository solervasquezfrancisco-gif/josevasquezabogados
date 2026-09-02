const fs = require('fs');
const path = require('path');
function parseScalar(v){
  v=v.trim();
  if(v==='true') return true;
  if(v==='false') return false;
  if(v==='null'||v==='') return '';
  if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) return v.slice(1,-1).replace(/\\"/g,'"');
  return v;
}
function parseFrontmatter(raw){
  if(!raw.startsWith('---')) return {data:{},content:raw};
  const end=raw.indexOf('\n---',3);
  if(end<0) return {data:{},content:raw};
  const head=raw.slice(4,end).trim();
  const content=raw.slice(end+4).replace(/^\s+/,'');
  const data={};
  for(const line of head.split(/\r?\n/)){
    const m=line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if(m) data[m[1]]=parseScalar(m[2]);
  }
  return {data,content};
}
function inlineMd(s){
  s=esc(s);
  s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+|\.\.?\/[^\s)]+)\)/g,'<a href="$2">$1</a>');
  s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  s=s.replace(/\*([^*]+)\*/g,'<em>$1</em>');
  return s;
}
function renderMarkdown(src){
  const lines=src.replace(/\r/g,'').split('\n'); let out=[], para=[], list=null;
  const flushPara=()=>{if(para.length){out.push('<p>'+inlineMd(para.join(' '))+'</p>');para=[];}};
  const flushList=()=>{if(list){out.push(`<${list.type}>${list.items.map(x=>`<li>${inlineMd(x)}</li>`).join('')}</${list.type}>`);list=null;}};
  for(const line of lines){
    if(/^###\s+/.test(line)){flushPara();flushList();out.push('<h3>'+inlineMd(line.replace(/^###\s+/,''))+'</h3>');continue;}
    if(/^##\s+/.test(line)){flushPara();flushList();out.push('<h2>'+inlineMd(line.replace(/^##\s+/,''))+'</h2>');continue;}
    if(/^#\s+/.test(line)){flushPara();flushList();out.push('<h2>'+inlineMd(line.replace(/^#\s+/,''))+'</h2>');continue;}
    let m=line.match(/^[-*]\s+(.+)/); if(m){flushPara();if(!list||list.type!=='ul'){flushList();list={type:'ul',items:[]};}list.items.push(m[1]);continue;}
    m=line.match(/^\d+\.\s+(.+)/); if(m){flushPara();if(!list||list.type!=='ol'){flushList();list={type:'ol',items:[]};}list.items.push(m[1]);continue;}
    if(!line.trim()){flushPara();flushList();continue;}
    para.push(line.trim());
  }
  flushPara();flushList(); return out.join('\n');
}
const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content', 'blog');
const SITE = 'https://josevasquezabogados.onrender.com';

function esc(s=''){return String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
function slugify(s=''){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function copyRecursive(src,dst){
  if(!fs.existsSync(src)) return;
  const st=fs.statSync(src);
  if(st.isDirectory()){
    fs.mkdirSync(dst,{recursive:true});
    for(const name of fs.readdirSync(src)) copyRecursive(path.join(src,name),path.join(dst,name));
  } else {fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst);}
}
function fmtDate(v){
  if(!v) return '';
  const d = new Date(v);
  if(Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(d);
}

if(fs.existsSync(OUT)) fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(OUT,{recursive:true});

// Copia la web visual aprobada tal cual, excepto el blog, que se regenera.
for(const name of fs.readdirSync(ROOT)){
  if(['dist','node_modules','content','blog','.git'].includes(name)) continue;
  if(['build.js','package.json','package-lock.json','.pages.yml','render.yaml','README-CMS.md'].includes(name)) continue;
  copyRecursive(path.join(ROOT,name), path.join(OUT,name));
}

const posts=[];
for(const filename of fs.readdirSync(CONTENT).filter(f=>f.endsWith('.md'))){
  const raw=fs.readFileSync(path.join(CONTENT,filename),'utf8');
  const parsed=parseFrontmatter(raw);
  const data=parsed.data||{};
  if(data.published === false) continue;
  const slug=path.basename(filename,'.md');
  posts.push({...data, slug, html:renderMarkdown(parsed.content), source:parsed.content});
}
posts.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));

const header = (prefix='../../') => `<header class="site-header scrolled"><div class="container nav-wrap"><a class="brand brand-image" href="${prefix}" aria-label="José & Vásquez Abogados - Inicio"><img src="${prefix}assets/logo-jv-header.png" alt="José & Vásquez Abogados" /></a><button class="menu-toggle" aria-label="Abrir menú" aria-expanded="false">☰</button><nav class="main-nav" aria-label="Navegación principal"><a href="${prefix}#estudio">El estudio</a><a href="${prefix}nosotros/">Nosotros</a><a href="${prefix}#areas">Áreas de práctica</a><a href="${prefix}blog/">Blog</a><a href="${prefix}#contacto" class="nav-cta">Contacto</a></nav></div></header>`;
const footer = (prefix='../../') => `<footer class="footer"><div class="container footer-grid"><div class="footer-logo"><img src="${prefix}assets/logo-jv-footer.png" alt="José & Vásquez Abogados"></div><p>© <span id="year"></span> Todos los derechos reservados.</p><div class="footer-links"><a href="${prefix}blog/">Blog</a><a href="${prefix}#contacto">Contacto</a></div></div></footer><a class="whatsapp-float" href="https://wa.me/542615599687?text=Hola%2C%20quisiera%20realizar%20una%20consulta%20jur%C3%ADdica" target="_blank" rel="noopener" aria-label="Consultar por WhatsApp">W</a>`;
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">`;

for(const p of posts){
  const dir=path.join(OUT,'blog',p.slug); fs.mkdirSync(dir,{recursive:true});
  const title=p.seo_title||`${p.title} | José & Vásquez Abogados`;
  const desc=p.seo_description||p.excerpt||'';
  const image=p.image ? `<meta property="og:image" content="${esc(p.image.startsWith('http')?p.image:SITE+p.image)}">` : '';
  const article=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${SITE}/blog/${esc(p.slug)}/"><meta property="og:type" content="article"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(desc)}">${image}${fonts}<link rel="stylesheet" href="../../assets/styles.css"></head><body>${header('../../')}<main class="article-page"><section class="article-hero"><div class="container"><div class="breadcrumbs"><a href="../../">Inicio</a> · <a href="../">Blog</a> · ${esc(p.category||'Actualidad jurídica')}</div><div class="article-meta">${esc(p.category||'Actualidad jurídica')} · ${esc(p.author||'José & Vásquez Abogados')} · ${esc(fmtDate(p.date))}</div><h1>${esc(p.title)}</h1><p class="article-deck">${esc(p.excerpt||'')}</p></div></section><article class="article-body"><div class="container">${p.image?`<img class="article-cover" src="${esc(p.image)}" alt="${esc(p.title)}">`:''}<p class="legal-note">La información publicada es general y no reemplaza el análisis profesional de un caso concreto.</p>${p.html}<div class="article-cta"><h2>¿Necesitás analizar una situación concreta?</h2><p>Podés enviarnos una descripción breve del caso para coordinar una consulta.</p><a class="btn btn-primary" href="../../#contacto">Solicitar consulta</a></div></div></article></main>${footer('../../')}<script src="../../assets/main.js"></script></body></html>`;
  fs.writeFileSync(path.join(dir,'index.html'),article);
}

const cards=posts.map(p=>`<article class="article-card">${p.image?`<img class="blog-card-image" src="${esc(p.image)}" alt="${esc(p.title)}">`:''}<span class="coming">${esc(p.category||'Actualidad jurídica')}</span><h2>${esc(p.title)}</h2><p>${esc(p.excerpt||'')}</p><a href="${esc(p.slug)}/">Leer artículo →</a></article>`).join('');
const blogIndex=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Blog jurídico de José & Vásquez Abogados: guías y análisis sobre derecho civil, laboral, previsional, empresarial y amparos en Mendoza."><meta name="robots" content="index,follow"><link rel="canonical" href="${SITE}/blog/"><title>Blog jurídico | José & Vásquez Abogados</title>${fonts}<link rel="stylesheet" href="../assets/styles.css"></head><body>${header('../')}<main class="blog-page"><section class="blog-hero"><div class="container"><span class="eyebrow">Actualidad jurídica</span><h1>Derecho explicado con claridad.</h1><p>Guías prácticas y análisis pensados para responder preguntas frecuentes y ayudar a comprender qué aspectos conviene revisar antes de tomar una decisión jurídica.</p></div></section><section class="articles"><div class="container articles-grid">${cards}</div></section></main>${footer('../')}<script src="../assets/main.js"></script></body></html>`;
fs.mkdirSync(path.join(OUT,'blog'),{recursive:true});
fs.writeFileSync(path.join(OUT,'blog','index.html'),blogIndex);

// Actualiza automáticamente las 3 últimas entradas de la home, sin alterar el resto del diseño.
const homePath=path.join(OUT,'index.html');
if(fs.existsSync(homePath)){
  let home=fs.readFileSync(homePath,'utf8');
  const latest=posts.slice(0,3).map((p,i)=>`<article class="post-card reveal${i?` delay-${i}`:''}"><span class="post-category">${esc(p.category||'Actualidad jurídica')}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt||'')}</p><a href="blog/${esc(p.slug)}/">Leer artículo →</a></article>`).join('');
  home=home.replace(/<div class="blog-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>\s*\n\s*<section class="contact"/, `<div class="blog-grid">${latest}</div></div></section>\n\n    <section class="contact"`);
  // Render no procesa Netlify Forms; usar FormSubmit para mantener el formulario operativo.
  home=home.replace(/<form class="contact-form reveal delay-1" name="consulta" method="POST" data-netlify="true" netlify-honeypot="bot-field">[\s\S]*?<input type="hidden" name="form-name" value="consulta" \/>/, `<form class="contact-form reveal delay-1" action="https://formsubmit.co/abogadosjosevasquez@gmail.com" method="POST"><input type="hidden" name="_subject" value="Nueva consulta desde josevasquezabogados.onrender.com"><input type="hidden" name="_captcha" value="false"><input type="hidden" name="_template" value="table">`);
  home=home.replace(/<p class="hidden"><label>No completar: <input name="bot-field" \/><\/label><\/p>/,'');
  fs.writeFileSync(homePath,home);
}

// Sitemap regenerado con páginas estáticas + blog actual.
const urls=[];
function collectHtml(dir, rel=''){
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name), r=path.join(rel,name);
    if(fs.statSync(p).isDirectory()) collectHtml(p,r);
    else if(name==='index.html'){
      let url='/' + rel.replace(/\\/g,'/').replace(/\/index\.html$/,'').replace(/^\//,'');
      if(url==='/index.html'||url==='/') url='/'; else if(!url.endsWith('/')) url+='/';
      if(!url.includes('/node_modules/')) urls.push(url);
    }
  }
}
collectHtml(OUT,'');
const unique=[...new Set(urls)].sort();
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique.map(u=>`  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(OUT,'sitemap.xml'),sitemap);
fs.writeFileSync(path.join(OUT,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Sitio generado: ${posts.length} artículos, ${unique.length} URLs.`);
