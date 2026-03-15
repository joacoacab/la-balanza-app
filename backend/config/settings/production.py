from .base import *  # noqa: F401, F403

DEBUG = False

STATIC_ROOT = BASE_DIR / "staticfiles"

# WhiteNoise: va inmediatamente después de SecurityMiddleware
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")

STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
