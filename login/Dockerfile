#syntax=docker/dockerfile:1

FROM python:3.11-slim-bookworm
WORKDIR /app
COPY requirements.txt requirements.txt
RUN apt-get update \
    && apt-get install -y gcc default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*
RUN pip3 install -r requirements.txt

RUN useradd --no-create-home --shell /bin/false appuser

COPY . .

USER appuser

CMD [ "gunicorn", "--bind", "0.0.0.0:5000", "login:app"]
