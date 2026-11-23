from typing import Any, Dict
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def _ensure_firebase_initialized() -> None:
    if firebase_admin._apps:
        return
    options = {"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None
    try:
        firebase_admin.initialize_app(options=options)
    except Exception:
        # Fallback initialization when Application Default Credentials are absent
        firebase_admin.initialize_app(
            credential=credentials.Certificate(
                {
                    "type": "service_account",
                    "project_id": settings.FIREBASE_PROJECT_ID or "kalystral-demo",
                    "private_key_id": "unused",
                    "private_key": "",
                    "client_email": "unused@example.com",
                    "client_id": "0",
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            ),
            options=options,
        )


def verify_firebase_token(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Dict[str, Any]:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication bearer token.",
        )

    if not settings.FIREBASE_PROJECT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="FIREBASE_PROJECT_ID is not configured on the backend.",
        )

    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})

    try:
        decoded = auth.verify_id_token(creds.credentials)
        return {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "name": decoded.get("name") or decoded.get("email", "Operator"),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase ID token: {exc}",
        ) from exc