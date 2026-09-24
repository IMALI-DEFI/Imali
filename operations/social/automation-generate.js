'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SJ_ROOT = '/home/opc/sports-jedi';
const SJ_PY = `${SJ_ROOT}/marketing/venv/bin/python`;
const SJ_STANDARD = `${SJ_ROOT}/marketing/generate_marketing.py`;
const SJ_PARLAY = `${SJ_ROOT}/marketing/generate_player_parlay.py`;
const SJ_PUBLIC = 'https://api.sportsjedi.com/api/blog/images';

function run(cmd, args) {
  return execFileSync(cmd, args, {
    cwd: SJ_ROOT,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 4
  });
}

function packageFromOutput(output) {
  const match = String(output).match(/^Package:\s*(.+)$/m);

  if (!match)
    throw Error('AUTOMATION_PACKAGE_PATH_NOT_FOUND');

  const packagePath = match[1].trim();

  if (!packagePath.startsWith(`${SJ_ROOT}/marketing/output/`))
    throw Error('AUTOMATION_PACKAGE_PATH_INVALID');

  if (!fs.existsSync(packagePath))
    throw Error('AUTOMATION_PACKAGE_NOT_FOUND');

  return {
    packagePath,
    data: JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  };
}

function sportsJedi(contentType) {
  let output;

  if (contentType === 'nfl') {
    output = run(SJ_PY, [SJ_STANDARD, '--league', 'NFL']);
  } else if (contentType === 'cfb') {
    output = run(SJ_PY, [SJ_STANDARD, '--league', 'NCAAF']);
  } else if (contentType === 'player_parlay') {
    try{output = run(SJ_PY, [SJ_PARLAY]);}catch(e){
      if(/Only \d+ qualifying unique-player props/.test(String(e.stderr||'')))return {brand:'sportsjedi',content_type:contentType,qualified:false,qualification_reason:'INSUFFICIENT_QUALIFIED_PLAYER_PROPS'};
      throw e;
    }
  } else {
    throw Error('SPORTS_JEDI_CONTENT_TYPE_INVALID');
  }

  const { packagePath, data } = packageFromOutput(output);

  if (!data.campaign_id)
    throw Error('AUTOMATION_CAMPAIGN_ID_MISSING');

  if (!data.instagram)
    throw Error('AUTOMATION_INSTAGRAM_CAPTION_MISSING');

  if (!data.image_file)
    throw Error('AUTOMATION_IMAGE_FILE_MISSING');

  const imagePath = path.resolve(data.image_file);

  if (!imagePath.startsWith(`${SJ_ROOT}/marketing/images/`))
    throw Error('AUTOMATION_IMAGE_PATH_INVALID');

  if (!fs.existsSync(imagePath))
    throw Error('AUTOMATION_IMAGE_NOT_FOUND');

  if (contentType === 'nfl' && String(data.league).toUpperCase() !== 'NFL')
    throw Error('AUTOMATION_NFL_LEAGUE_MISMATCH');

  if (contentType === 'cfb' && String(data.league).toUpperCase() !== 'NCAAF')
    throw Error('AUTOMATION_CFB_LEAGUE_MISMATCH');

  if (contentType === 'player_parlay') {
    if (String(data.content_type || '').toLowerCase() !== 'player_parlay')
      throw Error('AUTOMATION_PARLAY_TYPE_MISMATCH');

    if (!Array.isArray(data.legs) || data.legs.length !== 5)
      throw Error('AUTOMATION_PARLAY_REQUIRES_FIVE_LEGS');

    const allowed=new Set(['player_pass_yds','player_rush_yds','player_reception_yds','player_receptions','player_pass_tds','player_anytime_td']);
    if(data.legs.some(x=>!allowed.has(x.market)||!String(x.player||'').trim())||new Set(data.legs.map(x=>String(x.player).trim().toLowerCase())).size!==5)throw Error('AUTOMATION_PLAYER_PROPS_ONLY');
    if(!/longshot/i.test(data.instagram)||!/high/i.test(data.instagram))throw Error('AUTOMATION_PARLAY_RISK_LABEL_MISSING');
    if (String(data.risk || '').toLowerCase() !== 'high')
      throw Error('AUTOMATION_PARLAY_RISK_LABEL_MISSING');
  }

  const filename = path.basename(imagePath);

  return {
    brand: 'sportsjedi',
    content_type: contentType,
    campaign_id: data.campaign_id,
    package_path: packagePath,
    image_path: imagePath,
    media_url: `${SJ_PUBLIC}/${encodeURIComponent(filename)}`,
    caption: data.instagram,
    league: data.league,
    qualified: true
  };
}


