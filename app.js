const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], money=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD'}), uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();
const STORAGE_KEY='pfms-alpha-01';
const seed={appVersion:PFMSCore.APP_VERSION,schemaVersion:PFMSCore.SCHEMA_VERSION,org:{name:'VFW Post 2924',number:'2924',department:'California',credit:'Michael Croy II & Atlas'},funds:[
{name:'National / Department Dues',type:'Per Capita',restricted:true,audit:true,active:true},{name:'General Fund',type:'General',restricted:false,audit:true,active:true},{name:'Relief Fund',type:'Relief',restricted:true,audit:true,active:true},{name:'Dues Reserve Fund',type:'Dues Reserve',restricted:true,audit:true,active:true},{name:'Post Home / Building Fund',type:'Building',restricted:true,audit:true,active:true},{name:'Canteen / Club Fund',type:'Canteen',restricted:false,audit:true,active:true},{name:'Kitchen Fund',type:'Kitchen',restricted:false,audit:true,active:true},{name:'MOST Fund',type:'Program',restricted:true,audit:true,active:true},{name:'Bartender Fund',type:'Program',restricted:true,audit:true,active:true},{name:'Lotto Fund',type:'Program',restricted:true,audit:true,active:true}],accounts:[{name:'General Checking',type:'Checking',balance:0},{name:'Savings Account',type:'Savings',balance:0},{name:'Petty Cash',type:'Cash',balance:0}],ledger:[],utilities:[],stipends:[],approvals:[],reimbursements:[],sales:[],settings:{chart:'bar',dashboardStart:'',dashboardEnd:'',salesStart:'',salesEnd:''},auditOpeningBalances:{},auditOpeningBalanceBaselines:[],auditDraft:{},monthlyDraft:{monthlyProfile:'meeting'},reportSettings:{defaultProfile:'meeting',vendorAliases:[]},importRules:[],categories:[{id:'cat-canteen',name:'Canteen',active:true,subcategories:['Beer','Liquor','Wine','Soft Drinks','Snacks','Cleaning Supplies']},{id:'cat-kitchen',name:'Kitchen',active:true,subcategories:['Meat','Produce','Dairy','Paper Goods']},{id:'cat-building',name:'Building',active:true,subcategories:['Electrical','HVAC','Repairs','Maintenance']},{id:'cat-admin',name:'Administration',active:true,subcategories:['Office Supplies','Postage','Software','Bank Fees']},{id:'cat-programs',name:'Programs',active:true,subcategories:['Veterans Assistance','Community Service','Youth Programs']}],vendors:[],budgets:[],budgetSettings:{yellow:75,red:100},themes:{selected:'Light',custom:[]},demo:{active:false,loadedAt:''},auth:{enabled:false,username:'admin',passwordHash:'',rememberMe:false}};
let db=load(), current='dashboard';
function load(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return saved?PFMSCore.migrateDatabase(saved,seed,migrateV26).database:structuredClone(seed)}catch(error){console.error('PFMS data load failed',error);return structuredClone(seed)}}
function persist(){db.appVersion=PFMSCore.APP_VERSION;db.schemaVersion=PFMSCore.SCHEMA_VERSION;localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}
function save(){persist();toast('Saved')}
function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1600)}
const pages=[['dashboard','Dashboard'],['ledger','Ledger'],['import','CSV Import'],['funds','Funds & Accounts'],['utilities','Utilities'],['stipends','Stipends'],['approvals','Meeting Approvals'],['reimbursements','Reimbursements'],['sales','Sales & Daily Value'],['audit','Quarterly Audit'],['monthly','Monthly Reports'],['settings','Settings']];
function init(){ $('#nav').innerHTML=pages.map(([id,n])=>`<button class="navbtn" data-page="${id}">${n}</button>`).join(''); $$('.navbtn').forEach(b=>b.onclick=()=>go(b.dataset.page)); $('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open'); $('#restoreInput').onchange=restoreBackup; go('dashboard'); if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
function go(p){current=p; $$('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page===p)); const n=pages.find(x=>x[0]===p)[1]; $('#pageTitle').textContent=n; $('#view').innerHTML=render[p](); bind[p]?.(); $('.sidebar').classList.remove('open')}
function postLedger(x){const originalDescription=x.originalDescription||x.description||'',friendlyDescription=x.friendlyDescription||PFMSCore.normalizeVendor({...x,description:originalDescription},db.reportSettings?.vendorAliases)||originalDescription;const transaction={id:x.id||uid(),date:x.date||new Date().toISOString().slice(0,10),type:x.type||'Expense',description:friendlyDescription,originalDescription,friendlyDescription,payee:x.payee||'',vendor:x.vendor||'',utility:x.utility||'',fund:x.fund||db.funds[0]?.name,account:x.account||db.accounts[0]?.name,category:x.category||'',subcategory:x.subcategory||'',amount:Number(x.amount||0),check:x.check||'',status:x.status||'Posted',notes:x.notes||'',source:x.source||'Manual',sourceRecord:x.sourceRecord||null,importFingerprint:x.importFingerprint||'',created:new Date().toISOString(),transfer:x.transfer||null,allocations:Array.isArray(x.allocations)?x.allocations:[]};db.ledger.push(transaction);save();return transaction}
function inRange(date,start,end){return (!start||date>=start)&&(!end||date<=end)}
function filteredLedger(start,end){return db.ledger.filter(x=>inRange(x.date,start,end))}
function filteredSales(start,end){return db.sales.filter(x=>inRange(x.date,start,end))}
function totals(rows=db.ledger){let r=0,e=0;rows.forEach(x=>x.type==='Income'?r+=Number(x.amount||0):x.type==='Expense'?e+=Number(x.amount||0):0);return{r,e,net:r-e}}
function fundBalance(name,rows=db.ledger){return PFMSCore.expandFinancialActivity(rows).reduce((a,x)=>a+(x.fund===name?(x.type==='Income'?Number(x.amount||0):x.type==='Expense'?-Number(x.amount||0):0):0),0)}
const render={
dashboard(){const start=db.settings.dashboardStart||'',end=db.settings.dashboardEnd||'',rows=filteredLedger(start,end),t=totals(rows);return `<div class="card"><div class="toolbar"><h2 style="margin-right:auto">Dashboard Date Range</h2><label>Start <input type="date" id="dashStart" value="${start}"></label><label>End <input type="date" id="dashEnd" value="${end}"></label><button class="ghost" id="clearDashRange">Clear</button></div><p class="muted">All dashboard totals, charts, and recent activity below use this range.</p></div><div class="grid grid-4" style="margin-top:16px"><div class="card metric"><div class="label">Total Receipts</div><div class="value">${money(t.r)}</div><div class="hint">Selected date range</div></div><div class="card metric"><div class="label">Total Expenditures</div><div class="value">${money(t.e)}</div><div class="hint">Selected date range</div></div><div class="card metric"><div class="label">Net Position</div><div class="value">${money(t.net)}</div><div class="hint">Receipts less expenditures</div></div><div class="card metric"><div class="label">Items Waiting Payment</div><div class="value">${db.approvals.filter(x=>x.status!=='Paid').length+db.reimbursements.filter(x=>x.status!=='Paid').length+db.stipends.filter(x=>x.status!=='Paid').length}</div><div class="hint">Approvals, reimbursements, stipends</div></div></div><div class="grid grid-2" style="margin-top:16px"><div class="card"><div class="toolbar"><h2 style="margin-right:auto">Fund Activity</h2><select id="chartType"><option value="bar">Bar</option><option value="pie">Pie</option></select></div><canvas id="fundChart" class="chart"></canvas></div><div class="card"><h2>Action Center</h2>${queueSummary()}</div></div><div class="card" style="margin-top:16px"><h2>Recent Ledger Activity</h2>${ledgerTable(rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8),false)}</div>`},
ledger(){return `<div class="toolbar"><button class="primary" id="addTxn">Add Transaction</button><button class="success" id="addTransfer">Transfer Between Categories</button><button class="ghost" id="exportLedger">Raw Ledger CSV</button><button class="ghost" id="exportAccountant">Accountant CSV</button><input id="ledgerSearch" placeholder="Search ledger…"></div><div class="card"><div class="notice"><strong>Category transfer:</strong> moves money from one PFMS fund category to another without changing the total money in the bank account.</div><div class="tablewrap" id="ledgerTable">${ledgerTable(db.ledger,true)}</div></div>`},
import(){return `<div class="grid grid-2"><div class="card"><h2>CSV Import Center</h2><p class="muted">Upload bank, POS, or general transaction CSV files. PFMS detects likely duplicates using date, amount, and description.</p><div class="field"><label>Import Type</label><select id="importType"><option>Bank</option><option>POS Sales</option><option>General Ledger</option></select></div><div class="field" style="margin-top:12px"><label>CSV File</label><input id="csvFile" type="file" accept=".csv,text/csv"></div><button class="primary" id="parseCsv" style="margin-top:12px">Preview CSV</button></div><div class="card"><h2>Import Rules</h2><div class="notice">Rows are not posted until you review and confirm them.</div><ul><li>Dated rows align chronologically in the ledger.</li><li>Duplicate matches are flagged and skipped unless overridden.</li><li>POS Sales files feed Sales & Daily Value analytics.</li><li>All imports remain editable after posting.</li></ul></div></div><div id="csvPreview" style="margin-top:16px"></div>`},
funds(){return `<div class="grid funds-layout"><div class="card"><h2>User-Defined Funds</h2><button class="primary small" id="addFund">Add Fund</button><div class="tablewrap" style="margin-top:12px"><table class="funds-table"><colgroup><col class="fund-name"><col class="fund-type"><col class="fund-flag"><col class="fund-flag"><col class="fund-action"></colgroup><thead><tr><th>Name</th><th>Type</th><th>Audit</th><th>Restricted</th><th>Actions</th></tr></thead><tbody>${db.funds.map((f,i)=>`<tr><td><input data-fi="${i}" data-k="name" value="${esc(f.name)}"></td><td><input data-fi="${i}" data-k="type" value="${esc(f.type)}"></td><td class="center"><input type="checkbox" data-fi="${i}" data-k="audit" ${f.audit?'checked':''}></td><td class="center"><input type="checkbox" data-fi="${i}" data-k="restricted" ${f.restricted?'checked':''}></td><td class="center"><button class="danger small delFund" data-i="${i}">Remove</button></td></tr>`).join('')}</tbody></table></div></div><div class="card"><h2>Financial Accounts</h2><p class="muted">Accounts identify where money is held; funds identify its purpose.</p><button class="primary small" id="addAccount">Add Account</button><div class="tablewrap" style="margin-top:12px"><table class="accounts-table"><colgroup><col class="acct-name"><col class="acct-type"><col class="acct-action"></colgroup><thead><tr><th>Name</th><th>Type</th><th>Actions</th></tr></thead><tbody>${db.accounts.map((a,i)=>`<tr><td><input data-ai="${i}" data-k="name" value="${esc(a.name)}"></td><td><select data-ai="${i}" data-k="type">${['Checking','Savings','Cash','Investment','Credit Card','Loan'].map(x=>`<option ${x===a.type?'selected':''}>${x}</option>`).join('')}</select></td><td class="center"><button class="danger small delAcct" data-i="${i}">Remove</button></td></tr>`).join('')}</tbody></table></div></div></div>`},
utilities(){return queuePage('Utilities','utility','utilities',['vendor','amount','fund','account','dueDay'],'Create recurring utility profiles, then post the current bill to the ledger with one click.')},
stipends(){return queuePage('Stipends','stipend','stipends',['payee','amount','fund','account','frequency','notes'],'Enter the check number and mark paid to post automatically to the ledger.')},
approvals(){return queuePage('Meeting Approvals','approval','approvals',['description','payee','motionBy','secondedBy','amount','fund','account','meetingDate','notes'],'Approved items remain here until paid. Motion, second, payee, and meeting details are copied into ledger notes.')},
reimbursements(){return queuePage('Reimbursements','reimbursement','reimbursements',['payee','description','motionBy','secondedBy','amount','fund','account','meetingDate','notes'],'Requests remain open until a check number is entered and payment is posted.')},
sales(){const start=db.settings.salesStart||'',end=db.settings.salesEnd||'',rows=filteredSales(start,end);return `<div class="card"><div class="toolbar"><h2 style="margin-right:auto">Sales Date Range</h2><label>Start <input type="date" id="salesStart" value="${start}"></label><label>End <input type="date" id="salesEnd" value="${end}"></label><button class="ghost" id="clearSalesRange">Clear</button></div></div><div class="grid grid-3" style="margin-top:16px"><div class="card metric"><div class="label">Sales Rows</div><div class="value">${rows.length}</div></div><div class="card metric"><div class="label">Top Item / Seller</div><div class="value" style="font-size:18px">${topItem(rows)}</div></div><div class="card metric"><div class="label">Best Day</div><div class="value" style="font-size:18px">${bestDay(rows)}</div></div></div><div class="grid grid-2" style="margin-top:16px"><div class="card"><h2>Daily Value</h2><div class="tabs">${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>`<button class="tab daytab" data-day="${d}">${d}</button>`).join('')}</div><div id="dailyValue">Choose a day to compare Canteen and Kitchen averages.</div></div><div class="card"><h2>Most-Sold Items</h2>${salesItemTable(rows)}</div></div>`},
audit(){return `<div class="card"><h2>Quarterly Trustee Audit Generator</h2><p class="muted">PFMS calculates the fund section from ledger data and collects every required response for Sections 16, 17, and 18 of the VFW Trustees’ Report of Audit.</p>
<div class="audit-form-section"><h3>Audit Period & Organization</h3><div class="formgrid">
<div class="field"><label>Quarter</label><select id="auditQ"><option value="1">Jan 1–Mar 31</option><option value="2">Apr 1–Jun 30</option><option value="3">Jul 1–Sep 30</option><option value="4">Oct 1–Dec 31</option></select></div>
<div class="field"><label>Year</label><input id="auditYear" type="number" value="${esc(db.auditDraft?.auditYear||2026)}"></div>
<div class="field"><label>Post Number</label><input id="auditPost" value="${esc(db.auditDraft?.auditPost||db.org.number)}"></div>
<div class="field"><label>Quartermaster Name</label><input id="qmName" value="${esc(db.auditDraft?.qmName||'')}"></div>
<div class="field span2"><label>Quartermaster Address</label><input id="qmAddress" value="${esc(db.auditDraft?.qmAddress||'')}"></div>
</div></div>
<div class="audit-form-section"><h3>16. Operations</h3><div class="formgrid audit-operations">
<div class="field"><label>Have required payroll deductions been made?</label><input id="opPayroll" value="${esc(db.auditDraft?.opPayroll||'')}" placeholder="Type answer"></div>
<div class="field"><label>Have payments been made to the proper State and Federal agencies this quarter?</label><input id="opAgencies" value="${esc(db.auditDraft?.opAgencies||'')}" placeholder="Type answer"></div>
<div class="field"><label>Have sales taxes been collected and paid?</label><input id="opSalesTax" value="${esc(db.auditDraft?.opSalesTax||'')}" placeholder="Type answer"></div>
<div class="field"><label>Are club employees bonded?</label><input id="opEmployeesBonded" value="${esc(db.auditDraft?.opEmployeesBonded||'')}" placeholder="Type answer"></div>
<div class="field"><label>Amount of outstanding bills</label><input id="opBills" value="${esc(db.auditDraft?.opBills||'')}" type="number" step=".01"></div>
<div class="field"><label>Value of Real Estate</label><input id="opRealEstate" value="${esc(db.auditDraft?.opRealEstate||'')}" type="number" step=".01"></div>
<div class="field"><label>Amount of liability insurance</label><input id="opLiabilityInsurance" value="${esc(db.auditDraft?.opLiabilityInsurance||'')}" type="number" step=".01"></div>
<div class="field"><label>Owed on Mortgages and Loans</label><input id="opMortgages" value="${esc(db.auditDraft?.opMortgages||'')}" type="number" step=".01"></div>
<div class="field"><label>Value of Personal Property</label><input id="opPersonalProperty" value="${esc(db.auditDraft?.opPersonalProperty||'')}" type="number" step=".01"></div>
<div class="field"><label>Amount of Property Insurance</label><input id="opPropertyInsurance" value="${esc(db.auditDraft?.opPropertyInsurance||'')}" type="number" step=".01"></div>
</div></div>
<div class="audit-form-section"><h3>17. Reconciliation of Cash & Investments</h3><div class="formgrid">
<div class="field"><label>General Checking Statement Balance</label><input id="bankBal" value="${esc(db.auditDraft?.bankBal||'')}" type="number" step=".01"></div>
<div class="field"><label>Less: Outstanding Checks</label><input id="outChecks" value="${esc(db.auditDraft?.outChecks||'')}" type="number" step=".01"></div>
<div class="field"><label>Plus: Deposits in Transit</label><input id="depTransit" value="${esc(db.auditDraft?.depTransit||'')}" type="number" step=".01"></div>
<div class="field"><label>Savings Account Balance</label><input id="savBal" value="${esc(db.auditDraft?.savBal||'')}" type="number" step=".01"></div>
<div class="field"><label>Cash on Hand / Petty Cash</label><input id="cashHand" value="${esc(db.auditDraft?.cashHand||'')}" type="number" step=".01"></div>
<div class="field"><label>Bonds & Investments</label><input id="invest" value="${esc(db.auditDraft?.invest||'')}" type="number" step=".01"></div>
</div></div>
<div class="audit-form-section"><h3>18. Trustees’ and Commander’s Certificate of Audit</h3><div class="formgrid">
<div class="field"><label>Audit Certification Date</label><input id="certDate" value="${esc(db.auditDraft?.certDate||'')}" type="date"></div>
<div class="field"><label>Trustee 1 Name</label><input id="trustee1" value="${esc(db.auditDraft?.trustee1||'')}"></div>
<div class="field"><label>Trustee 2 Name</label><input id="trustee2" value="${esc(db.auditDraft?.trustee2||'')}"></div>
<div class="field"><label>Trustee 3 Name</label><input id="trustee3" value="${esc(db.auditDraft?.trustee3||'')}"></div>
<div class="field"><label>Commander Name</label><input id="commanderName" value="${esc(db.auditDraft?.commanderName||'')}"></div>
<div class="field"><label>Bonded With</label><input id="bondCompany" value="${esc(db.auditDraft?.bondCompany||'')}"></div>
<div class="field"><label>Bond Amount</label><input id="bondAmount" value="${esc(db.auditDraft?.bondAmount||'')}" type="number" step=".01"></div>
<div class="field"><label>Bond Expiration Month</label><input id="bondMonth" value="${esc(db.auditDraft?.bondMonth||'')}" placeholder="Month"></div>
<div class="field"><label>Bond Expiration Year</label><input id="bondYear" value="${esc(db.auditDraft?.bondYear||'')}" type="number" placeholder="Year"></div>
</div></div>
<div class="card" style="margin-top:16px"><h3>Optional Beginning Balance Baseline</h3><p class="muted">Use this only when starting PFMS mid-quarter or without earlier ledger history. It applies at the start of the selected quarter; later monthly reports automatically carry forward the previous month's ending balance.</p><div class="formgrid">${db.funds.filter(f=>f.audit&&f.active!==false).map((f,i)=>field(f.name,`opening_${i}`,'number','')).join('')}</div><button class="ghost" id="clearAuditOpening" type="button">Clear Saved Baseline for This Quarter</button></div><button class="primary" id="generateAudit" style="margin-top:14px">Generate Audit</button></div><div id="auditOutput" style="margin-top:16px"></div>`},
monthly(){const now=new Date(),month=String(now.getMonth()+1).padStart(2,'0'),year=now.getFullYear(),d=db.monthlyDraft||{},profile=d.monthlyProfile||db.reportSettings?.defaultProfile||'meeting';return `<div class="card"><h2>Quartermaster’s Monthly Report</h2><p class="muted">Uses the VFW-recommended Detail of Receipts and Disbursements format with a Statement of Funds. Choose the copy needed for the meeting or audit file.</p><div class="formgrid"><div class="field"><label>Month</label><input type="month" id="monthlyPeriod" value="${esc(d.monthlyPeriod||`${year}-${month}`)}"></div><div class="field"><label>Report Profile</label><select id="monthlyProfile"><option value="meeting" ${profile==='meeting'?'selected':''}>Meeting Copy — Smart Grouped</option><option value="audit" ${profile==='audit'?'selected':''}>Audit Copy — Transaction Detail</option></select></div>${field('Meeting Date','monthlyMeeting','date',d.monthlyMeeting||'')}${field('Quartermaster Name','monthlyQm','text',d.monthlyQm||'')}${field('Trustee 1','monthlyT1','text',d.monthlyT1||'')}${field('Trustee 2','monthlyT2','text',d.monthlyT2||'')}${field('Trustee 3','monthlyT3','text',d.monthlyT3||'')}${field('Commander Name','monthlyCommander','text',d.monthlyCommander||'')}</div><div id="profileDescription" class="notice report-profile-notice"></div><button class="primary" id="generateMonthly" style="margin-top:14px">Generate Monthly Report</button></div><div id="monthlyOutput" style="margin-top:16px"></div>`},
settings(){const aliases=db.reportSettings?.vendorAliases||[];return `<div class="grid grid-2"><div class="card"><h2>Organization</h2><div class="field"><label>Organization Name</label><input id="orgName" value="${esc(db.org.name)}"></div><div class="field"><label>Post Number</label><input id="orgNum" value="${esc(db.org.number)}"></div><div class="field"><label>Department</label><input id="orgDept" value="${esc(db.org.department)}"></div><div class="field"><label>Default Monthly Report Profile</label><select id="defaultReportProfile"><option value="meeting" ${(db.reportSettings?.defaultProfile||'meeting')==='meeting'?'selected':''}>Meeting Copy</option><option value="audit" ${db.reportSettings?.defaultProfile==='audit'?'selected':''}>Audit Copy</option></select></div><button class="primary" id="saveSettings" style="margin-top:12px">Save Settings</button></div><div class="card"><h2>Data Portability</h2><p>Alpha 0.2 stores data in this browser. To move data between Mac, Windows PC, and tablet, export a versioned JSON backup and restore it on the other device.</p><div class="notice warning"><strong>Cloud synchronization and multi-user access are not active in Alpha 0.2.</strong> They remain planned for a later hosted build.</div><button class="ghost" onclick="exportBackup()">Export JSON Backup</button><button class="danger" id="resetDb">Reset Alpha Data</button></div></div><div class="card" style="margin-top:16px"><div class="toolbar"><div style="margin-right:auto"><h2 style="margin-bottom:4px">Vendor Intelligence</h2><p class="muted" style="margin:0">Teach PFMS that different bank descriptions belong to the same vendor. Match text may be a name fragment or pattern.</p></div><button class="primary small" id="addVendorAlias">Add Vendor Alias</button></div><div class="tablewrap"><table class="vendor-alias-table"><thead><tr><th>Bank Description Contains</th><th>Show on Reports As</th><th>Action</th></tr></thead><tbody>${aliases.map((alias,i)=>`<tr><td><input data-alias-i="${i}" data-alias-k="match" value="${esc(alias.match)}" placeholder="Example: AMZN|AMAZON"></td><td><input data-alias-i="${i}" data-alias-k="name" value="${esc(alias.name)}" placeholder="Example: Amazon"></td><td class="center"><button class="danger small delVendorAlias" data-i="${i}">Remove</button></td></tr>`).join('')||'<tr><td colspan="3" class="muted">Built-in normalization is active. Add an alias only when a vendor still appears under different names.</td></tr>'}</tbody></table></div></div>`}
};
function queueSummary(){const rows=[['Meeting Approvals',db.approvals],['Reimbursements',db.reimbursements],['Stipends',db.stipends],['Utilities',db.utilities]];return rows.map(([n,a])=>`<p><strong>${n}</strong><span class="badge orange" style="float:right">${a.filter(x=>x.status!=='Paid').length} open</span></p>`).join('')}
function ledgerTable(rows,actions){return `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Fund / Category</th><th>Account</th><th>Amount</th><th>Check</th><th>Status</th>${actions?'<th></th>':''}</tr></thead><tbody>${rows.map(x=>{const split=Array.isArray(x.allocations)&&x.allocations.length>1,isTransfer=x.type==='Transfer'&&x.transfer?.from&&x.transfer?.to,fund=isTransfer?`${esc(x.transfer.from.fund)} → ${esc(x.transfer.to.fund)}`:split?`<span class="badge">Split: ${x.allocations.length} funds</span>`:esc(x.fund),account=isTransfer?esc(x.transfer.from.account||x.account):split?esc([...new Set(x.allocations.map(a=>a.account))].join(', ')):esc(x.account);return `<tr><td>${x.date}</td><td>${isTransfer?'<span class="badge orange">Transfer</span>':x.type}</td><td><strong>${esc(x.friendlyDescription||x.description||'Category transfer')}</strong>${x.originalDescription&&x.originalDescription!==(x.friendlyDescription||x.description)?`<div class="muted" title="${esc(x.originalDescription)}">Original bank text retained</div>`:''}</td><td>${fund}</td><td>${account}</td><td>${money(x.amount)}</td><td>${esc(x.check)}</td><td><span class="badge ${x.status==='Posted'?'green':''}">${x.status}</span></td>${actions?`<td><button class="ghost small editTxn" data-id="${x.id}">Edit</button> <button class="danger small delTxn" data-id="${x.id}">Delete</button></td>`:''}</tr>`}).join('')||'<tr><td colspan="9" class="muted">No transactions yet.</td></tr>'}</tbody></table></div>`}
function queuePage(title,singular,key,fields,help){const rows=db[key].map((x,i)=>({x,i})).filter(({x})=>x.status!=='Paid');return `<div class="toolbar"><button class="primary" id="addQueue">Add ${singular}</button></div><div class="notice">${help} Paid items are recorded in the ledger and removed from this pending list.</div><div class="card"><div class="tablewrap"><table><thead><tr>${fields.map(f=>`<th>${pretty(f)}</th>`).join('')}<th>Status</th><th>Check #</th><th></th></tr></thead><tbody>${rows.map(({x,i})=>`<tr>${fields.map(f=>`<td>${esc(x[f]??'')}</td>`).join('')}<td><span class="badge orange">${x.status||'Open'}</span></td><td><input class="qcheck" data-i="${i}" value="${esc(x.check||'')}" style="width:90px"></td><td><button class="success small payQueue" data-i="${i}">Mark Paid</button> <button class="ghost small editQueue" data-i="${i}">Edit</button> <button class="danger small delQueue" data-i="${i}">Delete</button></td></tr>`).join('')||`<tr><td colspan="${fields.length+3}" class="muted">No pending ${title.toLowerCase()}.</td></tr>`}</tbody></table></div></div>`}
function pretty(s){return s.replace(/([A-Z])/g,' $1').replace(/^./,m=>m.toUpperCase())}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
const bind={
dashboard(){const s=$('#chartType');s.value=db.settings.chart;s.onchange=()=>{db.settings.chart=s.value;save();drawFundChart()};$('#dashStart').onchange=e=>{db.settings.dashboardStart=e.target.value;save();go('dashboard')};$('#dashEnd').onchange=e=>{db.settings.dashboardEnd=e.target.value;save();go('dashboard')};$('#clearDashRange').onclick=()=>{db.settings.dashboardStart='';db.settings.dashboardEnd='';save();go('dashboard')};drawFundChart()},
ledger(){ $('#addTxn').onclick=()=>txnModal(); $('#addTransfer').onclick=()=>transferModal(); $('#exportLedger').onclick=exportLedger; $('#exportAccountant').onclick=exportAccountantLedger; $('#ledgerSearch').oninput=e=>{$('#ledgerTable').innerHTML=ledgerTable(db.ledger.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())),true);bindLedgerButtons()};bindLedgerButtons()},
import(){ $('#parseCsv').onclick=parseCsvFile},
funds(){ $$('[data-fi]').forEach(el=>el.onchange=()=>{const i=+el.dataset.fi;db.funds[i][el.dataset.k]=el.type==='checkbox'?el.checked:el.value;save()});$$('[data-ai]').forEach(el=>el.onchange=()=>{db.accounts[+el.dataset.ai][el.dataset.k]=el.value;save()});$('#addFund').onclick=()=>{db.funds.push({name:'New Fund',type:'Other',restricted:false,audit:true,active:true});save();go('funds')};$('#addAccount').onclick=()=>{db.accounts.push({name:'New Account',type:'Checking'});save();go('funds')};$$('.delFund').forEach(b=>b.onclick=()=>{db.funds.splice(+b.dataset.i,1);save();go('funds')});$$('.delAcct').forEach(b=>b.onclick=()=>{db.accounts.splice(+b.dataset.i,1);save();go('funds')})},
utilities(){bindQueue('utilities','Utility',['vendor','amount','fund','account','dueDay'])},stipends(){bindQueue('stipends','Stipend',['payee','amount','fund','account','frequency','notes'])},approvals(){bindQueue('approvals','Meeting Approval',['description','payee','motionBy','secondedBy','amount','fund','account','meetingDate','notes'])},reimbursements(){bindQueue('reimbursements','Reimbursement',['payee','description','motionBy','secondedBy','amount','fund','account','meetingDate','notes'])},
sales(){ $$('.daytab').forEach(b=>b.onclick=()=>showDay(b.dataset.day));$('#salesStart').onchange=e=>{db.settings.salesStart=e.target.value;save();go('sales')};$('#salesEnd').onchange=e=>{db.settings.salesEnd=e.target.value;save();go('sales')};$('#clearSalesRange').onclick=()=>{db.settings.salesStart='';db.settings.salesEnd='';save();go('sales')}},
audit(){ const ids=['auditQ','auditYear','auditPost','qmName','qmAddress','opPayroll','opAgencies','opSalesTax','opEmployeesBonded','opBills','opRealEstate','opLiabilityInsurance','opMortgages','opPersonalProperty','opPropertyInsurance','bankBal','outChecks','depTransit','savBal','cashHand','invest','certDate','trustee1','trustee2','trustee3','commanderName','bondCompany','bondAmount','bondMonth','bondYear']; if(db.auditDraft?.auditQ) $('#auditQ').value=db.auditDraft.auditQ; ids.forEach(id=>{const el=$('#'+id);if(el)el.oninput=el.onchange=()=>{db.auditDraft[id]=el.value;persist();if(id==='auditQ'||id==='auditYear')loadAuditOpeningInputs()}});loadAuditOpeningInputs();$('#clearAuditOpening').onclick=clearAuditOpeningBaseline;$('#generateAudit').onclick=generateAudit},
monthly(){ const profileDescription=()=>{const profile=PFMSCore.reportProfile($('#monthlyProfile').value);$('#profileDescription').innerHTML=`<strong>${esc(profile.label)}:</strong> ${esc(profile.description)}`};['monthlyPeriod','monthlyProfile','monthlyMeeting','monthlyQm','monthlyT1','monthlyT2','monthlyT3','monthlyCommander'].forEach(id=>{const el=$('#'+id);if(el)el.oninput=el.onchange=()=>{db.monthlyDraft[id]=el.value;persist();if(id==='monthlyProfile')profileDescription()}});profileDescription();$('#generateMonthly').onclick=generateMonthlyReport},
settings(){ db.reportSettings=db.reportSettings||{defaultProfile:'meeting',vendorAliases:[]};$('#saveSettings').onclick=()=>{db.org.name=$('#orgName').value;db.org.number=$('#orgNum').value;db.org.department=$('#orgDept').value;db.reportSettings.defaultProfile=$('#defaultReportProfile').value;save()};$$('[data-alias-i]').forEach(el=>el.onchange=()=>{db.reportSettings.vendorAliases[+el.dataset.aliasI][el.dataset.aliasK]=el.value.trim();save()});$('#addVendorAlias').onclick=()=>{db.reportSettings.vendorAliases.push({match:'',name:''});save();go('settings')};$$('.delVendorAlias').forEach(button=>button.onclick=()=>{db.reportSettings.vendorAliases.splice(+button.dataset.i,1);save();go('settings')});$('#resetDb').onclick=()=>{if(confirm('Erase all Alpha 0.2 data in this browser?')){db=structuredClone(seed);save();go('dashboard')}}}
};
function bindLedgerButtons(){ $$('.delTxn').forEach(b=>b.onclick=()=>{if(confirm('Delete this ledger item?')){db.ledger=db.ledger.filter(x=>x.id!==b.dataset.id);save();go('ledger')}});$$('.editTxn').forEach(b=>b.onclick=()=>{const x=db.ledger.find(x=>x.id===b.dataset.id);x?.type==='Transfer'?transferModal(x):txnModal(x)})}
function txnModal(x={}){
 const initial=Array.isArray(x.allocations)&&x.allocations.length?x.allocations.map(a=>({...a})):[{fund:x.fund||db.funds[0]?.name||'',account:x.account||db.accounts[0]?.name||'',category:x.category||'',subcategory:x.subcategory||'',amount:Number(x.amount||0)}];let splits=initial;
 modal(`<h2>${x.id?'Edit':'Add'} Transaction</h2><div class="formgrid">${field('Date','date','date',x.date||new Date().toISOString().slice(0,10))}${selectField('Type','type',['Income','Expense'],x.type)}${field('Amount','amount','number',x.amount)}${field('Friendly Description','friendlyDescription','text',x.friendlyDescription||x.description,'span2')}${field('Original Description','originalDescription','text',x.originalDescription||x.description,'span3')}${field('Payee / Source','payee','text',x.payee)}${field('Vendor','vendor','text',x.vendor)}${field('Utility','utility','text',x.utility)}${field('Check Number','check','text',x.check)}${selectField('Status','status',['Needs Review','Reviewed','Posted','Reconciled','Void'],x.status||'Posted')}${field('Notes','notes','text',x.notes,'span3')}</div><div class="split-editor"><div class="toolbar"><div><h3>Fund Allocations</h3><p class="muted">Use one line for a normal transaction, or add lines to divide this payment or deposit.</p></div><button type="button" class="ghost small" id="addSplit">Add Split Line</button></div><div id="splitRows"></div><div id="splitStatus" class="notice"></div></div><div class="toolbar" style="margin-top:16px"><button class="primary" id="saveModal">Save</button><button class="ghost" onclick="closeModal()">Cancel</button></div>`);
 const renderSplits=()=>{const total=Number($('[name=amount]').value||0),allocated=roundMoney(splits.reduce((s,a)=>s+Number(a.amount||0),0)),remaining=roundMoney(total-allocated);$('#splitRows').innerHTML=splits.map((a,i)=>`<div class="split-row"><select data-split-i="${i}" data-split-k="fund">${importSelectOptions(db.funds,a.fund)}</select><select data-split-i="${i}" data-split-k="account">${importSelectOptions(db.accounts,a.account)}</select><select data-split-i="${i}" data-split-k="category"><option></option>${(db.categories||[]).map(c=>`<option ${c.name===a.category?'selected':''}>${esc(c.name)}</option>`).join('')}</select><select data-split-i="${i}" data-split-k="subcategory"><option></option>${((db.categories||[]).find(c=>c.name===a.category)?.subcategories||[]).map(s=>`<option ${s===a.subcategory?'selected':''}>${esc(s)}</option>`).join('')}</select><input type="number" step=".01" min="0" data-split-i="${i}" data-split-k="amount" value="${Number(a.amount||0)}" aria-label="Allocation amount"><button type="button" class="danger small delSplit" data-i="${i}" ${splits.length===1?'disabled':''}>Remove</button></div>`).join('');const status=$('#splitStatus');status.classList.toggle('warning',Math.abs(remaining)>=.01);status.innerHTML=`Transaction total: <strong>${money(total)}</strong> • Allocated: <strong>${money(allocated)}</strong> • ${Math.abs(remaining)<.01?'<strong>Balanced</strong>':`Remaining: <strong>${money(remaining)}</strong>`}`;$$('[data-split-i]').forEach(el=>el.onchange=()=>{const a=splits[+el.dataset.splitI];a[el.dataset.splitK]=el.type==='number'?Number(el.value):el.value;if(el.dataset.splitK==='category')a.subcategory='';renderSplits()});$$('.delSplit').forEach(b=>b.onclick=()=>{splits.splice(+b.dataset.i,1);renderSplits()})};
 $('#addSplit').onclick=()=>{splits.push({fund:db.funds[0]?.name||'',account:splits[0]?.account||db.accounts[0]?.name||'',category:'',subcategory:'',amount:0});renderSplits()};$('[name=amount]').oninput=renderSplits;renderSplits();
 $('#saveModal').onclick=()=>{const v=formVals(),clean=splits.filter(a=>Number(a.amount)>0).map(a=>({...a,amount:roundMoney(a.amount)})),allocated=roundMoney(clean.reduce((s,a)=>s+a.amount,0));if(Number(v.amount)<=0)return alert('Enter a transaction amount greater than zero.');if(!clean.length||Math.abs(allocated-Number(v.amount))>=.01)return alert(`Fund allocations must equal the transaction total. ${money(allocated)} is allocated of ${money(v.amount)}.`);v.allocations=clean.length>1?clean:[];v.fund=clean[0].fund;v.account=clean[0].account;v.category=clean[0].category;v.subcategory=clean[0].subcategory||'';if(x.id){Object.assign(x,v);save()}else postLedger(v);closeModal();go('ledger')}
}
function transferModal(x={}){
 const old=x.transfer||{},from=old.from||{},to=old.to||{},defaultAccount=from.account||to.account||x.account||db.accounts[0]?.name||'';
 modal(`<h2>${x.id?'Edit':'New'} Category Transfer</h2><div class="notice"><strong>One simple transfer:</strong> choose where the money is coming from and where it is going. PFMS records both sides and keeps the bank total unchanged.</div><div class="formgrid">${field('Date','date','date',x.date||new Date().toISOString().slice(0,10))}${field('Amount','amount','number',x.amount||'')}${selectField('Financial Account','account',db.accounts.map(a=>a.name),defaultAccount)}${selectField('From Category','fromFund',db.funds.filter(f=>f.active!==false).map(f=>f.name),from.fund||x.fund)}${selectField('To Category','toFund',db.funds.filter(f=>f.active!==false).map(f=>f.name),to.fund)}${field('Description','description','text',x.description||'Category transfer')}${field('Approval / Reference','check','text',x.check||'')}${selectField('Status','status',['Posted','Reconciled','Void'],x.status||'Posted')}${field('Notes','notes','text',x.notes||'','span3')}</div><div class="toolbar" style="margin-top:16px"><button class="primary" id="saveTransfer">Save Transfer</button><button class="ghost" onclick="closeModal()">Cancel</button></div>`);
 const button=$('#saveTransfer');
 button.onclick=()=>{const v=formVals(),amount=roundMoney(v.amount);if(button.disabled)return;if(amount<=0)return alert('Enter a transfer amount greater than zero.');if(!v.fromFund||!v.toFund)return alert('Choose both the From Category and To Category.');if(v.fromFund===v.toFund)return alert('The From Category and To Category must be different.');button.disabled=true;const transaction={id:x.id||uid(),date:v.date,type:'Transfer',amount,description:v.description||'Category transfer',payee:'',fund:v.fromFund,account:v.account,category:'Category Transfer',subcategory:'',check:v.check||'',status:v.status||'Posted',notes:v.notes||'',source:'Category Transfer',created:x.created||new Date().toISOString(),allocations:[],transfer:{from:{fund:v.fromFund,account:v.account,category:'Category Transfer',subcategory:''},to:{fund:v.toFund,account:v.account,category:'Category Transfer',subcategory:''}}};if(x.id)Object.assign(x,transaction);else db.ledger.push(transaction);save();closeModal();go('ledger')};
}
function field(label,name,type='text',value='',cls=''){return `<div class="field ${cls}"><label>${label}</label><input name="${name}" type="${type}" step=".01" value="${esc(value)}"></div>`}
function selectField(label,name,opts,val=''){return `<div class="field"><label>${label}</label><select name="${name}">${opts.map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`}
function formVals(){const o={};$$('.modalbox [name]').forEach(e=>o[e.name]=e.type==='number'?Number(e.value):e.value);return o}
function modal(html){document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="modal"><div class="modalbox">${html}</div></div>`)}function closeModal(){$('#modal')?.remove()}window.closeModal=closeModal;
function bindQueue(key,label,fields){$('#addQueue').onclick=()=>queueModal(key,label,fields);$$('.delQueue').forEach(b=>b.onclick=()=>{db[key].splice(+b.dataset.i,1);save();go(current)});$$('.editQueue').forEach(b=>b.onclick=()=>queueModal(key,label,fields,+b.dataset.i));$$('.payQueue').forEach(b=>b.onclick=()=>{const i=+b.dataset.i,x=db[key][i];if(!x||x.status==='Paid')return;const check=$(`.qcheck[data-i="${i}"]`)?.value.trim();if(!check)return alert('Enter the check number first.');b.disabled=true;x.id=x.id||uid();const prior=db.ledger.find(t=>t.id===x.ledgerTransactionId||(t.sourceRecord?.queue===key&&t.sourceRecord?.id===x.id));if(prior){x.check=check;x.status='Paid';x.paidDate=x.paidDate||prior.date;x.ledgerTransactionId=prior.id;save();go(current);return}const transactionId=uid(),paidDate=new Date().toISOString().slice(0,10);x.check=check;x.status='Paid';x.paidDate=paidDate;x.ledgerTransactionId=transactionId;postLedger({id:transactionId,date:paidDate,type:'Expense',amount:x.amount,description:x.description||x.vendor||`${label}: ${x.payee||''}`,payee:x.payee||x.vendor||'',fund:x.fund,account:x.account,check,notes:[`${label}${x.meetingDate?' approved '+x.meetingDate:''}. Automatically posted when marked paid.`,x.motionBy?`Motion by ${x.motionBy}`:'',x.secondedBy?`Seconded by ${x.secondedBy}`:'',x.notes||''].filter(Boolean).join(' • '),source:label,sourceRecord:{queue:key,id:x.id}});go(current)});}
function queueModal(key,label,fields,i=null){const x=i===null?{}:db[key][i];modal(`<h2>${i===null?'Add':'Edit'} ${label}</h2><div class="formgrid">${fields.map(f=>f==='fund'?selectField('Fund','fund',db.funds.map(x=>x.name),x[f]):f==='account'?selectField('Account','account',db.accounts.map(x=>x.name),x[f]):field(pretty(f),f,f==='amount'?'number':f.toLowerCase().includes('date')?'date':'text',x[f])).join('')}${field('Notes','notes','text',x.notes,'span3')}</div><div class="toolbar" style="margin-top:16px"><button class="primary" id="saveModal">Save</button><button class="ghost" onclick="closeModal()">Cancel</button></div>`);$('#saveModal').onclick=()=>{const v={...formVals(),id:x.id||uid(),status:x.status||'Open',check:x.check||'',paidDate:x.paidDate||'',ledgerTransactionId:x.ledgerTransactionId||''};if(i===null)db[key].push(v);else db[key][i]=v;save();closeModal();go(current)}}
function exportLedger(){const cols=[['Date','date'],['Type','type'],['Original Description','originalDescription'],['Friendly Description','friendlyDescription'],['Payee','payee'],['Vendor','vendor'],['Utility','utility'],['Fund','fund'],['Account','account'],['Category','category'],['Subcategory','subcategory'],['Amount','amount'],['Check','check'],['Status','status'],['Notes','notes'],['Source','source'],['Import Fingerprint','importFingerprint'],['Transfer From','transferFrom'],['Transfer To','transferTo'],['Transaction ID','transactionId'],['Allocation','allocation']];const rows=db.ledger.flatMap(x=>x.type==='Transfer'?[{...x,transferFrom:x.transfer?.from?.fund||'',transferTo:x.transfer?.to?.fund||'',transactionId:x.id,allocation:'Transfer'}]:PFMSCore.transactionAllocations(x).map((a,i,all)=>({...x,...a,transferFrom:'',transferTo:'',transactionId:x.id,allocation:all.length>1?`${i+1} of ${all.length}`:'Single'})));const csv=[cols.map(c=>c[0]).join(','),...rows.map(x=>cols.map(c=>csvCell(x[c[1]]??'')).join(','))].join('\n');download('PFMS_Ledger.csv',csv,'text/csv')}

function exportAccountantLedger(){
 const cols=[['Date','date'],['Type','type'],['Friendly Description','friendlyDescription'],['Vendor / Utility','party'],['Fund','fund'],['Account','account'],['Category','category'],['Subcategory','subcategory'],['Receipt','receipt'],['Disbursement','disbursement'],['Check Number','check'],['Status','status'],['Notes','notes']];
 const rows=db.ledger.flatMap(x=>PFMSCore.transactionAllocations(x).map(a=>{const friendly=x.friendlyDescription||PFMSCore.normalizeVendor(x,db.reportSettings?.vendorAliases)||x.description||'';return {...x,...a,friendlyDescription:friendly,party:x.utility||x.vendor||x.payee||friendly,receipt:x.type==='Income'?Number(a.amount||x.amount||0):'',disbursement:x.type==='Expense'?Number(a.amount||x.amount||0):''}}));
 const csv=[cols.map(c=>c[0]).join(','),...rows.map(x=>cols.map(c=>csvCell(x[c[1]]??'')).join(','))].join('\n');download('PFMS_Accountant_Ledger.csv',csv,'text/csv')
}
function importFingerprint(row){return [row.date,row.type,Number(row.amount||0).toFixed(2),String(row.account||'').trim().toUpperCase(),String(row.check||'').trim().toUpperCase(),PFMSCore.canonicalText(row.originalDescription||row.description||'')].join('|')}
function duplicateLedgerRow(row){const fp=row.importFingerprint||importFingerprint(row);return db.ledger.some(x=>(x.importFingerprint||importFingerprint(x))===fp)}

function csvCell(v){return `"${String(v??'').replaceAll('"','""')}"`}
function parseCsvFile(){
 const f=$('#csvFile').files[0];if(!f)return alert('Choose a CSV file.');
 const type=$('#importType').value, sourceName=f.name;
 const r=new FileReader();r.onload=()=>previewCsv(parseCSV(r.result),type,sourceName);r.readAsText(f);
}
function parseCSV(text){
 text=String(text||'').replace(/^\uFEFF/,'');
 const rows=[];let row=[],cell='',q=false;
 for(let i=0;i<text.length;i++){
  const c=text[i],n=text[i+1];
  if(c==='"'&&q&&n==='"'){cell+='"';i++}
  else if(c==='"')q=!q;
  else if(c===','&&!q){row.push(cell);cell=''}
  else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);row=[];cell=''}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row)}
 return rows;
}
function detectCsvProfile(rows,type,sourceName){
 const first=(rows[0]||[]).map(x=>String(x).trim().toLowerCase());
 const filename=String(sourceName||'').toLowerCase();
 const looksBankNoHeader=rows.length&&rows[0].length===4&&/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(String(rows[0][0]).trim())&&Number.isFinite(num(rows[0][3]));
 if(type==='Bank'&&looksBankNoHeader)return {name:'PFMS Bank 4-Column',headerless:true,headers:['Date','Description','Check Number','Signed Amount'],account:/most|zeffy/.test(filename)?'MOST/Zeffy Checking':'Canteen Checking'};
 if(first.includes('net revenue')&&first.includes('order owner name'))return {name:'POS Daily Owner Summary',headerless:false,headers:rows[0],category:/kitchen/.test(filename)?'Kitchen':'Canteen'};
 return {name:'Automatic Column Mapping',headerless:false,headers:rows[0]};
}
function previewCsv(rows,type,sourceName){
 if(!rows.length)return alert('No data rows found.');
 const profile=detectCsvProfile(rows,type,sourceName);
 const h=(profile.headerless?profile.headers:rows[0]).map(x=>String(x).trim());
 const body=profile.headerless?rows:rows.slice(1);
 const raw=body.filter(r=>r.some(x=>String(x).trim())).map((r,i)=>{const o={_row:i+(profile.headerless?1:2)};h.forEach((k,j)=>o[k]=r[j]??'');return o});
 const data=raw.map((o,i)=>inferImportRow(o,h,type,i,profile,sourceName));
 window._csv={h,raw,data,type,profile,sourceName};
 renderCsvPreview();
}
function headerMatch(h,patterns){
 const norm=x=>String(x).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 for(const p of patterns){const exact=h.find(x=>norm(x)===norm(p));if(exact)return exact}
 return h.find(x=>patterns.some(p=>norm(x).includes(norm(p))));
}
function firstValue(o,cols){for(const c of cols)if(c&&String(o[c]??'').trim()!=='')return o[c];return ''}
function roundMoney(n){return Math.round((Number(n)||0)*100)/100}
function suggestFromHistory(description,account,txnType){
 const text=String(description||'').toLowerCase();
 const matches=db.ledger.filter(x=>String(x.description||'').toLowerCase()===text&&x.account===account&&x.type===txnType);
 if(matches.length){const last=matches[matches.length-1];return {fund:last.fund,category:last.category,subcategory:last.subcategory||'',vendor:last.vendor||'',utility:last.utility||'',friendlyDescription:last.friendlyDescription||last.description||description}}
 const rules=[
  [/southern california edison|so cal edison/,'Canteen / Club Fund','Utilities - Electric'],
  [/southwest gas/,'Canteen / Club Fund','Utilities - Gas'],
  [/frontier/,'Canteen / Club Fund','Utilities - Internet/Phone'],
  [/everon/,'Canteen / Club Fund','Security / Alarm'],
  [/smart.?and.?final|smart and final/,'Kitchen Fund','Smart & Final'],
  [/vallarta/,'Kitchen Fund','Vallarta'],
  [/harbor dist/,'Canteen / Club Fund','Harbor Distributing'],
  [/amazon/,'Canteen / Club Fund','Amazon'],
  [/lottery lotto/,'Lotto Fund','Lottery'],
  [/veterans of wars.*payment/,'Dues Reserve Fund','VFW Payment'],
  [/zeffy/,'General Fund','Zeffy Donations']
 ];
 for(const [rx,fund,category] of rules)if(rx.test(text)&&db.funds.some(f=>f.name===fund)){const friendly=PFMSCore.normalizeVendor({description},db.reportSettings?.vendorAliases);const isUtility=/Utilities|Security \/ Alarm/i.test(category);return {fund,category,subcategory:'',vendor:isUtility?'':friendly,utility:isUtility?friendly:'',friendlyDescription:friendly}}
 const friendly=PFMSCore.normalizeVendor({description},db.reportSettings?.vendorAliases);return {fund:'',category:'',subcategory:'',vendor:'',utility:'',friendlyDescription:friendly};
}
function inferImportRow(o,h,type,i,profile,sourceName){
 if(profile.name==='PFMS Bank 4-Column'){
  const signed=roundMoney(num(o['Signed Amount']));
  const txnType=signed<0?'Expense':'Income';
  const description=String(o['Description']||'').trim();
  const account=db.accounts.some(a=>a.name===profile.account)?profile.account:(db.accounts[0]?.name||'');
  const suggestion=suggestFromHistory(description,account,txnType);
  const date=normalizeDate(o['Date']);
  const amount=Math.abs(signed);
  const check=String(o['Check Number']||'').trim();
  const duplicate=db.ledger.some(x=>x.date===date&&Math.abs(Number(x.amount)-amount)<.005&&String(x.description).trim().toLowerCase()===description.toLowerCase()&&String(x.account||'')===account);
  const row={id:uid(),sourceRow:o._row,approved:false,postToLedger:true,date,type:txnType,description,originalDescription:description,friendlyDescription:suggestion.friendlyDescription||description,item:description,qty:1,amount,fund:suggestion.fund,account,category:suggestion.category,subcategory:suggestion.subcategory||'',vendor:suggestion.vendor||'',utility:suggestion.utility||'',check,duplicate,raw:o};row.importFingerprint=importFingerprint(row);row.duplicate=duplicateLedgerRow(row);row.approved=false;return row;
 }
 if(profile.name==='POS Daily Owner Summary'){
  const date=normalizeDate(o['Date']);
  const owner=String(o['Order Owner Name']||'').trim();
  const amount=Math.abs(roundMoney(num(o['Net Revenue'])));
  const refund=Math.abs(roundMoney(num(o['Total Refund'])));
  const net=roundMoney(amount-refund);
  const category=profile.category||'POS';
  const fundName=category==='Kitchen'?(db.funds.find(f=>/kitchen/i.test(f.name))?.name||db.funds[0]?.name):(db.funds.find(f=>/canteen|club/i.test(f.name))?.name||db.funds[0]?.name);
  return {id:uid(),sourceRow:o._row,approved:true,postToLedger:false,date,type:net<0?'Expense':'Income',description:owner||`${category} POS`,item:owner||`${category} POS`,qty:Math.max(0,Math.round(num(o['Orders']))),amount:Math.abs(net),fund:fundName,account:db.accounts[0]?.name||'',category,check:'',duplicate:false,raw:o,pos:{tips:roundMoney(num(o['Tips'])),taxes:roundMoney(num(o['Net Taxes'])),gross:roundMoney(num(o['Gross Revenue'])),netRevenue:roundMoney(num(o['Net Revenue'])),refund}};
 }
 const dc=headerMatch(h,['transaction date','business date','sale date','date']);
 const desc=headerMatch(h,['description','memo','details','order owner name','item','product','name']);
 const qty=headerMatch(h,['quantity','qty','orders','count','units']);
 const debit=headerMatch(h,['debit','withdrawal','disbursement','deduction','expense','charge']);
 const credit=headerMatch(h,['credit','deposit','receipt','income']);
 const amt=headerMatch(h,['net revenue','net amount','signed amount','amount','total','net sales','gross sales','sales','price']);
 const tc=headerMatch(h,['transaction type','type','kind']);
 const cat=headerMatch(h,['category','department','revenue center','sales category']);
 const description=String(firstValue(o,[desc])||'').trim();
 const debitVal=roundMoney(num(debit?o[debit]:0)),creditVal=roundMoney(num(credit?o[credit]:0)),signed=roundMoney(num(firstValue(o,[amt])));
 const typeText=String(tc?o[tc]:'').toLowerCase();
 let txnType=debitVal?'Expense':creditVal?'Income':(/debit|withdraw|purchase|payment|fee|deduction|expense|refund|void|chargeback/.test(typeText+' '+description.toLowerCase())?'Expense':signed<0?'Expense':'Income');
 const amount=Math.abs(roundMoney(debitVal||creditVal||signed));
 const date=normalizeDate(dc?o[dc]:'');
 const account=db.accounts[0]?.name||'',suggestion=suggestFromHistory(description,account,txnType);
 const duplicate=db.ledger.some(x=>x.date===date&&Math.abs(Number(x.amount)-amount)<.005&&String(x.description).trim().toLowerCase()===description.toLowerCase());
 const row={id:uid(),sourceRow:o._row,approved:false,postToLedger:type!=='POS Sales',date,type:txnType,description,originalDescription:description,friendlyDescription:suggestion.friendlyDescription||description,item:description,qty:Math.abs(Math.round(num(qty?o[qty]:1)))||1,amount,fund:suggestion.fund,account,category:String(cat?o[cat]:suggestion.category),subcategory:suggestion.subcategory||'',vendor:suggestion.vendor||'',utility:suggestion.utility||'',check:'',duplicate,raw:o};row.importFingerprint=importFingerprint(row);row.duplicate=duplicateLedgerRow(row);row.approved=false;return row;
}
function importSelectOptions(list,value,placeholder='Choose'){return `<option value="">${esc(placeholder)}</option>`+list.map(x=>`<option ${x.name===value?'selected':''}>${esc(x.name)}</option>`).join('')}
function renderCsvPreview(){
 const c=window._csv;if(!c)return;const {data,type}=c;
 const approved=data.filter(x=>x.approved).length,dupes=data.filter(x=>x.duplicate).length;
 $('#csvPreview').innerHTML=`<div class="card"><h2>Review Import: ${esc(type)}</h2><p class="muted">Detected profile: <strong>${esc(c.profile?.name||'Automatic')}</strong> • Source: ${esc(c.sourceName||'CSV')}</p>
 <div class="notice">Emergency month-end review: Bank rows start unapproved. Choose the correct Fund and Account, then approve only rows you have verified. Approved bank rows post once to the Official Ledger. <strong>Merchant Service deposits/fees are automatically split 90.9512% Canteen / 9.0488% Kitchen for August using the uploaded POS totals.</strong> POS rows feed analytics only and do not post to the ledger.</div>
 <div class="toolbar"><button class="success" id="confirmImport">Import Approved Rows</button><button class="ghost" id="approveAll">Approve All</button><button class="ghost" id="approveNone">Clear Approvals</button><span class="muted"><strong>${data.length}</strong> rows • <strong>${approved}</strong> approved • <strong>${dupes}</strong> likely duplicate(s)</span></div>
 <div class="tablewrap csv-review-wrap"><table class="csv-review-table"><thead><tr><th>Approve</th><th>Row</th><th>Date</th><th>Type</th><th>Original Description</th><th>Friendly Description</th><th>Vendor</th><th>Utility</th><th>Qty</th><th>Amount</th><th>Fund</th><th>Account</th><th>Category</th><th>Subcategory</th><th>Check #</th><th>Duplicate</th></tr></thead><tbody>${data.map((r,i)=>`<tr class="${r.duplicate?'duplicate-row':''}">
 <td class="center"><input type="checkbox" data-csv-i="${i}" data-csv-k="approved" ${r.approved?'checked':''}></td>
 <td>${r.sourceRow}</td><td><input type="date" data-csv-i="${i}" data-csv-k="date" value="${esc(r.date)}"></td>
 <td><select data-csv-i="${i}" data-csv-k="type"><option ${r.type==='Income'?'selected':''}>Income</option><option ${r.type==='Expense'?'selected':''}>Expense</option></select></td>
 <td><input data-csv-i="${i}" data-csv-k="originalDescription" value="${esc(r.originalDescription||r.description)}"></td>
 <td><input data-csv-i="${i}" data-csv-k="friendlyDescription" value="${esc(r.friendlyDescription||r.description)}"></td>
 <td><input data-csv-i="${i}" data-csv-k="vendor" value="${esc(r.vendor||'')}"></td>
 <td><input data-csv-i="${i}" data-csv-k="utility" value="${esc(r.utility||'')}"></td>
 <td><input type="number" step="1" min="0" data-csv-i="${i}" data-csv-k="qty" value="${r.qty}"></td>
 <td><input type="number" step="0.01" min="0" data-csv-i="${i}" data-csv-k="amount" value="${r.amount}"></td>
 <td><select data-csv-i="${i}" data-csv-k="fund">${importSelectOptions(db.funds,r.fund,'Choose Fund')}</select></td>
 <td><select data-csv-i="${i}" data-csv-k="account">${importSelectOptions(db.accounts,r.account,'Choose Account')}</select></td>
 <td><select data-csv-i="${i}" data-csv-k="category"><option></option>${(db.categories||[]).map(c=>`<option ${c.name===r.category?'selected':''}>${esc(c.name)}</option>`).join('')}</select></td>
 <td><select data-csv-i="${i}" data-csv-k="subcategory"><option></option>${((db.categories||[]).find(c=>c.name===r.category)?.subcategories||[]).map(v=>`<option ${v===r.subcategory?'selected':''}>${esc(v)}</option>`).join('')}</select></td>
 <td><input data-csv-i="${i}" data-csv-k="check" value="${esc(r.check||'')}"></td>
 <td>${r.duplicate?'<span class="badge red">Likely duplicate</span>':'<span class="badge green">Clear</span>'}</td></tr>`).join('')}</tbody></table></div></div>`;
 $$('[data-csv-i]').forEach(el=>el.onchange=()=>{const r=data[+el.dataset.csvI],k=el.dataset.csvK;r[k]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;if(k==='category'){r.subcategory='';renderCsvPreview();return}if(k==='originalDescription'){r.description=r.originalDescription;r.importFingerprint=importFingerprint(r);r.duplicate=duplicateLedgerRow(r)}renderCsvCountOnly()});
 $('#approveAll').onclick=()=>{data.forEach(r=>r.approved=true);renderCsvPreview()};
 $('#approveNone').onclick=()=>{data.forEach(r=>r.approved=false);renderCsvPreview()};
 $('#confirmImport').onclick=confirmImport;
}
function renderCsvCountOnly(){const c=window._csv;if(!c)return;const span=$('#csvPreview .toolbar .muted');if(span)span.innerHTML=`<strong>${c.data.length}</strong> rows • <strong>${c.data.filter(x=>x.approved).length}</strong> approved • <strong>${c.data.filter(x=>x.duplicate).length}</strong> likely duplicate(s)`}
function isMerchantServiceRow(r){return /MERCHANT SERVICE/i.test(String(r.originalDescription||r.description||''));}
function augustMerchantAllocations(r){
 const amount=roundMoney(Math.abs(Number(r.amount||0)));
 const canteen=roundMoney(amount*0.909512);
 const kitchen=roundMoney(amount-canteen);
 return [
  {fund:'Canteen / Club Fund',account:r.account,category:r.category||'',subcategory:r.subcategory||'',amount:canteen},
  {fund:'Kitchen Fund',account:r.account,category:r.category||'',subcategory:r.subcategory||'',amount:kitchen}
 ];
}
function confirmImport(){
 const {data,type}=window._csv;
 const chosen=data.filter(r=>r.approved);
 if(!chosen.length)return alert('Approve at least one row.');
 const missing=chosen.filter(r=>type!=='POS Sales'&&!isMerchantServiceRow(r)&&(!r.fund||!r.account));
 if(missing.length){
  // Clear any previous missing-field highlighting.
  $$('#csvPreview tbody tr').forEach(tr=>{tr.style.outline='';tr.style.background=''});
  const details=missing.map(r=>{
   const fields=[!r.fund?'Fund':'',!r.account?'Account':''].filter(Boolean).join(' and ');
   return `CSV row ${r.sourceRow}: missing ${fields}`;
  });
  // Highlight every problem row and move the first one into view.
  missing.forEach(r=>{
   const i=data.indexOf(r);
   const control=$(`[data-csv-i="${i}"][data-csv-k="fund"]`);
   const tr=control?.closest('tr');
   if(tr){tr.style.outline='3px solid #b42318';tr.style.outlineOffset='-3px';tr.style.background='#fff1f0'}
  });
  const firstIndex=data.indexOf(missing[0]);
  const firstControl=$(`[data-csv-i="${firstIndex}"][data-csv-k="${!missing[0].fund?'fund':'account'}"]`);
  firstControl?.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
  setTimeout(()=>firstControl?.focus(),350);
  return alert(`${missing.length} approved row(s) need attention:\n\n${details.join('\n')}\n\nPFMS highlighted the problem row(s) in red and moved you to the first missing field.`);
 }
 let ledgerAdded=0,salesAdded=0,skipped=0;
 chosen.forEach(r=>{
  r.importFingerprint=importFingerprint(r);const duplicate=duplicateLedgerRow(r);
  if(type==='POS Sales'){
   db.sales.push({id:uid(),date:r.date,item:r.item||r.description,qty:Number(r.qty||1),amount:r.type==='Expense'?-Math.abs(Number(r.amount||0)):Math.abs(Number(r.amount||0)),category:r.category||'',fund:r.fund,account:r.account,sourceRow:r.sourceRow,tips:r.pos?.tips||0,taxes:r.pos?.taxes||0,gross:r.pos?.gross||0,refund:r.pos?.refund||0});salesAdded++;
  }
  if(type!=='POS Sales'){
   if(duplicate && r.duplicate){skipped++;return}
   const merchant=isMerchantServiceRow(r);
   const allocations=merchant?augustMerchantAllocations(r):[];
   const primaryFund=merchant?'Canteen / Club Fund':r.fund;
   db.ledger.push({id:uid(),date:r.date,type:r.type,description:merchant?(r.type==='Income'?'Merchant Deposits':'Merchant Service Fee'):(r.friendlyDescription||r.description),originalDescription:r.originalDescription||r.description,friendlyDescription:merchant?(r.type==='Income'?'Merchant Deposits':'Merchant Service Fee'):(r.friendlyDescription||r.description),payee:'',vendor:r.vendor||'',utility:r.utility||'',fund:primaryFund,account:r.account,category:r.category,subcategory:r.subcategory||'',amount:Math.abs(Number(r.amount||0)),check:r.check||'',status:'Needs Review',notes:`Imported from ${type} CSV row ${r.sourceRow}${merchant?' • August POS allocation: 90.9512% Canteen / 9.0488% Kitchen':''}`,source:`CSV ${type}`,sourceRecord:{file:window._csv.sourceName,row:r.sourceRow},importFingerprint:r.importFingerprint,created:new Date().toISOString(),allocations});ledgerAdded++;
  }
 });
 db.ledger.sort((a,b)=>a.date.localeCompare(b.date));save();
 alert(`${chosen.length} approved row(s) processed. ${ledgerAdded} ledger row(s) added, ${salesAdded} POS analytics row(s) added, ${skipped} duplicate ledger row(s) skipped.`);
 go(type==='POS Sales'?'sales':'ledger');
}
function normalizeDate(v){const raw=String(v??'').trim();if(!raw)return '';const m=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);if(m){let y=Number(m[3]);if(y<100)y+=2000;return `${y}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`}const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return `${iso[1]}-${iso[2]}-${iso[3]}`;return ''}
function num(v){let s=String(v??'').trim();if(!s)return 0;let neg=/^\(.*\)$/.test(s)||s.startsWith('-');s=s.replace(/[,$%()\s]/g,'').replace(/[^0-9.+-]/g,'');const n=parseFloat(s);return Number.isFinite(n)?(neg?-Math.abs(n):n):0}
function topItem(rows=db.sales){const m={};rows.forEach(x=>m[x.item]=(m[x.item]||0)+Number(x.qty||1));return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0]||'No sales data'}
function bestDay(rows=db.sales){const m={};rows.forEach(x=>{const d=new Date(x.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'});m[d]=(m[d]||0)+x.amount});return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0]||'No sales data'}
function salesItemTable(rows=db.sales){const m={};rows.forEach(x=>{m[x.item]??={qty:0,amount:0};m[x.item].qty+=Number(x.qty||1);m[x.item].amount+=Number(x.amount||0)});return `<table><thead><tr><th>Item</th><th>Qty</th><th>Sales</th></tr></thead><tbody>${Object.entries(m).sort((a,b)=>b[1].qty-a[1].qty).slice(0,12).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.qty}</td><td>${money(v.amount)}</td></tr>`).join('')||'<tr><td colspan="3">Upload a POS Sales CSV to begin.</td></tr>'}</tbody></table>`}
function showDay(day){$$('.daytab').forEach(b=>b.classList.toggle('active',b.dataset.day===day));const rows=filteredSales(db.settings.salesStart||'',db.settings.salesEnd||'').filter(x=>new Date(x.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})===day), dates=new Set(rows.map(x=>x.date)).size||1;let c=0,k=0;rows.forEach(x=>{if(/kitchen|food/i.test(x.category))k+=x.amount;else c+=x.amount});$('#dailyValue').innerHTML=`<div class="grid grid-2"><div class="metric"><div class="label">Average Canteen</div><div class="value">${money(c/dates)}</div></div><div class="metric"><div class="label">Average Kitchen</div><div class="value">${money(k/dates)}</div></div></div><p class="muted">Based on ${dates} distinct ${day} date(s) in uploaded POS data.</p>`}
function quarterRange(q,y){return [[`${y}-01-01`,`${y}-03-31`],[`${y}-04-01`,`${y}-06-30`],[`${y}-07-01`,`${y}-09-30`],[`${y}-10-01`,`${y}-12-31`]][q-1]}
function auditBaselineDate(q,y){return quarterRange(Number(q),Number(y))[0]}
function auditBaselineFor(q,y){const effectiveDate=auditBaselineDate(q,y);return (db.auditOpeningBalanceBaselines||[]).find(x=>x.effectiveDate===effectiveDate)}
function loadAuditOpeningInputs(){const q=Number($('#auditQ')?.value||1),y=Number($('#auditYear')?.value||new Date().getFullYear()),balances=auditBaselineFor(q,y)?.balances||{};db.funds.filter(f=>f.audit&&f.active!==false).forEach((f,i)=>{const input=$(`[name=opening_${i}]`);if(input)input.value=balances[f.name]??''})}
function clearAuditOpeningBaseline(){const effectiveDate=auditBaselineDate($('#auditQ').value,$('#auditYear').value);db.auditOpeningBalanceBaselines=(db.auditOpeningBalanceBaselines||[]).filter(x=>x.effectiveDate!==effectiveDate);persist();loadAuditOpeningInputs();toast('Beginning balance baseline cleared')}

function printAudit(){
 document.body.classList.add('printing-audit');
 const cleanup=()=>document.body.classList.remove('printing-audit');
 window.addEventListener('afterprint',cleanup,{once:true});
 window.print();
 setTimeout(cleanup,1200);
}
function generateAudit(){
 const q=+$(`#auditQ`).value,y=+$(`#auditYear`).value,[s,e]=quarterRange(q,y);
 const funds=db.funds.filter(f=>f.audit&&f.active!==false),balances={};funds.forEach((f,i)=>{const entered=$(`[name=opening_${i}]`)?.value??'';if(entered!=='')balances[f.name]=num(entered)});db.auditOpeningBalanceBaselines=(db.auditOpeningBalanceBaselines||[]).filter(x=>x.effectiveDate!==s);if(Object.keys(balances).length)db.auditOpeningBalanceBaselines.push({effectiveDate:s,balances});const rows=PFMSCore.calculateFundStatement(db.funds,db.ledger,s,e,db.auditOpeningBalanceBaselines);save();
 const total=rows.reduce((a,x)=>({beg:a.beg+x.beg,rec:a.rec+x.rec,exp:a.exp+x.exp,end:a.end+x.end}),{beg:0,rec:0,exp:0,end:0});
 const bank=num($('#bankBal').value)-num($('#outChecks').value)+num($('#depTransit').value),cash=bank+num($('#savBal').value)+num($('#cashHand').value)+num($('#invest').value),diff=cash-total.end;
 const v=id=>esc($(id)?.value||''), m=id=>money(num($(id)?.value));
 const certDate=v('#certDate')||'____________________________';
 $('#auditOutput').innerHTML=`<div class="card audit-sheet"><div class="toolbar no-print"><button class="primary" onclick="printAudit()">Print / Save PDF</button></div>
 <h2>TRUSTEES’ REPORT OF AUDIT</h2><p style="text-align:center">Books and Records of the Quartermaster and Adjutant of <strong>${esc(db.org.name)}</strong><br>Department of ${esc(db.org.department)} • Fiscal Quarter ending ${e}</p>
 <div class="audit-grid"><div><strong>FUNDS</strong></div><div><strong>Beginning</strong></div><div><strong>Receipts</strong></div><div><strong>Expenditures</strong></div><div><strong>Ending</strong></div>${rows.map(x=>`<div>${esc(x.name)}</div><div>${money(x.beg)}</div><div>${money(x.rec)}</div><div>${money(x.exp)}</div><div>${money(x.end)}</div>`).join('')}<div><strong>TOTALS</strong></div><div><strong>${money(total.beg)}</strong></div><div><strong>${money(total.rec)}</strong></div><div><strong>${money(total.exp)}</strong></div><div><strong>${money(total.end)}</strong></div></div>
 <div class="grid grid-2 audit-sections" style="margin-top:18px"><div><h3>16. Operations</h3><table class="audit-answer-table">
 <tr><td>Have required payroll deductions been made?</td><td>${v('#opPayroll')}</td></tr>
 <tr><td>Have payments been made to the proper State and Federal agencies this quarter?</td><td>${v('#opAgencies')}</td></tr>
 <tr><td>Have sales taxes been collected and paid?</td><td>${v('#opSalesTax')}</td></tr>
 <tr><td>Are club employees bonded?</td><td>${v('#opEmployeesBonded')}</td></tr>
 <tr><td>Amount of outstanding bills</td><td>${m('#opBills')}</td></tr>
 <tr><td>Value of Real Estate</td><td>${m('#opRealEstate')}</td></tr>
 <tr><td>Amount of liability insurance</td><td>${m('#opLiabilityInsurance')}</td></tr>
 <tr><td>Owed on Mortgages and Loans</td><td>${m('#opMortgages')}</td></tr>
 <tr><td>Value of Personal Property</td><td>${m('#opPersonalProperty')}</td></tr>
 <tr><td>Amount of Property Insurance</td><td>${m('#opPropertyInsurance')}</td></tr></table></div>
 <div><h3>17. Reconciliation of Cash & Investments</h3><table><tr><td>General Checking: Ending Balance Per Bank Statement</td><td>${m('#bankBal')}</td></tr><tr><td>Less: Outstanding Checks</td><td>${m('#outChecks')}</td></tr><tr><td>Plus: Deposits in Transit</td><td>${m('#depTransit')}</td></tr><tr><th>Account Balance</th><th>${money(bank)}</th></tr><tr><td>Savings Account Balance</td><td>${m('#savBal')}</td></tr><tr><td>Cash on Hand</td><td>${m('#cashHand')}</td></tr><tr><th>Total Cash</th><th>${money(bank+num($('#savBal').value)+num($('#cashHand').value))}</th></tr><tr><td>Bonds and Other Investments</td><td>${m('#invest')}</td></tr><tr><th>Total Cash and Investments</th><th>${money(cash)}</th></tr><tr><th>Fund Total</th><th>${money(total.end)}</th></tr><tr><th>Difference</th><th style="color:${Math.abs(diff)<.01?'green':'red'}">${money(diff)}</th></tr></table></div></div>
 <div class="notice ${Math.abs(diff)<.01?'':'warning'}">${Math.abs(diff)<.01?'Audit balances reconcile.':'Audit does not reconcile. Review fund allocations, outstanding checks, deposits in transit, savings, and cash on hand.'}</div>
 <div class="certificate"><h3>18. Trustees’ and Commander’s Certificate of Audit</h3>
 <p>Date <strong>${certDate}</strong></p>
 <p>This is to certify that we (or qualified accountants) have audited the books and records of the Adjutant and Quartermaster of <strong>${esc(db.org.name)}</strong> for the Fiscal Quarter ending <strong>${e}</strong> in accordance with the National By-Laws and that this Report is a true and correct statement thereof to the best of our knowledge and belief. All Vouchers and Checks have been examined and found to be properly approved and checks properly countersigned.</p>
 <table class="certificate-table"><tr><td><strong>Post Quartermaster</strong><br>${v('#qmName')}<br>${v('#qmAddress')}</td><td><strong>Signed Trustee</strong><br>${v('#trustee1')}</td></tr><tr><td></td><td><strong>Signed Trustee</strong><br>${v('#trustee2')}</td></tr><tr><td></td><td><strong>Signed Trustee</strong><br>${v('#trustee3')}</td></tr></table>
 <p>This is to certify that the Office of the Quartermaster is bonded with <strong>${v('#bondCompany')}</strong> in the amount of <strong>${m('#bondAmount')}</strong> until <strong>${v('#bondMonth')} ${v('#bondYear')}</strong>, and that this Audit is correctly made out to the best of my knowledge and belief.</p>
 <p><strong>Signed Commander:</strong> ${v('#commanderName')}</p></div></div>`
}
function printMonthly(){
 document.body.classList.add('printing-monthly');
 const cleanup=()=>document.body.classList.remove('printing-monthly');
 window.addEventListener('afterprint',cleanup,{once:true});window.print();setTimeout(cleanup,1500);
}
function monthlyFundsBlock(rows,total){
 return `<div class="monthly-bottom"><h3>STATEMENT OF FUNDS</h3><table class="monthly-funds"><thead><tr><th>Distribution of Receipts, Disbursements & Cash Balances</th><th>Cash Balance Last Report</th><th>Receipts for the Period</th><th>Disbursements for the Period</th><th>Cash Balance This Period</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${money(x.beg)}</td><td>${money(x.rec)}</td><td>${money(x.exp)}</td><td>${money(x.end)}</td></tr>`).join('')}<tr><th>TOTALS</th><th>${money(total.beg)}</th><th>${money(total.rec)}</th><th>${money(total.exp)}</th><th>${money(total.end)}</th></tr></tbody></table><div class="monthly-cert"><div>This is to certify that this report has been audited and found correct.</div><div>Quartermaster: ${esc(db.monthlyDraft?.monthlyQm||'________________')}</div><div>Trustee: ${esc(db.monthlyDraft?.monthlyT1||'________________')}</div><div>Trustee: ${esc(db.monthlyDraft?.monthlyT2||'________________')}</div><div>Trustee: ${esc(db.monthlyDraft?.monthlyT3||'________________')}</div><div>Commander: ${esc(db.monthlyDraft?.monthlyCommander||'________________')}</div></div></div>`;
}
function monthlyLineMarkup(line){
 if(!line)return '';
 if(line.count<=1)return esc(line.description);
 const target=`drill-${line.id}`;
 const details=line.transactions.map(transaction=>`<li><span>${esc(transaction.date||'No date')}</span><span>${esc(transaction.description||transaction.payee||transaction.category||'Transaction')}</span><span>${esc(transaction.fund||'Unassigned Fund')}</span><strong>${money(transaction.amount)}</strong></li>`).join('');
 return `<button type="button" class="report-group-toggle" aria-expanded="false" aria-controls="${esc(target)}" onclick="toggleReportGroup('${esc(target)}',this)"><span>${esc(line.description)}</span><span class="group-count">View ${line.count}</span></button><div id="${esc(target)}" class="report-drilldown hidden"><div class="drilldown-title">Source transactions</div><ul>${details}</ul></div>`;
}
function toggleReportGroup(id,button){const detail=document.getElementById(id);if(!detail)return;const opening=detail.classList.contains('hidden');detail.classList.toggle('hidden',!opening);button?.setAttribute('aria-expanded',String(opening));if(button){const badge=button.querySelector('.group-count');if(badge)badge.textContent=opening?'Hide details':`View ${detail.querySelectorAll('li').length}`}}
function monthlyDetailPage(page,start,end,totalPages,fundsBlock,profile){
 const rowCount=Math.max(1,page.receipts.length+page.disbursements.length);
 const density=rowCount>34?' density-tight':rowCount>24?' density-compact':'';
 const receiptTotal=page.receipts.reduce((sum,line)=>sum+Number(line.amount||0),0),disbursementTotal=page.disbursements.reduce((sum,line)=>sum+Number(line.amount||0),0);
 const activityTable=(kind,lines,total)=>{const isReceipt=kind==='receipt',label=isReceipt?'RECEIPTS':'DISBURSEMENTS',reference=isReceipt?'Receipt No.':'Voucher No.',totalLabel=`${totalPages>1?'PAGE TOTAL ':'TOTAL '}${label}`;return `<table class="monthly-detail monthly-${kind}s"><thead><tr><th>${reference}</th><th>${label}</th><th>Amount</th></tr></thead><tbody>${lines.map(line=>`<tr><td>${esc(line.check||'')}</td><td>${monthlyLineMarkup(line)}</td><td>${money(line.amount)}</td></tr>`).join('')||`<tr class="monthly-empty"><td></td><td>No ${label.toLowerCase()} on this page</td><td></td></tr>`}</tbody><tfoot><tr><th colspan="2">${totalLabel}</th><th>${money(total)}</th></tr></tfoot></table>`};
 return `<section class="monthly-sheet${density} ${page.page>1?'page-break':''}" data-report-profile="${profile.id}"><div class="monthly-head"><div><strong>For Period of</strong> ${start} through ${end}</div><div><h2>QUARTERMASTER’S</h2><strong>DETAIL OF RECEIPTS AND DISBURSEMENTS</strong></div><div><strong>${esc(profile.label)}</strong><br>Post No. ${esc(db.org.number)}<br>Page ${page.page} of ${totalPages}</div></div><div class="monthly-subhead">Meeting of ${esc(db.monthlyDraft?.monthlyMeeting||'________________')}</div><div class="monthly-activity">${activityTable('receipt',page.receipts,receiptTotal)}${activityTable('disbursement',page.disbursements,disbursementTotal)}</div>${fundsBlock}</section>`;
}
function generateMonthlyReport(){
 const period=$('#monthlyPeriod').value;if(!period)return alert('Select a month.');
 const [y,m]=period.split('-').map(Number),start=`${y}-${String(m).padStart(2,'0')}-01`,end=new Date(y,m,0).toISOString().slice(0,10);
 const tx=db.ledger.filter(x=>x.date>=start&&x.date<=end&&x.status!=='Void').sort((a,b)=>a.date.localeCompare(b.date));
 const profileId=$('#monthlyProfile')?.value||'meeting',profile=PFMSCore.reportProfile(profileId);
 const reportRows=PFMSCore.createReportLines(tx,{profile:profileId,vendorAliases:db.reportSettings?.vendorAliases||[]});
 const receipts=reportRows.filter(x=>x.type==='Income'),disbursements=reportRows.filter(x=>x.type==='Expense');
 const rows=PFMSCore.calculateFundStatement(db.funds,db.ledger,start,end,db.auditOpeningBalanceBaselines);
 const total=rows.reduce((a,x)=>({beg:a.beg+x.beg,rec:a.rec+x.rec,exp:a.exp+x.exp,end:a.end+x.end}),{beg:0,rec:0,exp:0,end:0});
 const fundsBlock=monthlyFundsBlock(rows,total);
 const pages=PFMSCore.paginateReport(receipts,disbursements,rows.length,profileId),pageCount=pages.length;
 const detail=pages.map(page=>monthlyDetailPage(page,start,end,pageCount,page.includesFunds?fundsBlock:'',profile)).join('');
 const summaryText=profile.grouped?`${tx.length} ledger transactions intelligently combined into ${reportRows.length} report lines.`:`${tx.length} individual ledger transactions preserved for audit review.`;
 db.monthlyDraft.lastGenerated={period,profile:profileId,generatedAt:new Date().toISOString(),sourceTransactions:tx.length,reportLines:reportRows.length,pages:pageCount};persist();
 $('#monthlyOutput').innerHTML=`<div class="toolbar no-print report-result-toolbar"><button class="primary" onclick="printMonthly()">Print / Save PDF</button><span class="badge ${profile.grouped?'green':''}">${esc(profile.label)}</span><span class="muted">${summaryText} ${pageCount===1?'One-page layout selected automatically.':`${pageCount} pages required.`}</span></div><div class="monthly-report-wrap">${detail}</div>`;
}

function drawFundChart(){const c=$('#fundChart');if(!c)return;const ctx=c.getContext('2d'),rows=filteredLedger(db.settings.dashboardStart||'',db.settings.dashboardEnd||''),d=db.funds.filter(f=>f.active!==false).map(f=>({n:f.name,v:Math.max(0,fundBalance(f.name,rows))}));c.width=c.clientWidth*devicePixelRatio;c.height=c.clientHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);if(!d.some(x=>x.v)){ctx.fillStyle='#6b7280';ctx.fillText('Add ledger transactions to populate this chart.',20,30);return}if(db.settings.chart==='pie'){const total=d.reduce((a,x)=>a+x.v,0);let a=-Math.PI/2;d.forEach((x,i)=>{const ang=x.v/total*Math.PI*2;ctx.beginPath();ctx.moveTo(w*.35,h*.5);ctx.arc(w*.35,h*.5,Math.min(w,h)*.32,a,a+ang);ctx.fillStyle=['#0b1d36','#2e7d32','#1656a0','#f59e0b','#6b7280','#7c3aed'][i%6];ctx.fill();a+=ang});d.slice(0,8).forEach((x,i)=>{ctx.fillStyle='#111827';ctx.fillText(`${x.n}: ${money(x.v)}`,w*.68,22+i*22)})}else{const max=Math.max(...d.map(x=>x.v)),bw=(w-50)/d.length;d.forEach((x,i)=>{const bh=x.v/max*(h-60);ctx.fillStyle=i%2?'#2e7d32':'#1656a0';ctx.fillRect(30+i*bw,h-30-bh,bw*.65,bh);ctx.save();ctx.translate(34+i*bw,h-8);ctx.rotate(-.45);ctx.font='10px Arial';ctx.fillStyle='#374151';ctx.fillText(x.n.slice(0,15),0,0);ctx.restore()})}}
function exportBackup(){const payload=PFMSCore.backupEnvelope(db);download(`PFMS_Alpha_0_2_2_Backup_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2),'application/json')}
function normalizeLegacyFundName(name){
 const map={'Post Relief Fund':'Relief Fund','Post Canteen / Club Fund':'Canteen / Club Fund'};
 return map[name]||name;
}
function migrateV26(old){
 const fresh=structuredClone(seed);
 fresh.org={...fresh.org,name:'VFW Post 2924',number:'2924',department:'California'};
 const legacyFunds=Object.keys(old.funds||{}).filter(x=>!['Petty Cash','Savings Account','Unallocated'].includes(x)).map(normalizeLegacyFundName);
 fresh.funds=legacyFunds.map(name=>({name,type:/dues/i.test(name)?'Dues':/relief/i.test(name)?'Relief':/building/i.test(name)?'Building':/canteen|club/i.test(name)?'Canteen':/kitchen/i.test(name)?'Kitchen':'Program',restricted:/relief|reserve|most|bartender|lotto/i.test(name),audit:true,active:true}));
 fresh.accounts=[{name:'Canteen Checking',type:'Checking',balance:0},{name:'MOST/Zeffy Checking',type:'Checking',balance:0},{name:'Savings Account',type:'Savings',balance:Number(old.funds?.['Savings Account']||0)},{name:'Petty Cash',type:'Cash',balance:Number(old.funds?.['Petty Cash']||0)}];
 fresh.ledger=(old.ledger||[]).map(x=>({id:uid(),date:normalizeDate(x.date),type:Number(x.receipt||0)>0?'Income':'Expense',description:String(x.description||''),payee:'',fund:normalizeLegacyFundName(x.fund||'General Fund'),account:x.bank||'Canteen Checking',category:x.category||'',amount:roundMoney(Number(x.receipt||x.disbursement||0)),check:String(x.checkNumber||''),status:x.status||'Imported v2.6',notes:x.notes||'',source:'PFMS v2.6 Migration',created:new Date().toISOString()}));
 fresh.utilities=(old.utilities||[]).map(x=>({vendor:x.vendor||'',amount:Number(x.amount||0),fund:normalizeLegacyFundName(x.fund||''),account:'Canteen Checking',dueDay:x.dueDate||'',notes:x.notes||'',status:x.status||'Open'}));
 fresh.stipends=(old.stipends||[]).map(x=>({payee:x.position||'',amount:Number(x.paid||0),fund:normalizeLegacyFundName(x.paidFrom||''),account:'MOST/Zeffy Checking',frequency:'Monthly',notes:x.notes||'',status:'Open',check:''}));
 fresh.approvals=(old.approvals||[]).map(x=>({description:x.purpose||'',amount:Number(x.approvedAmount||0),fund:normalizeLegacyFundName(x.fund||''),account:'MOST/Zeffy Checking',meetingDate:x.meetingDate||'',payee:x.payee||'',notes:[x.meetingType,x.requestedBy,x.notes].filter(Boolean).join(' • '),status:/paid/i.test(x.paymentStatus||'')?'Paid':'Open',check:x.checkNumber||''}));
 fresh.reimbursements=(old.reimbursements||[]).map(x=>({...x,fund:normalizeLegacyFundName(x.fund||'')}));
 fresh.sales=[];fresh.settings={chart:'bar',dashboardStart:'',dashboardEnd:'',salesStart:'',salesEnd:''};fresh.auditOpeningBalances={};fresh.auditOpeningBalanceBaselines=[];fresh.auditDraft={};fresh.monthlyDraft={};fresh.importRules=[];
 return fresh;
}
function restoreBackup(e){
 const f=e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=()=>{try{const incoming=JSON.parse(r.result),result=PFMSCore.migrateDatabase(incoming,seed,migrateV26);db=result.database;save();const message=result.sourceFormat==='legacy-v26'?'PFMS v2.6 backup migrated successfully. Review balances and any records marked Needs Review.':result.sourceFormat==='alpha'?'Alpha 0.1.8-compatible backup restored and upgraded successfully.':'PFMS Alpha 0.2 backup restored successfully.';alert(message);go('dashboard')}catch(err){console.error(err);alert(`Invalid or unsupported PFMS backup file. ${err.message||''}`.trim())}};r.readAsText(f);e.target.value='';
}
function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
window.exportBackup=exportBackup;window.printMonthly=printMonthly;window.toggleReportGroup=toggleReportGroup;init();
