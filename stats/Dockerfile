#syntax=docker/dockerfile:1

FROM python:3.14-slim-bookworm
WORKDIR /app
COPY requirements.txt requirements.txt
RUN apt-get update \
    && apt-get install -y gcc pkg-config default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*
RUN pip3 install -r requirements.txt

RUN useradd --no-create-home --shell /bin/false appuser

COPY . .

USER appuser

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--no-control-socket", "--worker-class", "gthread", "--workers", "1", "--threads", "8", "--timeout", "60", "stats:app"]
