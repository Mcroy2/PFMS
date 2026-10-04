(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PFMSCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const APP_VERSION = '0.2.2-patch.4';
  const SCHEMA_VERSION = 6;

  const REPORT_PROFILES = Object.freeze({
    meeting: Object.freeze({
      id: 'meeting',
      label: 'Meeting Copy',
      description: 'Smart-grouped, officer-friendly report optimized to use the fewest pages.',
      grouped: true,
      prePageCapacity: 42,
      baseFinalPageCapacity: 34
    }),
    audit: Object.freeze({
      id: 'audit',
      label: 'Audit Copy',
      description: 'Transaction-level report that preserves dates, check numbers, and source descriptions.',
      grouped: false,
      prePageCapacity: 32,
      baseFinalPageCapacity: 24
    })
  });

  const BUILT_IN_VENDOR_ALIASES = Object.freeze([
    { match: 'MERCHANT SERVICE|MERCH DEP|MERCHANT DEPOSIT|CARD SETTLEMENT', name: 'Merchant Deposits' },
    { match: 'SO CAL EDISON|SOUTHERN CALIFORNIA EDISON', name: 'Southern California Edison' },
    { match: 'SOUTHWEST GAS', name: 'Southwest Gas' },
    { match: 'INTUIT|QBOOKS|QUICKBOOKS', name: 'QuickBooks Online' },
    { match: 'AMAZON|AMZN', name: 'Amazon' },
    { match: 'T[ -]?MOBILE', name: 'T-Mobile' },
    { match: 'CITY OF HESPERIA', name: 'City of Hesperia' },
    { match: 'ADVANCE DISPOSAL', name: 'Advance Disposal' },
    { match: 'R\s*&\s*S BEVERAGE', name: 'R & S Beverage' },
    { match: 'CALIFORNIA LOTTERY|LOTTERY LOTTO', name: 'California Lottery' },
    { match: 'MESQUIT.?S JANITORIAL', name: "Mesquite's Janitorial Supply" },
    { match: 'FRONTIER', name: 'Frontier' },
    { match: 'EVERON', name: 'Everon' },
    { match: 'LOCKTON', name: 'Lockton Affinity' }
  ]);

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function budgetActuals(ledger, year, month) {
    const prefix = month ? `${year}-${String(month).padStart(2, '0')}` : `${year}-`;
    const result = {};
    expandAllocations(ledger).forEach(row => {
      if (row.status === 'Void' || row.type !== 'Expense' || !String(row.date || '').startsWith(prefix)) return;
      const category = row.category || 'Uncategorized';
      const subcategory = row.subcategory || '';
      result[`category:${category}`] = roundMoney((result[`category:${category}`] || 0) + Number(row.amount || 0));
      if (subcategory) result[`subcategory:${category}:${subcategory}`] = roundMoney((result[`subcategory:${category}:${subcategory}`] || 0) + Number(row.amount || 0));
    });
    return result;
  }

  function budgetStatus(budget, actual, thresholds) {
    const used = Number(budget) > 0 ? Number(actual) / Number(budget) * 100 : (Number(actual) > 0 ? 100 : 0);
    const limits = { yellow: 75, red: 100, ...(thresholds || {}) };
    return { used: roundMoney(used), level: used >= limits.red ? 'red' : used >= limits.yellow ? 'yellow' : 'green' };
  }

  function transactionAllocations(transaction) {
    const splits = Array.isArray(transaction && transaction.allocations)
      ? transaction.allocations.filter(split => split && Number(split.amount) > 0)
      : [];
    if (!splits.length) return [{
      fund: transaction.fund || 'Unassigned Fund', account: transaction.account || 'Unassigned Account',
      category: transaction.category || '', amount: roundMoney(transaction.amount)
    }];
    return splits.map(split => ({
      fund: split.fund || transaction.fund || 'Unassigned Fund',
      account: split.account || transaction.account || 'Unassigned Account',
      category: split.category || transaction.category || '',
      subcategory: split.subcategory || transaction.subcategory || '', amount: roundMoney(split.amount)
    }));
  }

  function expandAllocations(rows) {
    return (Array.isArray(rows) ? rows : []).flatMap((transaction, transactionIndex) =>
      transactionAllocations(transaction).map((allocation, allocationIndex, allocations) => ({
        ...safeClone(transaction), ...allocation,
        id: allocations.length > 1 ? `${transaction.id || `transaction-${transactionIndex}`}::split-${allocationIndex + 1}` : transaction.id,
        parentTransactionId: transaction.id || '', allocationIndex, allocationCount: allocations.length
      }))
    );
  }

  function transferPostings(transaction) {
    const transfer = transaction && transaction.transfer;
    if (!transaction || transaction.type !== 'Transfer' || !transfer || !transfer.from || !transfer.to) return [];
    const amount = roundMoney(transaction.amount);
    if (amount <= 0) return [];
    const base = safeClone(transaction);
    return [
      {
        ...base, id: `${transaction.id || 'transfer'}::from`, parentTransactionId: transaction.id || '',
        type: 'Expense', description: transaction.description || `Transfer to ${transfer.to.fund || 'destination category'}`,
        fund: transfer.from.fund || transaction.fund || 'Unassigned Fund',
        account: transfer.from.account || transaction.account || 'Unassigned Account',
        category: transfer.from.category || 'Category Transfer', subcategory: transfer.from.subcategory || '',
        amount, transferDirection: 'From'
      },
      {
        ...base, id: `${transaction.id || 'transfer'}::to`, parentTransactionId: transaction.id || '',
        type: 'Income', description: transaction.description || `Transfer from ${transfer.from.fund || 'source category'}`,
        fund: transfer.to.fund || 'Unassigned Fund',
        account: transfer.to.account || transaction.account || 'Unassigned Account',
        category: transfer.to.category || 'Category Transfer', subcategory: transfer.to.subcategory || '',
        amount, transferDirection: 'To'
      }
    ];
  }

  function expandFinancialActivity(rows) {
    return (Array.isArray(rows) ? rows : []).flatMap(transaction =>
      transaction && transaction.type === 'Transfer' ? transferPostings(transaction) : expandAllocations([transaction])
    );
  }

  function safeClone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function canonicalText(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  function titleCase(value) {
    return String(value || '').toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
  }

  function transactionSearchText(transaction) {
    return [
      transaction.payee,
      transaction.vendor,
      transaction.description,
      transaction.category,
      transaction.source
    ].filter(Boolean).join(' ');
  }

  function testAlias(text, alias) {
    if (!alias || !alias.match || !alias.name) return false;
    try {
      return new RegExp(alias.match, 'i').test(text);
    } catch {
      return canonicalText(text).includes(canonicalText(alias.match));
    }
  }

  function fallbackVendorName(transaction) {
    const original = transaction.payee || transaction.vendor || transaction.description || transaction.category || 'Other';
    const cleaned = String(original)
      .replace(/^(RECURRING\s+)?(DEPOSIT|WITHDRAWAL)?\s*(ACH|DEBIT CARD PURCHASE|CARD PURCHASE|PURCHASE)?\s*/i, '')
      .split(/(?:%%|\sDATE\s|\sPURCH\s|\sMCC\s|\sCO:\s|\sTYPE:\s|\sDATA:\s)/i)[0]
      .replace(/\*?[A-Z0-9]{7,}$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    return titleCase(cleaned || transaction.category || 'Other');
  }

  function resolveVendor(transaction, aliases) {
    const text = transactionSearchText(transaction);
    const orderedAliases = [...(Array.isArray(aliases) ? aliases : []), ...BUILT_IN_VENDOR_ALIASES];
    const alias = orderedAliases.find(item => testAlias(text, item));
    return {
      name: alias ? alias.name : fallbackVendorName(transaction),
      recognized: Boolean(alias || transaction.payee || transaction.vendor)
    };
  }

  function normalizeVendor(transaction, aliases) {
    return resolveVendor(transaction, aliases).name;
  }

  function isMerchantDeposit(transaction) {
    if (transaction.type !== 'Income') return false;
    return /MERCHANT SERVICE|MERCH DEP|MERCHANT DEPOSIT|CARD SETTLEMENT|CARD PROCESSING DEPOSIT|STRIPE (TRANSFER|PAYOUT)|SQUARE (TRANSFER|PAYOUT)/i
      .test(transactionSearchText(transaction));
  }

  function reportProfile(profileId) {
    return REPORT_PROFILES[profileId] || REPORT_PROFILES.meeting;
  }

  function transactionId(transaction, index) {
    return String(transaction.id || `transaction-${index}`);
  }

  function makeIndividualLine(transaction, index, aliases) {
    const vendorIdentity = resolveVendor(transaction, aliases);
    const vendor = vendorIdentity.name;
    return {
      id: `line-${transactionId(transaction, index)}`,
      type: transaction.type,
      account: transaction.account || 'Unassigned Account',
      fund: transaction.fund || 'Unassigned Fund',
      category: transaction.category || 'Other',
      vendor,
      description: transaction.description || vendor || transaction.category || 'Transaction',
      amount: roundMoney(transaction.amount),
      count: 1,
      check: transaction.check || '',
      groupKind: 'transaction',
      transactions: [safeClone(transaction)]
    };
  }

  function shouldRemainIndividual(transaction) {
    return Boolean(String(transaction.check || '').trim()) || /Meeting Approval|Reimbursement|Stipend/i.test(transaction.source || '');
  }

  function groupDescriptor(transaction, aliases) {
    const account = transaction.account || 'Unassigned Account';
    const fund = transaction.fund || 'Unassigned Fund';
    const category = transaction.category || 'Other';
    const vendorIdentity = resolveVendor(transaction, aliases);
    const vendor = vendorIdentity.name;
    if (isMerchantDeposit(transaction)) {
      return {
        key: ['merchant-deposit', transaction.type, account].join('||'),
        groupKind: 'merchant-deposit',
        account,
        fund: 'Multiple funds',
        category: 'Merchant Deposits',
        vendor: 'Merchant Deposits',
        description: `Merchant Deposits — ${account}`
      };
    }
    const rollupName = vendorIdentity.recognized ? vendor : category;
    const rollupKey = vendorIdentity.recognized ? `vendor:${canonicalText(vendor)}` : `category:${canonicalText(category)}`;
    return {
      key: ['activity', transaction.type, account, fund, category, rollupKey].join('||'),
      groupKind: 'vendor',
      account,
      fund,
      category,
      vendor: rollupName,
      description: `${rollupName} — ${fund} / ${account}`
    };
  }

  function createReportLines(rows, options) {
    const profile = reportProfile(options && options.profile);
    const aliases = options && options.vendorAliases;
    const validRows = expandFinancialActivity(rows).filter(row => row && row.status !== 'Void' && ['Income', 'Expense'].includes(row.type));

    if (!profile.grouped) {
      return validRows
        .map((row, index) => makeIndividualLine(row, index, aliases))
        .sort(compareReportLines);
    }

    const groups = new Map();
    validRows.forEach((transaction, index) => {
      if (shouldRemainIndividual(transaction)) {
        const line = makeIndividualLine(transaction, index, aliases);
        groups.set(`individual||${line.id}`, line);
        return;
      }

      const descriptor = groupDescriptor(transaction, aliases);
      if (!groups.has(descriptor.key)) {
        groups.set(descriptor.key, {
          id: `group-${groups.size + 1}`,
          type: transaction.type,
          account: descriptor.account,
          fund: descriptor.fund,
          category: descriptor.category,
          vendor: descriptor.vendor,
          description: descriptor.description,
          amount: 0,
          count: 0,
          check: '',
          groupKind: descriptor.groupKind,
          transactions: []
        });
      }
      const group = groups.get(descriptor.key);
      group.amount = roundMoney(group.amount + Number(transaction.amount || 0));
      group.count += 1;
      group.transactions.push(safeClone(transaction));
    });

    return [...groups.values()].map(group => ({
      ...group,
      description: group.count > 1 ? `${group.description} (${group.count} transactions)` : group.description
    })).sort(compareReportLines);
  }

  function compareReportLines(left, right) {
    return String(left.description).localeCompare(String(right.description)) || String(left.account).localeCompare(String(right.account));
  }

  function calculateFundStatement(funds, ledger, start, end, openingBalances) {
    const transactions = expandFinancialActivity(ledger);
    const datedBaselines = Array.isArray(openingBalances)
      ? openingBalances
        .filter(item => item && item.effectiveDate && item.effectiveDate <= start && item.balances && typeof item.balances === 'object')
        .sort((left, right) => right.effectiveDate.localeCompare(left.effectiveDate))
      : [];
    const legacyOverrides = !Array.isArray(openingBalances) && openingBalances && typeof openingBalances === 'object' ? openingBalances : {};
    return (Array.isArray(funds) ? funds : [])
      .filter(fund => fund && fund.audit && fund.active !== false)
      .map(fund => {
        const baseline = datedBaselines.find(item => item.balances[fund.name] !== undefined && item.balances[fund.name] !== '');
        const activityStart = baseline ? baseline.effectiveDate : '';
        const calculated = transactions
          .filter(row => row.fund === fund.name && row.date < start && row.date >= activityStart && row.status !== 'Void')
          .reduce((sum, row) => sum + (row.type === 'Income' ? Number(row.amount || 0) : row.type === 'Expense' ? -Number(row.amount || 0) : 0), 0);
        const hasLegacyOverride = legacyOverrides[fund.name] !== undefined && legacyOverrides[fund.name] !== '';
        const beginning = baseline
          ? Number(baseline.balances[fund.name]) + calculated
          : hasLegacyOverride ? Number(legacyOverrides[fund.name]) : calculated;
        const periodRows = transactions.filter(row => row.fund === fund.name && row.date >= start && row.date <= end && row.status !== 'Void');
        const receipts = periodRows.filter(row => row.type === 'Income').reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const disbursements = periodRows.filter(row => row.type === 'Expense').reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return {
          name: fund.name,
          beg: roundMoney(beginning),
          rec: roundMoney(receipts),
          exp: roundMoney(disbursements),
          end: roundMoney(beginning + receipts - disbursements)
        };
      });
  }

  function paginateReport(receipts, disbursements, fundCount, profileId) {
    const profile = reportProfile(profileId);
    const receiptRows = Array.isArray(receipts) ? receipts : [];
    const disbursementRows = Array.isArray(disbursements) ? disbursements : [];
    const activity = [
      ...receiptRows.map(row => ({ kind: 'receipt', row })),
      ...disbursementRows.map(row => ({ kind: 'disbursement', row }))
    ];
    const totalLength = activity.length;
    const fundPenalty = Math.ceil(Math.max(0, Number(fundCount) || 0) / 2);
    const finalCapacity = Math.max(profile.id === 'meeting' ? 20 : 16, profile.baseFinalPageCapacity - fundPenalty);
    const preCapacity = profile.prePageCapacity;
    const pageFromSlice = (slice, includesFunds, page) => ({
      page,
      capacity: Math.max(1, slice.length),
      receipts: slice.filter(item => item.kind === 'receipt').map(item => item.row),
      disbursements: slice.filter(item => item.kind === 'disbursement').map(item => item.row),
      includesFunds
    });

    if (totalLength <= finalCapacity) {
      return [pageFromSlice(activity, true, 1)];
    }

    const preliminaryPageCount = Math.ceil((totalLength - finalCapacity) / preCapacity);
    const pages = [];
    let offset = 0;
    for (let index = 0; index < preliminaryPageCount; index += 1) {
      pages.push(pageFromSlice(activity.slice(offset, offset + preCapacity), false, pages.length + 1));
      offset += preCapacity;
    }
    pages.push(pageFromSlice(activity.slice(offset), true, pages.length + 1));
    return pages;
  }

  function mergeDefaults(defaults, incoming) {
    if (Array.isArray(defaults)) return Array.isArray(incoming) ? safeClone(incoming) : safeClone(defaults);
    if (defaults && typeof defaults === 'object') {
      const source = incoming && typeof incoming === 'object' && !Array.isArray(incoming) ? incoming : {};
      const result = {};
      Object.keys(defaults).forEach(key => { result[key] = mergeDefaults(defaults[key], source[key]); });
      Object.keys(source).forEach(key => {
        if (!(key in result)) result[key] = safeClone(source[key]);
      });
      return result;
    }
    return incoming === undefined ? defaults : incoming;
  }

  function validateDatabase(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return { valid: false, reason: 'Backup must contain a PFMS data object.' };
    if (!Array.isArray(candidate.ledger)) return { valid: false, reason: 'Backup is missing the PFMS ledger.' };
    if (!candidate.funds || (!Array.isArray(candidate.funds) && typeof candidate.funds !== 'object')) return { valid: false, reason: 'Backup is missing PFMS funds.' };
    return { valid: true, reason: '' };
  }

  function detectBackupFormat(candidate) {
    if (candidate && candidate.data && candidate.metadata && Array.isArray(candidate.data.ledger)) return 'wrapped';
    if (candidate && candidate.funds && !Array.isArray(candidate.funds) && Array.isArray(candidate.ledger)) return 'legacy-v26';
    if (candidate && Array.isArray(candidate.funds) && Array.isArray(candidate.ledger)) return 'alpha';
    return 'unknown';
  }

  function migrateDatabase(candidate, seed, legacyMigrator) {
    const format = detectBackupFormat(candidate);
    let source = format === 'wrapped' ? candidate.data : candidate;
    if (format === 'legacy-v26') {
      if (typeof legacyMigrator !== 'function') throw new Error('This legacy PFMS backup requires a migration adapter.');
      source = legacyMigrator(candidate);
    }
    const validation = validateDatabase(source);
    if (!validation.valid) throw new Error(validation.reason);
    const migrated = mergeDefaults(seed, source);
    migrated.schemaVersion = SCHEMA_VERSION;
    migrated.appVersion = APP_VERSION;
    migrated.reportSettings = mergeDefaults({ defaultProfile: 'meeting', vendorAliases: [] }, source.reportSettings);
    migrated.auditOpeningBalanceBaselines = Array.isArray(source.auditOpeningBalanceBaselines)
      ? safeClone(source.auditOpeningBalanceBaselines)
      : [];
    if (!migrated.auditOpeningBalanceBaselines.length && source.auditOpeningBalances && Object.values(source.auditOpeningBalances).some(value => value !== '' && value !== undefined)) {
      const quarter = Math.min(4, Math.max(1, Number(source.auditDraft?.auditQ) || 1));
      const year = Number(source.auditDraft?.auditYear) || new Date().getFullYear();
      const month = String((quarter - 1) * 3 + 1).padStart(2, '0');
      migrated.auditOpeningBalanceBaselines.push({
        effectiveDate: `${year}-${month}-01`,
        balances: safeClone(source.auditOpeningBalances)
      });
    }
    migrated.auditOpeningBalances = {};
    migrated.monthlyDraft = migrated.monthlyDraft || {};
    const sourceMonthlyDraft = source.monthlyDraft || {};
    if (!sourceMonthlyDraft.monthlyProfile && sourceMonthlyDraft.monthlyDetailMode) {
      migrated.monthlyDraft.monthlyProfile = sourceMonthlyDraft.monthlyDetailMode === 'detailed' ? 'audit' : 'meeting';
    } else {
      migrated.monthlyDraft.monthlyProfile = sourceMonthlyDraft.monthlyProfile || migrated.monthlyDraft.monthlyProfile || migrated.reportSettings.defaultProfile || 'meeting';
    }
    migrated.ledger = migrated.ledger.map((row, index) => ({
      id: row.id || `migrated-${index + 1}`,
      date: row.date || '',
      type: row.type || 'Expense',
      description: row.friendlyDescription || row.description || '',
      originalDescription: row.originalDescription || row.description || '',
      friendlyDescription: row.friendlyDescription || row.description || '',
      payee: row.payee || '',
      vendor: row.vendor || '',
      utility: row.utility || '',
      fund: row.fund || migrated.funds[0]?.name || 'General Fund',
      account: row.account || migrated.accounts[0]?.name || 'General Checking',
      category: row.category || '',
      subcategory: row.subcategory || '',
      amount: roundMoney(row.amount),
      check: row.check || '',
      status: row.status || 'Posted',
      notes: row.notes || '',
      source: row.source || 'Restored Backup',
      sourceRecord: row.sourceRecord || null,
      importFingerprint: row.importFingerprint || '',
      created: row.created || '',
      transfer: row.type === 'Transfer' && row.transfer && row.transfer.from && row.transfer.to ? {
        from: {
          fund: row.transfer.from.fund || row.fund || migrated.funds[0]?.name || 'General Fund',
          account: row.transfer.from.account || row.account || migrated.accounts[0]?.name || 'General Checking',
          category: row.transfer.from.category || 'Category Transfer', subcategory: row.transfer.from.subcategory || ''
        },
        to: {
          fund: row.transfer.to.fund || migrated.funds[0]?.name || 'General Fund',
          account: row.transfer.to.account || row.account || migrated.accounts[0]?.name || 'General Checking',
          category: row.transfer.to.category || 'Category Transfer', subcategory: row.transfer.to.subcategory || ''
        }
      } : null,
      allocations: Array.isArray(row.allocations) ? row.allocations.filter(split => split && Number(split.amount) > 0).map(split => ({
        fund: split.fund || row.fund || migrated.funds[0]?.name || 'General Fund',
        account: split.account || row.account || migrated.accounts[0]?.name || 'General Checking',
        category: split.category || row.category || '',
        subcategory: split.subcategory || row.subcategory || '', amount: roundMoney(split.amount)
      })) : []
    }));
    return { database: migrated, sourceFormat: format };
  }

  function backupEnvelope(database) {
    return {
      metadata: {
        product: 'PFMS',
        appVersion: APP_VERSION,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString()
      },
      data: safeClone(database)
    };
  }

  return Object.freeze({
    APP_VERSION,
    SCHEMA_VERSION,
    REPORT_PROFILES,
    BUILT_IN_VENDOR_ALIASES,
    roundMoney,
    transactionAllocations,
    expandAllocations,
    transferPostings,
    expandFinancialActivity,
    canonicalText,
    normalizeVendor,
    isMerchantDeposit,
    reportProfile,
    createReportLines,
    calculateFundStatement,
    paginateReport,
    mergeDefaults,
    validateDatabase,
    detectBackupFormat,
    migrateDatabase,
    backupEnvelope,
    budgetActuals,
    budgetStatus
  });
});
