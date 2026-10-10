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

CMD [ "python3", "migration_service.py" ]
