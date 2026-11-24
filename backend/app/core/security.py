import json
import urllib.request
from typing import Any, Dict
import jwt
from cryptography import x509
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)

GOOGLE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
)
_CACHED_CERTS: Dict[str, Any] = {}


def _get_public_keys() -> Dict[str, Any]:
    if _CACHED_CERTS:
        return _CACHED_CERTS
    with urllib.request.urlopen(GOOGLE_CERTS_URL, timeout=10) as resp:
        certs_json = json.loads(resp.read().decode("utf-8"))
    for kid, cert_pem in certs_json.items():
        cert = x509.load_pem_x509_certificate(cert_pem.encode("utf-8"))
        _CACHED_CERTS[kid] = cert.public_key()
    return _CACHED_CERTS


def verify_firebase_token(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Dict[str, Any]:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication bearer token.",
        )

    project_id = settings.FIREBASE_PROJECT_ID
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="FIREBASE_PROJECT_ID is not configured on the backend.",
        )

    token = creds.credentials
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        keys = _get_public_keys()
        public_key = keys.get(kid) if kid else None

        if public_key is None:
            _CACHED_CERTS.clear()
            keys = _get_public_keys()
            public_key = keys.get(kid) if kid else None

        if public_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to match Firebase token signing key.",
            )

        decoded = jwt.decode(
            token,
            key=public_key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
        )

        subject = decoded.get("sub")
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Firebase token missing subject claim.",
            )

        return {
            "uid": subject,
            "email": decoded.get("email"),
            "name": decoded.get("name") or decoded.get("email", "Operator"),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase ID token: {exc}",
        ) from exc