from flask import Flask, render_template_string, jsonify
import requests
import os

app = Flask(__name__)

DELTA_API_URL = "https://api.delta.exchange/v2/tickers"

def get_live_prices():
    try:
        res = requests.get(DELTA_API_URL, timeout=3)
        if res.status_code == 200:
            data = res.json().get('result', [])
            prices = {}
            for item in data:
                sym = item.get('symbol')
                if sym in ['BTCUSD', 'ETHUSD', 'SOLUSD']:
                    prices[sym] = item.get('close')
            return prices
    except:
        pass
    return {"BTCUSD": "68,450.00", "ETHUSD": "3,520.00", "SOLUSD": "145.50"}

@app.route('/')
def dashboard():
    prices = get_live_prices()
    btc = prices.get('BTCUSD', '68,450.00')
    eth = prices.get('ETHUSD', '3,520.00')
    sol = prices.get('SOLUSD', '145.50')
    
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TradeCore - Financial Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-[#0b0f19] text-gray-100 font-sans p-3">
        <div class="max-w-md mx-auto space-y-3">
            <!-- Top Bar with Language Dropdown -->
            <div class="flex justify-between items-center bg-[#161b22] p-2.5 rounded-xl border border-gray-800">
                <span class="text-xs font-bold text-green-400">⚡ TradeCore Live</span>
                <select id="lang" class="bg-[#0b0f19] text-xs text-white p-1 rounded border border-gray-700">
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                </select>
            </div>

            <!-- Header Text -->
            <div>
                <h1 class="text-xl font-black text-white" data-t="title">Good morning, operator.</h1>
                <p class="text-xs text-gray-400" data-t="subtitle">Your book, automation, and guardrails in one measured view.</p>
            </div>

            <!-- Cards Grid -->
            <div class="grid grid-cols-2 gap-2">
                <div class="bg-[#161b22] p-3 rounded-xl border border-gray-800">
                    <p class="text-[10px] text-gray-400" data-t="wallet">WALLET BALANCE</p>
                    <p class="text-lg font-black text-green-400 mt-1">₹8,534.27</p>
                </div>
                <div class="bg-[#161b22] p-3 rounded-xl border border-gray-800">
                    <p class="text-[10px] text-gray-400" data-t="pnl">TODAY'S P&L</p>
                    <p class="text-lg font-black text-red-400 mt-1">-₹1,465.73</p>
                </div>
            </div>

            <!-- Live Market Pulse (Delta Exchange) -->
            <div class="bg-[#161b22] p-3 rounded-xl border border-gray-800 space-y-2">
                <p class="text-[10px] font-bold text-gray-400" data-t="pulse">MARKET PULSE (DELTA EXCHANGE)</p>
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-[#0b0f19] p-2 rounded border border-gray-800">
                        <p class="text-[9px] text-gray-400">BTC/USD</p>
                        <p class="text-xs font-bold text-green-400 font-mono">$ {btc}</p>
                    </div>
                    <div class="bg-[#0b0f19] p-2 rounded border border-gray-800">
                        <p class="text-[9px] text-gray-400">ETH/USD</p>
                        <p class="text-xs font-bold text-green-400 font-mono">$ {eth}</p>
                    </div>
                    <div class="bg-[#0b0f19] p-2 rounded border border-gray-800">
                        <p class="text-[9px] text-gray-400">SOL/USD</p>
                        <p class="text-xs font-bold text-green-400 font-mono">$ {sol}</p>
                    </div>
                </div>
            </div>

            <!-- Automated Channels -->
            <div class="bg-[#161b22] p-3 rounded-xl border border-gray-800 space-y-2">
                <p class="text-[10px] font-bold text-gray-400" data-t="channels">AUTOMATED CHANNELS</p>
                <div class="bg-[#0b0f19] p-2.5 rounded-lg border border-gray-800 flex justify-between items-center">
                    <div>
                        <p class="text-xs font-bold">Crypto Strategy</p>
                        <p class="text-[9px] text-gray-500">Live execution active</p>
                    </div>
                    <span class="bg-green-900/40 text-green-400 text-[9px] px-2 py-0.5 rounded font-bold">ACTIVE</span>
                </div>
            </div>
        </div>

        <script>
            const dict = {{
                en: {{ title: "Good morning, operator.", subtitle: "Your book, automation, and guardrails in one measured view.", wallet: "WALLET BALANCE", pnl: "TODAY'S P&L", pulse: "MARKET PULSE (DELTA EXCHANGE)", channels: "AUTOMATED CHANNELS" }},
                hi: {{ title: "सुप्रभात, ऑपरेटर।", subtitle: "आपका ट्रेड, ऑटोमेशन और सुरक्षा एक ही जगह पर।", wallet: "वॉलेट बैलेंस", pnl: "आज का लाभ/हानि", pulse: "मार्केट पल्स (डेल्टा एक्सचेंज)", channels: "ऑटोमेटेड चैनल्स" }},
                pa: {{ title: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਓਪਰੇਟਰ।", subtitle: "તੁਹਾਡਾ ਬੈਲੰਸ ਅਤੇ ਆਟੋਮੇਸ਼ਨ ਸਭ ਇੱਕ ਨਜ਼ਰ ਵਿੱਚ।", wallet: "ਵਾਲਿਟ ਬੈਲੰਸ", pnl: "ਅੱਜ ਦਾ ਨੁਕਸਾਨ/ਲਾਭ", pulse: "ਮਾਰਕੀਟ ਪਲਸ (ਡੈਲਟਾ ਐਕਸਚੇਂਜ)", channels: "ਆਟੋਮੇਟਡ ਚੈਨਲ" }}
            }};
            document.getElementById('lang').addEventListener('change', function() {{
                const l = this.value;
                document.querySelectorAll('[data-t]').forEach(el => {{
                    const k = el.getAttribute('data-t');
                    if(dict[l][k]) el.innerText = dict[l][k];
                }});
            }});
        </script>
    </body>
    </html>
    """
    return html

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
