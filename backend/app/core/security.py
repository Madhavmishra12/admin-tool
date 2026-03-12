import hashlib

def hash_password(password: str) -> str:
    """Standard SHA-256 password hashing for GrowQR"""
    return hashlib.sha256(password.encode()).hexdigest()
