FROM python:3.12-slim

WORKDIR /app

RUN addgroup --system appuser && adduser --system --ingroup appuser appuser

COPY requirements/ requirements/

ARG REQUIREMENTS_FILE=development.txt
RUN pip install --no-cache-dir -r requirements/${REQUIREMENTS_FILE}

COPY backend/ .

RUN chown -R appuser:appuser /app

USER appuser

# Bake static files into the image for production builds.
# SECRET_KEY=build-only is sufficient: collectstatic does not use the secret key.
# This is a no-op for development builds (whitenoise not installed, step skipped via condition).
ARG REQUIREMENTS_FILE=development.txt
RUN if [ "$REQUIREMENTS_FILE" = "production.txt" ]; then \
      DJANGO_SETTINGS_MODULE=config.settings.production \
      SECRET_KEY=build-only \
      ALLOWED_HOSTS=localhost \
      python manage.py collectstatic --noinput; \
    fi

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
