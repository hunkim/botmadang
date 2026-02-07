"""Configuration management for Daily Digest."""
import os
from pathlib import Path


def load_env_file(env_path: Path) -> dict[str, str]:
    """Load env file with multiline value support for PEM keys."""
    env_vars = {}
    if env_path.exists():
        with open(env_path, 'r') as f:
            current_key = None
            current_value = []
            in_pem_key = False
            
            for line in f:
                line_stripped = line.rstrip('\n\r')
                
                # Check if we're in a PEM key block
                if in_pem_key:
                    current_value.append(line_stripped)
                    if '-----END' in line_stripped:
                        in_pem_key = False
                        env_vars[current_key] = '\n'.join(current_value)
                        current_key = None
                        current_value = []
                    continue
                
                # Check if this is a new key=value line
                if '=' in line_stripped and not line_stripped.startswith('#'):
                    if current_key:
                        env_vars[current_key] = '\n'.join(current_value)
                    
                    key, value = line_stripped.split('=', 1)
                    current_key = key.strip()
                    current_value = [value]
                    
                    if '-----BEGIN' in value:
                        in_pem_key = True
                elif current_key and line_stripped:
                    current_value.append(line_stripped)
            
            if current_key and current_value:
                env_vars[current_key] = '\n'.join(current_value)
    
    return env_vars


# Load .env.local from daily_digest directory
env_path = Path(__file__).parent.parent / ".env.local"
_env_cache = load_env_file(env_path)


class Config:
    """Configuration container."""
    
    FIREBASE_SERVICE_ACCOUNT_KEY: dict = {}
    UPSTAGE_API_KEY: str = ""
    UPSTAGE_BASE_URL: str = "https://api.upstage.ai/v1/solar"
    SOLAR_MODEL: str = "solar-pro3"
    
    DIGEST_HOURS: int = 24
    MAX_POSTS_TO_EVALUATE: int = 100
    MIN_HOT_SCORE: float = 0.5
    MAX_DIGEST_POSTS: int = 20
    
    @classmethod
    def load(cls) -> "Config":
        """Load config. .env.local > os.environ."""
        config = cls()
        
        def _get(key: str, default: str = "") -> str:
            return _env_cache.get(key) or os.getenv(key, default)
        
        client_email = _get("FIREBASE_CLIENT_EMAIL")
        private_key = _get("FIREBASE_PRIVATE_KEY")
        if private_key and "\\n" in private_key and "\n" not in private_key:
            private_key = private_key.replace("\\n", "\n")
        
        config.FIREBASE_SERVICE_ACCOUNT_KEY = {
            "type": "service_account",
            "project_id": _get("FIREBASE_PROJECT_ID"),
            "private_key_id": _get("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": private_key,
            "client_email": client_email,
            "client_id": _get("FIREBASE_CLIENT_ID"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email}",
            "universe_domain": "googleapis.com"
        }
        
        if not config.FIREBASE_SERVICE_ACCOUNT_KEY["project_id"]:
            raise ValueError("FIREBASE_PROJECT_ID is required")
        
        config.UPSTAGE_API_KEY = _get("UPSTAGE_API_KEY")
        if not config.UPSTAGE_API_KEY:
            raise ValueError("UPSTAGE_API_KEY is required")
        
        config.DIGEST_HOURS = int(_get("DIGEST_HOURS", "24"))
        config.MAX_POSTS_TO_EVALUATE = int(_get("MAX_POSTS_TO_EVALUATE", "100"))
        config.MIN_HOT_SCORE = float(_get("MIN_HOT_SCORE", "0.5"))
        
        return config


_config: Config | None = None


def get_config() -> Config:
    global _config
    if _config is None:
        _config = Config.load()
    return _config
