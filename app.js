import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.ALWAN_CONFIG || {};
const isConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_") &&
  !config.supabaseAnonKey.includes("YOUR_")
);
const supabase = isConfigured ? createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const demoProducts = [
  { id:"demo-01", name:"قطعة ديكور تجريبية", category:"ديكور", description:"هذا نموذج عرض مؤقت لتوضيح شكل بطاقة المنتج. أضف منتجاتك وصورها الحقيقية من لوحة الإدارة بعد ربط قاعدة البيانات.", price:null, discount:0, colors:["برتقالي","أسود","أبيض"], images:[], featured:true, active:true, demo:true },
  { id:"demo-02", name:"إكسسوار تجريبي", category:"إكسسوارات", description:"مكان مخصص لعرض وصف المنتج وتفاصيله والألوان المتاحة. استبدل هذا المحتوى بمنتجك الفعلي.", price:null, discount:0, colors:["أسود","أبيض"], images:[], featured:false, active:true, demo:true },
  { id:"demo-03", name:"قطعة مكتبية تجريبية", category:"تنظيم", description:"نموذج مؤقت لعرض منتج من ألوان ديزاين. يمكن إضافة السعر والخصم والصور من لوحة التحكم.", price:null, discount:0, colors:["رمادي","برتقالي"], images:[], featured:false, active:true, demo:true }
];

let products = [];
let selectedCategory = "all";
let editingImages = [];
let currentUser = null;
let currentAdminTab = "products";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}
function money(value) {
  if (value === null || value === undefined || value === "") return "السعر عند الطلب";
  return `${Number(value).toLocaleString("ar")} ₪`;
}
function discountedPrice(product) {
  const price = Number(product.price);
  const discount = Number(product.discount || 0);
  return Number.isFinite(price) && discount > 0 ? price * (1 - discount / 100) : price;
}
function whatsappLink(message) {
  const number = (config.whatsappNumber || "").replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);
  return number && !number.includes("XXXXXXXX") ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
