from dotenv import load_dotenv
import os

load_dotenv()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
FMP_API_KEY = os.getenv("FMP_API_KEY")

CACHE_TTL_SECONDS = 3600  # 1 hour
DB_PATH = "cache.db"

FINNHUB_BASE = "https://finnhub.io/api/v1"
ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query"
FMP_BASE = "https://financialmodelingprep.com/api/v3"
EDGAR_BASE = "https://data.sec.gov"
NSE_BASE = "https://www.nseindia.com/api"
BSE_BASE = "https://api.bseindia.com/BseIndiaAPI/api"
