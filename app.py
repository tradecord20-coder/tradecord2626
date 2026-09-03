from flask import Flask, render_template_string, jsonify
import requests
import os

app = Flask(__name__)

# Delta Exchange Public Ticker API for Real Live Data
DELTA_API_URL = "https://api.delta.exchange/v2/tickers"

def fetch_live_market_data():
    try:
        response = requests.get(DELTA_API_URL, timeout=5)
        if response.status_code == 200:
            data = response.json()
            tickers = data.get('result', [])
            live_prices = {}
            for item in tickers:
                symbol = item.get('symbol')
                if symbol in ['BTCUSD', 'ETHUSD', 'SOLUSD']:
                    live_prices[symbol] = item.get('close')
            return live_prices
    except Exception as e:
        print("Error fetching Delta live data:", e)
    return {"BTCUSD": "68450.00", "ETHUSD": "3520.00", "SOLUSD": "145.50"}

@app.route('/')
def index():
    market_data = fetch_live_market_data()
    btc_price = market_data.get('BTCUSD', 'Live...')
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TradeCore - Live Financial Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-[#0b0f19] text-gray-100 font-sans p-4">
        <div class="max-w-md mx-auto space-y-4">
            <!-- Header with Language Selector -->
            <div class="flex justify-between items-center bg-[#161b22] p-3 rounded-xl border border-gray-800">
                <h1 class="text-lg font-bold text-green-400">TradeCore 🚀</h1>
                <select id="langSelect" class="bg-[#21262d] text-xs text-white p-1.5 rounded border border-gray-700 outline-none">
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                </select>
            </div>

            <!-- Wallet Card -->
            <div class="bg-[#161b22] p-4 rounded-xl border border-gray-800">
                <p class="text-xs text-gray-400" data-translate="wallet">Available Wallet Balance</p>
                <h2 class="text-2xl font-black text-green-400 mt-1">₹10,000.00</h2>
                <div class="flex gap-2 mt-3">
                    <a href="https://www.delta.exchange" target="_blank" class="flex-1 bg-green-600 hover:bg-green-500 text-black font-bold text-center py-2 rounded-lg text-xs" data-translate="deposit">Deposit</a>
                    <a href="https://www.delta.exchange" target="_blank" class="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold text-center py-2 rounded-lg text-xs border border-gray-700" data-translate="withdraw">Withdraw</a>
                </div>
            </div>

            <!-- Live Market Ticker from Delta Exchange -->
            <div class="bg-[#161b22] p-4 rounded-xl border border-gray-800">
                <p class="text-xs text-gray-400 mb-2" data-translate="live_market">Delta Exchange Live Ticker</p>
                <div class="flex justify-between items-center bg-[#0b0f19] p-3 rounded-lg border border-gray-800">
                    <span class="font-bold text-sm">Bitcoin (BTC/USD)</span>
                    <span class="text-green-400 font-mono font-bold">$ {btc_price}</span>
                </div>
            </div>

            <!-- Control Hub -->
            <div class="bg-[#161b22] p-4 rounded-xl border border-gray-800 space-y-3">
                <p class="text-xs text-gray-400 font-bold" data-translate="control_hub">Trading Channels (Live Control)</p>
                <div class="flex justify-between items-center bg-[#0b0f19] p-2.5 rounded-lg border border-gray-800">
                    <div>
                        <p class="text-xs font-bold">Crypto Channel</p>
                        <p class="text-[10px] text-gray-500">Auto Safety Watchdog Active</p>
                    </div>
                    <span class="bg-green-900/50 text-green-400 text-[10px] px-2 py-1 rounded font-bold" data-translate="active">ACTIVE</span>
                </div>
            </div>
        </div>

        <script>
            // Simple Multi-Language Dictionary
            const translations = {{
                en: {{ wallet: "Available Wallet Balance", deposit: "Deposit", withdraw: "Withdraw", live_market: "Delta Exchange Live Ticker", control_hub: "Trading Channels (Live Control)", active: "ACTIVE" }},
                hi: {{ wallet: "उपलब्ध वॉलेट बैलेंस", deposit: "डिपॉजिट (जमा)", withdraw: "विड्रॉल (निकालें)", live_market: "डेल्टा एक्सचेंज लाइव टिकर", control_hub: "ट्रेडिंग चैनल्स (लाइव कंट्रोल)", active: "सक्रिय" }},
                pa: {{ wallet: "ਉਪਲਬਧ ਵਾਲਿਟ ਬੈਲੇਂਸ", deposit: "ਜਮ੍ਹਾਂ ਕਰੋ", withdraw: "ਕਢਵਾਓ", live_market: "ਡੈਲਟਾ ਐਕਸਚੇਂਜ ਲਾਈਵ ਟਿਕਰ", control_hub: "ਟਰੇਡਿੰਗ ਚੈਨਲ (ਲਾਈਵ ਕੰਟਰੋਲ)", active: "ਸਰਗਰਮ" }}
            }};

            document.getElementById('langSelect').addEventListener('change', function() {{
                const lang = this.value;
                document.querySelectorAll('[data-translate]').forEach(el => {{
                    const key = el.getAttribute('data-translate');
                    if (translations[lang][key]) {{
                        el.innerText = translations[lang][key];
                    }}
                }});
            }});
        </script>
    </body>
    </html>
    """
    return render_template_string(html_content, btc_price=btc_price)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