const IMALI_ROOT = '/home/opc/imali-sniper';
const IMALI_PY = '/home/opc/imali-sniper/sniper-venv311/bin/python';
const IMALI_STOCK = `${IMALI_ROOT}/marketing/generate_stock_instagram_card.py`;
const IMALI_CRYPTO = `${IMALI_ROOT}/marketing/generate_instagram_card.py`;
const IMALI_SCANNER = `${IMALI_ROOT}/marketing/stock-social-scanner.js`;
const IMALI_PUBLIC = 'https://api.imali-defi.com/api/blog/images';

function imaliRun(cmd, args) {
  return execFileSync(cmd, args, {
    cwd: IMALI_ROOT,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 4
  });
}

function lastAbsolutePath(output) {
  const lines = String(output)
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  const candidate = [...lines]
    .reverse()
    .find(x => x.startsWith('/'));

  if (!candidate)
    throw Error('IMALI_IMAGE_PATH_NOT_FOUND');

  return candidate;
}

function stockOpportunities() {
  const output = imaliRun('/usr/bin/node', [IMALI_SCANNER]);

  const marker = '{\n  "available"';
  const start = output.lastIndexOf(marker);

  if (start < 0)
    throw Error('IMALI_STOCK_SCANNER_JSON_NOT_FOUND');

  let data;

  try {
    data = JSON.parse(output.slice(start));
  } catch {
    throw Error('IMALI_STOCK_SCANNER_JSON_INVALID');
  }

  const opportunities = Array.isArray(data.opportunities)
    ? data.opportunities
    : [];

  if (!data.available)
    return [];

  const seen = new Set();

  return opportunities.filter(x => {
    if (!x || x.qualified !== true || !x.symbol)
      return false;

    const symbol = String(x.symbol).trim().toUpperCase();

    if (!symbol || seen.has(symbol))
      return false;

    seen.add(symbol);
    return true;
  });
}

function stockQualification(requestedSymbol = '') {
  const output = imaliRun('/usr/bin/node', [IMALI_SCANNER]);

  const marker = '{\n  "available"';
  const start = output.lastIndexOf(marker);

  if (start < 0)
    throw Error('IMALI_STOCK_SCANNER_JSON_NOT_FOUND');

  let data;

  try {
    data = JSON.parse(output.slice(start));
  } catch {
    throw Error('IMALI_STOCK_SCANNER_JSON_INVALID');
  }

  const opportunities = Array.isArray(data.opportunities)
    ? data.opportunities
    : [];

  if (!data.available || !opportunities.length)
    return {
      qualified: false,
      reason: 'no_stock_opportunities'
    };

  const wanted = String(requestedSymbol || '').trim().toUpperCase();

  const signal = wanted
    ? opportunities.find(x =>
        String(x.symbol || '').trim().toUpperCase() === wanted
      )
    : opportunities[0];

  if (!signal) {
    return {
      qualified: false,
      reason: 'requested_stock_signal_not_found'
    };
  }

  return {
    qualified: signal.qualified === true,
    reason: signal.qualification_reason || 'not_qualified',
    signal
  };
}

function imaliStock(options = {}) {
  const requestedSymbol = String(options.symbol || '').trim().toUpperCase();
  const check = stockQualification(requestedSymbol);

  if (!check.qualified) {
    return {
      brand: 'imali',
      content_type: 'stock',
      qualified: false,
      qualification_reason: check.reason
    };
  }

  const previousSymbol = process.env.IMALI_SOCIAL_SYMBOL;

  if (requestedSymbol)
    process.env.IMALI_SOCIAL_SYMBOL = requestedSymbol;

  let output;

  try {
    output = imaliRun(IMALI_PY, [IMALI_STOCK]);
  } finally {
    if (previousSymbol === undefined)
      delete process.env.IMALI_SOCIAL_SYMBOL;
    else
      process.env.IMALI_SOCIAL_SYMBOL = previousSymbol;
  }

  const imagePath = path.resolve(lastAbsolutePath(output));

  if (!imagePath.startsWith('/var/oled/imali-marketing/images/'))
    throw Error('IMALI_STOCK_IMAGE_PATH_INVALID');

  if (!fs.existsSync(imagePath))
    throw Error('IMALI_STOCK_IMAGE_NOT_FOUND');

  const signal = check.signal || {};
  const symbol = String(signal.symbol || 'MARKET');
  const score = Number(signal.score || 0);
  const confidence = Number(signal.confidence || 0);
  const grade = String(signal.grade || '').toUpperCase();

  return {
    brand: 'imali',
    content_type: 'stock',
    campaign_id: `IMALI_STOCK_${Date.now()}_${symbol}`,
    image_path: imagePath,
    media_url: `${IMALI_PUBLIC}/${encodeURIComponent(path.basename(imagePath))}`,
    caption:
      `IMALI Stock Opportunity: ${symbol}\n\n` +
      `AI Score: ${score.toFixed(1)}\n` +
      `Confidence: ${confidence.toFixed(1)}%` +
      (grade ? `\nGrade: ${grade}` : '') +
      `\n\nAI-generated market analysis. Not financial advice or a profit guarantee.\n\n` +
      `#IMALI #Stocks #AITrading #StockMarket`,
    symbol,
    score,
    confidence,
    grade,
    qualified: true
  };
}