function setSocialLinks() {
  const wa = whatsappLink("مرحباً ألوان ديزاين، حابب أستفسر عن منتجاتكم.");
  ["#headerWhatsApp","#contactWhatsApp"].forEach(sel => { const el=$(sel); if(el) el.href=wa; });
  const insta = config.instagramUrl || "#";
  ["#heroInstagram","#contactInstagram","#footerInstagram"].forEach(sel => { const el=$(sel); if(el) el.href=insta; });
}
function toast(message) {
  const el=$("#toast");
  el.textContent=message;
  el.classList.add("show");
  window.setTimeout(()=>el.classList.remove("show"),2800);
}
function productVisual(product, extraClass="") {
  const image = product.images?.[0];
  if (image) return `<div class="product-visual ${extraClass}"><img src="${escapeHTML(image)}" alt="${escapeHTML(product.name)}" loading="lazy"><span class="visual-corner">ALWAN / 3D</span></div>`;
  return `<div class="product-visual product-art ${extraClass}"><div class="art-orbit"></div><div class="art-cube"><i></i><b></b><em></em></div><span class="visual-corner">ALWAN / 3D</span></div>`;
}
function productPriceMarkup(product) {
  if (product.price === null || product.price === undefined || product.price === "") return `<span class="price-on-request">السعر عند الطلب</span>`;
  const price = Number(product.price);
  const discount = Number(product.discount || 0);
  if (discount > 0) return `<span class="old-price">${money(price)}</span><b class="new-price">${money(discountedPrice(product))}</b>`;
  return `<b class="new-price">${money(price)}</b>`;
}
function renderFilters() {
  const categories = [...new Set(products.map(p=>p.category).filter(Boolean))];
  const container=$("#categoryFilters");
  container.innerHTML = `<button class="filter-chip ${selectedCategory==="all"?"active":""}" data-category="all">الكل</button>` +
    categories.map(cat=>`<button class="filter-chip ${selectedCategory===cat?"active":""}" data-category="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`).join("");
  $$("[data-category]",container).forEach(button=>{
    button.addEventListener("click",()=>{
      selectedCategory=button.dataset.category;
      renderFilters(); renderProducts();
    });
  });
}
function renderProducts() {
  const query=($("#productSearch")?.value || "").trim().toLowerCase();
  const visible=products.filter(p=>{
    const matchesCategory=selectedCategory==="all" || p.category===selectedCategory;
    const matchesQuery=[p.name,p.category,p.description].join(" ").toLowerCase().includes(query);
    return p.active !== false && matchesCategory && matchesQuery;
  });
  const grid=$("#productGrid");
  $("#emptyState").hidden=visible.length>0;
  grid.innerHTML=visible.map((p,index)=>`
    <article class="product-card reveal" style="--card-index:${index}" data-product-id="${escapeHTML(p.id)}">
      <button class="product-open" data-open-product="${escapeHTML(p.id)}" aria-label="عرض ${escapeHTML(p.name)}">
        <div class="product-card-top"><span class="product-number">0${index+1} / ALWAN OBJECT</span>${Number(p.discount)>0?`<span class="discount-badge">خصم ${Number(p.discount)}%</span>`:p.featured?`<span class="featured-badge">اختيار ألوان ✳</span>`:""}</div>
        ${productVisual(p)}
        <div class="product-card-info">
          <div><span class="product-category">${escapeHTML(p.category || "منتجات ألوان")}</span><h3>${escapeHTML(p.name)}</h3></div>
          <span class="product-arrow">↗</span>
        </div>
        <div class="product-card-bottom"><div class="product-price">${productPriceMarkup(p)}</div><span>تفاصيل المنتج</span></div>
      </button>
    </article>`).join("");
  $$("[data-open-product]",grid).forEach(btn=>btn.addEventListener("click",()=>openProduct(btn.dataset.openProduct)));
  observeReveals();
}
function openProduct(id) {
  const product=products.find(p=>String(p.id)===String(id));
  if(!product) return;
  $("#modalProductCategory").textContent=`ALWAN / ${product.category || "PRODUCT"}`;
  $("#modalProductName").textContent=product.name;
  $("#modalProductDescription").textContent=product.description || "تواصل معنا لمعرفة المزيد عن تفاصيل المنتج.";
  $("#modalProductVisual").innerHTML=productVisual(product,"modal-visual");
  $("#modalProductColors").innerHTML=(product.colors||[]).length
    ? `<span>الألوان المتاحة</span><div>${product.colors.map(color=>`<i>${escapeHTML(color)}</i>`).join("")}</div>` : "";
  $("#modalProductPrice").innerHTML=productPriceMarkup(product);
  $("#modalWhatsApp").href=whatsappLink(`مرحباً ألوان ديزاين، مهتم بمنتج: ${product.name}${product.price!=null?`، السعر المعروض ${money(discountedPrice(product))}`:""}. ممكن تفاصيل أكثر؟`);
  $("#productModal").classList.add("open");
  $("#productModal").setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");
}
function closeProduct() {
  $("#productModal").classList.remove("open");
  $("#productModal").setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");
}
function observeReveals() {
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}
    });
  },{threshold:.12});
  $$(".reveal:not(.is-visible)").forEach(el=>observer.observe(el));
}
async function loadProducts() {
  if (!isConfigured) {
    products=demoProducts;
    $("#demoNote").hidden=false;
  } else {
    try {
      const {data,error}=await supabase.from("products").select("*").eq("is_active",true).order("created_at",{ascending:false});
      if(error) throw error;
      products=(data||[]).map(row=>({
        id:row.id,name:row.name,category:row.category,description:row.description,
        price:row.price,discount:row.discount_percent,colors:row.colors||[],
        images:row.image_urls||[],featured:row.is_featured,active:row.is_active
      }));
      $("#demoNote").hidden=true;
    } catch(error) {
      console.error(error);
      products=[];
      $("#demoNote").hidden=false;
      $("#demoNote").textContent="تعذّر تحميل المنتجات. تأكد من إعداد قاعدة البيانات وسياسات الوصول في Supabase.";
    }
  }
  renderFilters();
  renderProducts();
}
function showView() {
  const admin=location.hash==="#admin";
  $("#publicView").hidden=admin;
  $("#adminView").hidden=!admin;
  if(admin) initAdmin();
  else { document.body.classList.remove("admin-mode"); }
}
function setAdminMessage(message, type="") {
  const el=$("#loginMessage");
  el.textContent=message;
  el.className=`form-message ${type}`;
}
function setProductMessage(message, type="") {
  const el=$("#productMessage");
  el.textContent=message;
  el.className=`form-message ${type}`;
}
function showLogin() {
  $("#adminLoginWrap").hidden=false;
  $("#dashboardWrap").hidden=true;
  $("#setupWarning").hidden=isConfigured;
  $("#loginButton").disabled=!isConfigured;
  if(!isConfigured) setAdminMessage("أضف بيانات Supabase أولاً لتفعيل تسجيل الدخول.");
}
async function isCurrentUserAdmin(user) {
  if(!supabase || !user) return false;
  const {data,error}=await supabase.rpc("is_admin");
  if(error) { console.error(error); return false; }
  return data===true;
}
async function initAdmin() {
  document.body.classList.add("admin-mode");
  if(!isConfigured) { showLogin(); return; }
  try {
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.user) { showLogin(); return; }
    const allowed=await isCurrentUserAdmin(session.user);
    if(!allowed) {
      await supabase.auth.signOut();
      showLogin();
      setAdminMessage("هذا الحساب لا يملك صلاحية إدارة الموقع.","error");
      return;
    }
    currentUser=session.user;
    showDashboard();
  } catch(error) {
    console.error(error); showLogin();
    setAdminMessage("تعذّر التحقق من الحساب. راجع إعدادات Supabase.","error");
  }
}
async function showDashboard() {
  $("#adminLoginWrap").hidden=true;
  $("#dashboardWrap").hidden=false;
  $("#adminUserLabel").textContent=currentUser?.email || "مسؤول ألوان";
  await loadAdminProducts();
  showAdminTab("products");
}
async function loadAdminProducts() {
  const {data,error}=await supabase.from("products").select("*").order("created_at",{ascending:false});
  if(error) { toast("تعذّر تحميل المنتجات"); console.error(error); return; }
  const rows=data||[];
  $("#statTotal").textContent=rows.length;
  $("#statActive").textContent=rows.filter(p=>p.is_active).length;
  $("#statDiscount").textContent=rows.filter(p=>Number(p.discount_percent)>0).length;
  const query=($("#adminSearch").value||"").trim().toLowerCase();
  const filtered=rows.filter(p=>p.name.toLowerCase().includes(query));
  $("#adminEmpty").hidden=filtered.length>0;
  $("#adminProductRows").innerHTML=filtered.map(p=>`
    <tr>
      <td><div class="table-product">${p.image_urls?.[0]?`<img src="${escapeHTML(p.image_urls[0])}" alt="">`:`<span class="table-placeholder">A.</span>`}<div><b>${escapeHTML(p.name)}</b><small>${escapeHTML(p.description||"بدون وصف")}</small></div></div></td>
      <td>${escapeHTML(p.category||"—")}</td>
      <td>${p.price==null?"عند الطلب":money(p.price)}${Number(p.discount_percent)>0?`<small class="table-discount">خصم ${p.discount_percent}%</small>`:""}</td>
      <td><span class="status-pill ${p.is_active?"status-active":"status-hidden"}">${p.is_active?"ظاهر":"مخفي"}</span></td>
      <td><div class="table-actions"><button data-edit="${p.id}">تعديل</button><button class="delete-action" data-delete="${p.id}">حذف</button></div></td>
    </tr>`).join("");
  $$("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>editProduct(btn.dataset.edit)));
  $$("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>deleteProduct(btn.dataset.delete)));
}
function showAdminTab(tab) {
  currentAdminTab=tab;
  $$(".sidebar-link").forEach(btn=>btn.classList.toggle("active",btn.dataset.adminTab===tab));
  const editor=tab==="add";
  $("#adminProductsPanel").hidden=editor;
  $("#productEditor").hidden=!editor;
  $("#adminPageTitle").textContent=editor?"إضافة منتج جديد":"إدارة المنتجات";
  if(editor && !$("#productForm").elements.id.value) resetProductForm();
}
function resetProductForm() {
  $("#productForm").reset();
  $("#productForm").elements.id.value="";
  $("#productForm").elements.discount.value="0";
  $("#productForm").elements.active.checked=true;
  editingImages=[];
  $("#imagePreviewList").innerHTML="";
  $("#editorTitle").textContent="إضافة منتج جديد";
  setProductMessage("");
}
async function editProduct(id) {
  const {data,error}=await supabase.from("products").select("*").eq("id",id).single();
  if(error) { toast("تعذّر فتح المنتج"); return; }
  const form=$("#productForm");
  form.elements.id.value=data.id;
  form.elements.name.value=data.name||"";
  form.elements.category.value=data.category||"";
  form.elements.price.value=data.price??"";
  form.elements.discount.value=data.discount_percent??0;
  form.elements.colors.value=(data.colors||[]).join("، ");
  form.elements.description.value=data.description||"";
  form.elements.featured.checked=Boolean(data.is_featured);
  form.elements.active.checked=Boolean(data.is_active);
  editingImages=[...(data.image_urls||[])];
  $("#productImages").value="";
  $("#editorTitle").textContent="تعديل المنتج";
  renderImagePreviews();
  showAdminTab("add");
}
function renderImagePreviews() {
  $("#imagePreviewList").innerHTML=editingImages.map((url,index)=>`
    <div class="image-preview"><img src="${escapeHTML(url)}" alt="صورة المنتج"><button type="button" data-remove-image="${index}" aria-label="حذف الصورة">×</button></div>`).join("");
  $$("[data-remove-image]").forEach(btn=>btn.addEventListener("click",()=>{
    editingImages.splice(Number(btn.dataset.removeImage),1);renderImagePreviews();
  }));
}
async function uploadImages(files) {
  const urls=[];
  for(const file of files) {
    if(!file.type.startsWith("image/")) continue;
    if(file.size>8*1024*1024) throw new Error(`الصورة ${file.name} أكبر من 8MB`);
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
    const path=`${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName}`;
    const {error}=await supabase.storage.from("product-images").upload(path,file,{cacheControl:"3600",upsert:false});
    if(error) throw error;
    const {data}=supabase.storage.from("product-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
async function saveProduct(event) {
  event.preventDefault();
  const form=event.currentTarget;
  const button=$("#saveProductButton");
  button.disabled=true; setProductMessage("جاري حفظ المنتج...");
  try {
    const formData=new FormData(form);
    const newImages=await uploadImages($("#productImages").files);
    const payload={
      name:String(formData.get("name")||"").trim(),
      category:String(formData.get("category")||"").trim()||"عام",
      description:String(formData.get("description")||"").trim(),
      price:formData.get("price")?Number(formData.get("price")):null,
      discount_percent:Number(formData.get("discount")||0),
      colors:String(formData.get("colors")||"").split(/[,،]/).map(s=>s.trim()).filter(Boolean),
      image_urls:[...editingImages,...newImages],
      is_featured:form.elements.featured.checked,
      is_active:form.elements.active.checked
    };
    if(!payload.name) throw new Error("اكتب اسم المنتج.");
    if(payload.discount_percent<0 || payload.discount_percent>100) throw new Error("الخصم يجب أن يكون بين 0 و100.");
    const id=form.elements.id.value;
    const result=id
      ? await supabase.from("products").update(payload).eq("id",id)
      : await supabase.from("products").insert(payload);
    if(result.error) throw result.error;
    toast(id?"تم تحديث المنتج بنجاح":"تمت إضافة المنتج بنجاح");
    resetProductForm(); await loadAdminProducts(); await loadProducts(); showAdminTab("products");
  } catch(error) {
    console.error(error); setProductMessage(error.message||"حدث خطأ أثناء الحفظ.","error");
  } finally { button.disabled=false; }
}
async function deleteProduct(id) {
  if(!confirm("متأكد إنك بدك تحذف المنتج؟ لا يمكن التراجع عن الحذف.")) return;
  const {error}=await supabase.from("products").delete().eq("id",id);
  if(error) { toast("تعذّر حذف المنتج"); console.error(error); return; }
  toast("تم حذف المنتج"); await loadAdminProducts(); await loadProducts();
}
function wireAdmin() {
  $("#loginForm").addEventListener("submit",async event=>{
    event.preventDefault();
    if(!supabase) return;
    const button=$("#loginButton");button.disabled=true;setAdminMessage("جاري التحقق...");
    const form=new FormData(event.currentTarget);
    const {data,error}=await supabase.auth.signInWithPassword({email:form.get("email"),password:form.get("password")});
    if(error) { setAdminMessage("بيانات الدخول غير صحيحة أو تعذّر الاتصال.","error");button.disabled=false;return; }
    const allowed=await isCurrentUserAdmin(data.user);
    if(!allowed) { await supabase.auth.signOut();setAdminMessage("الحساب لا يملك صلاحية الأدمن.","error");button.disabled=false;return; }
    currentUser=data.user;await showDashboard();button.disabled=false;
  });
  $("#logoutButton").addEventListener("click",async()=>{await supabase.auth.signOut();currentUser=null;showLogin();});
  $$(".sidebar-link").forEach(btn=>btn.addEventListener("click",()=>{
    if(btn.dataset.adminTab==="add") resetProductForm();
    showAdminTab(btn.dataset.adminTab);
  }));
  $("#addProductTop").addEventListener("click",()=>{resetProductForm();showAdminTab("add");});
  $("#cancelEditor").addEventListener("click",()=>showAdminTab("products"));
  $("#cancelEditor2").addEventListener("click",()=>showAdminTab("products"));
  $("#productForm").addEventListener("submit",saveProduct);
  $("#productImages").addEventListener("change",()=>{
    const files=[...$("#productImages").files];
    const temporary=files.map(file=>URL.createObjectURL(file));
    const preview=temporary.map((url)=>`<div class="image-preview"><img src="${url}" alt="معاينة صورة جديدة"><span class="new-image-tag">جديد</span></div>`).join("");
    $("#imagePreviewList").innerHTML=editingImages.map(url=>`<div class="image-preview"><img src="${escapeHTML(url)}" alt="صورة المنتج"></div>`).join("")+preview;
  });
  $("#adminSearch").addEventListener("input",loadAdminProducts);
}
let adminWired=false;
function initAdminOnce() { if(!adminWired){wireAdmin();adminWired=true;} }
initAdminOnce();

function initMotion() {
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas=$("#particles");
  const ctx=canvas.getContext("2d");
  let width=0,height=0,points=[],mouse={x:-1000,y:-1000},raf=0;
  function resize() {
    const ratio=Math.min(window.devicePixelRatio||1,2);
    width=window.innerWidth;height=window.innerHeight;
    canvas.width=width*ratio;canvas.height=height*ratio;
    canvas.style.width=width+"px";canvas.style.height=height+"px";
    ctx.setTransform(ratio,0,0,ratio,0,0);
    points=Array.from({length:Math.min(45,Math.max(18,Math.floor(width/34)))},()=>({
      x:Math.random()*width,y:Math.random()*height,r:1+Math.random()*2.4,
      speed:.12+Math.random()*.34,phase:Math.random()*6.28,alpha:.15+Math.random()*.28
    }));
  }
  function draw() {
    ctx.clearRect(0,0,width,height);
    for(const p of points) {
      p.y-=p.speed;p.x+=Math.sin(p.phase+performance.now()*.00035)*.12;
      if(p.y<-8){p.y=height+8;p.x=Math.random()*width;}
      const dx=p.x-mouse.x,dy=p.y-mouse.y,distance=Math.hypot(dx,dy);
      let x=p.x,y=p.y;
      if(distance<115&&distance>0){x+=dx/distance*(115-distance)*.2;y+=dy/distance*(115-distance)*.2;}
      ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,128,58,${p.alpha})`;ctx.fill();
    }
    raf=requestAnimationFrame(draw);
  }
  resize();window.addEventListener("resize",resize);
  window.addEventListener("pointermove",event=>{
    mouse.x=event.clientX;mouse.y=event.clientY;
    const glow=$("#cursorGlow");
    glow.style.left=event.clientX+"px";glow.style.top=event.clientY+"px";
  },{passive:true});
  if(!reduced) draw();
  const stage=$("#heroStage"),object=$("#heroObject");
  stage?.addEventListener("pointermove",event=>{
    if(window.innerWidth<760||reduced)return;
    const rect=stage.getBoundingClientRect();
    const x=(event.clientX-rect.left)/rect.width-.5;
    const y=(event.clientY-rect.top)/rect.height-.5;
    object.style.transform=`rotateX(${-y*12}deg) rotateY(${x*17}deg) rotateZ(-7deg)`;
  });
  stage?.addEventListener("pointerleave",()=>object.style.transform="");
  window.addEventListener("scroll",()=>{
    const max=document.documentElement.scrollHeight-window.innerHeight;
    $("#scrollProgress").style.width=(max>0?window.scrollY/max*100:0)+"%";
    $("#siteHeader").classList.toggle("scrolled",window.scrollY>25);
  },{passive:true});
  $("#menuToggle").addEventListener("click",()=>$("#siteHeader").classList.toggle("menu-open"));
  $$(".main-nav a").forEach(link=>link.addEventListener("click",()=>$("#siteHeader").classList.remove("menu-open")));
  observeReveals();
}
function initPublic() {
  setSocialLinks();
  $("#year").textContent=new Date().getFullYear();
  $("#productSearch").addEventListener("input",renderProducts);
  $$("[data-close-product]").forEach(el=>el.addEventListener("click",closeProduct));
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeProduct();});
  initMotion();
  loadProducts();
}
window.addEventListener("hashchange",showView);
initPublic();
showView();
