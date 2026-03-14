FROM python:3.12-slim

WORKDIR /app

RUN addgroup --system appuser && adduser --system --ingroup appuser appuser

COPY requirements/ requirements/

ARG REQUIREMENTS_FILE=development.txt
RUN pip install --no-cache-dir -r requirements/${REQUIREMENTS_FILE}

COPY backend/ .

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