function cryptoOpportunities() {
  const script = `
import json
import sys
sys.path.insert(0, '/home/opc/imali-sniper/marketing')
from generate_content import get_live_signal_summary

data = get_live_signal_summary()
signals = data.get("signals", []) if data and data.get("available") else []

eligible = [
    x for x in signals
    if x.get("symbol")
    and str(x.get("side") or "").upper() == "BUY"
    and str(x.get("source_bot") or "").lower() == "okx_spot"
]

seen = set()
result = []

for x in sorted(
    eligible,
    key=lambda item: float(item.get("confidence") or 0),
    reverse=True
):
    symbol = str(x.get("symbol") or "").strip().upper()

    if not symbol or symbol in seen:
        continue

    seen.add(symbol)
    result.append(x)

print(json.dumps(result))
`;

  const output = imaliRun(IMALI_PY, ['-c', script]);

  let rows;

  try {
    rows = JSON.parse(output.trim());
  } catch {
    throw Error('IMALI_CRYPTO_SIGNALS_JSON_INVALID');
  }

  return Array.isArray(rows) ? rows : [];
}

function imaliCrypto(options = {}) {
  const requestedSymbol =
    String(options.symbol || '').trim().toUpperCase();

  const previousSymbol = process.env.IMALI_SOCIAL_SYMBOL;

  if (requestedSymbol)
    process.env.IMALI_SOCIAL_SYMBOL = requestedSymbol;

  let output;

  try {
    output = imaliRun(IMALI_PY, [IMALI_CRYPTO]);
  } finally {
    if (previousSymbol === undefined)
      delete process.env.IMALI_SOCIAL_SYMBOL;
    else
      process.env.IMALI_SOCIAL_SYMBOL = previousSymbol;
  }

  const imagePath = path.resolve(lastAbsolutePath(output));

  const cryptoImageRoot = '/var/oled/imali-marketing/images/';

  if (!imagePath.startsWith(cryptoImageRoot))
    throw Error('IMALI_CRYPTO_IMAGE_PATH_INVALID');

  if (!fs.existsSync(imagePath))
    throw Error('IMALI_CRYPTO_IMAGE_NOT_FOUND');

  /*
   * generate_instagram_card.py selects the strongest current entry
   * from IMALI's existing ai_signal_feed. The feed is populated by
   * the existing qualified OKX signal paths; no trading logic is
   * changed here.
   *
   * The generated filename contains the selected symbol.
   */
  const filename = path.basename(imagePath);

  return {
    brand: 'imali',
    content_type: 'crypto',
    campaign_id: `IMALI_CRYPTO_${Date.now()}`,
    image_path: imagePath,
    media_url: `${IMALI_PUBLIC}/${encodeURIComponent(filename)}`,
    caption:
      `IMALI Crypto Opportunity${requestedSymbol ? `: ${requestedSymbol}` : ''}\n\n` +
      `A current opportunity identified by IMALI's existing AI trading signal system.\n\n` +
      `AI-generated market analysis. Not financial advice or a profit guarantee.\n\n` +
      `#IMALI #Crypto #AITrading #CryptoTrading`,
    symbol: requestedSymbol || null,
    qualified: true
  };
}

function imali(contentType, options = {}) {
  if (contentType === 'stock')
    return imaliStock(options);

  if (contentType === 'crypto')
    return imaliCrypto(options);

  throw Error('IMALI_CONTENT_TYPE_INVALID');
}

module.exports = {
  sportsJedi,
  imali,
  stockOpportunities,
  cryptoOpportunities
};
